-- Phase 11 — fixes the known Phase 9 issue: a job seeker whose profile is
-- genuinely usable for recommendations (headline + years filled, say) could
-- still get zero rows from get_recommended_jobs because of a logic bug in
-- its early-exit check, AND the UI had no way to tell "profile insufficient"
-- apart from "profile fine, just no eligible jobs right now" — both cases
-- returned zero rows from the same function with no distinguishing signal,
-- so the page always rendered the same "complete your profile" message.
--
-- Root cause #1 (SQL): the original condition was
--   v_skills IS NULL OR (array_length(v_skills,1) IS NULL AND v_headline IS NULL AND v_years IS NULL)
-- The leading `v_skills IS NULL OR` short-circuits the whole check: a
-- profile with a NULL skills column but a filled headline and years of
-- experience was still treated as "insufficient" and got zero rows,
-- because the OR never even looked at headline/years in that case. Fixed
-- to treat "no skills" uniformly (NULL or empty array) and only bail when
-- skills, headline, AND years are all absent together.
--
-- Root cause #2 (missing signal): added
-- public.recommendation_profile_sufficient(), the exact same predicate
-- factored out, so the client can ask "is my profile even usable for
-- recommendations" independently of whether any jobs happened to match —
-- see recommended-jobs.tsx for the three-way empty state this now enables.

CREATE OR REPLACE FUNCTION public.recommendation_profile_sufficient(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT (
    (skills IS NULL OR array_length(skills, 1) IS NULL)
    AND headline IS NULL
    AND years_of_experience IS NULL
  )
  FROM public.profiles WHERE id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.recommendation_profile_sufficient(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommendation_profile_sufficient(UUID) TO authenticated;

-- Postgres rejects CREATE OR REPLACE when a function's RETURNS TABLE shape
-- differs at all from what's currently deployed ("cannot change return
-- type of existing function"). Drop first so this always applies cleanly
-- regardless of the exact prior signature. Safe here: get_recommended_jobs
-- is only ever called directly by client code (via .rpc()), nothing else
-- in the database depends on it.
DROP FUNCTION IF EXISTS public.get_recommended_jobs(INT, INT);

-- IMPORTANT: salary_min/salary_max are declared INTEGER below, matching
-- jobs.salary_min/salary_max's real column type (see
-- 20260910140000_jobs_system.sql). A prior migration
-- (20260922090100_fix_recommended_jobs_salary_type.sql) already fixed
-- this exact mismatch once — RETURN QUERY requires an exact type match,
-- and NUMERIC vs INTEGER raised "Returned type integer does not match
-- expected type numeric in column 9" as a 400 at the PostgREST layer.
-- This migration preserves that fix rather than reintroducing it.
CREATE OR REPLACE FUNCTION public.get_recommended_jobs(p_page INT DEFAULT 1, p_page_size INT DEFAULT 10)
RETURNS TABLE (
  job_id UUID, title TEXT, company_name TEXT, company_logo TEXT, city TEXT, country TEXT,
  workplace_type public.workplace_type, employment_type public.employment_type,
  salary_min INTEGER, salary_max INTEGER, salary_period public.salary_period, published_at TIMESTAMPTZ,
  score NUMERIC, matched_skills TEXT[], category_match BOOLEAN, experience_match TEXT,
  location_match BOOLEAN, already_saved BOOLEAN, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_skills TEXT[];
  v_headline TEXT;
  v_title TEXT;
  v_years INT;
  v_level public.experience_level;
  v_location TEXT;
  v_categories UUID[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT skills, headline, current_job_title, years_of_experience, location
  INTO v_skills, v_headline, v_title, v_years, v_location
  FROM public.profiles WHERE id = v_uid;

  -- Fixed: was `v_skills IS NULL OR (...)`, which bailed on a NULL skills
  -- column alone even when headline/years were filled. Now only bails when
  -- skills (NULL or empty), headline, AND years are all absent together.
  IF (v_skills IS NULL OR array_length(v_skills, 1) IS NULL)
     AND v_headline IS NULL AND v_years IS NULL THEN
    RETURN; -- insufficient profile — UI prompts to fill it in
  END IF;

  v_level := CASE
    WHEN v_years IS NULL THEN NULL
    WHEN v_years <= 1 THEN 'Entry'
    WHEN v_years <= 4 THEN 'Mid'
    WHEN v_years <= 8 THEN 'Senior'
    ELSE 'Lead'
  END;

  SELECT array_agg(DISTINCT category_id) INTO v_categories
  FROM (
    SELECT j.category_id FROM public.saved_jobs sj JOIN public.jobs j ON j.id = sj.job_id WHERE sj.user_id = v_uid
    UNION
    SELECT j.category_id FROM public.job_applications ja JOIN public.jobs j ON j.id = ja.job_id WHERE ja.applicant_id = v_uid
  ) x
  WHERE category_id IS NOT NULL;

  RETURN QUERY
  WITH scored AS (
    SELECT
      j.id, j.title, c.name AS company_name, c.logo AS company_logo, j.city, j.country,
      j.workplace_type, j.employment_type, j.salary_min, j.salary_max, j.salary_period, j.published_at,
      j.skills AS job_skills,
      (SELECT array_agg(js) FROM unnest(j.skills) js
        WHERE lower(js) = ANY (SELECT lower(x) FROM unnest(coalesce(v_skills, '{}')) x)) AS matched,
      (v_categories IS NOT NULL AND j.category_id = ANY (v_categories)) AS cat_match,
      CASE
        WHEN v_level IS NULL OR j.experience_level IS NULL THEN NULL
        WHEN j.experience_level = v_level THEN 'exact'
        WHEN abs(
          array_position(ARRAY['Entry','Mid','Senior','Lead'], j.experience_level::text)
          - array_position(ARRAY['Entry','Mid','Senior','Lead'], v_level::text)
        ) = 1 THEN 'adjacent'
        ELSE 'none'
      END AS exp_match,
      (j.workplace_type = 'Remote'
        OR (v_location IS NOT NULL AND (j.city ILIKE '%' || v_location || '%' OR j.country ILIKE '%' || v_location || '%'))
      ) AS loc_match,
      EXISTS (SELECT 1 FROM public.saved_jobs sj WHERE sj.user_id = v_uid AND sj.job_id = j.id) AS is_saved
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.status = 'published'
      AND j.moderation_status <> 'removed'
      AND public.is_company_active(j.company_id)
      AND NOT EXISTS (SELECT 1 FROM public.job_applications ja WHERE ja.applicant_id = v_uid AND ja.job_id = j.id)
  )
  SELECT
    s.id, s.title, s.company_name, s.company_logo, s.city, s.country, s.workplace_type, s.employment_type,
    s.salary_min, s.salary_max, s.salary_period, s.published_at,
    round(
      (45.0 * coalesce(array_length(s.matched, 1), 0) / greatest(array_length(s.job_skills, 1), 1))
      + (CASE WHEN s.cat_match THEN 20 ELSE 0 END)
      + (CASE s.exp_match WHEN 'exact' THEN 15 WHEN 'adjacent' THEN 7 ELSE 0 END)
      + (CASE WHEN s.loc_match THEN 15 ELSE 0 END)
      + (5 * greatest(similarity(coalesce(v_headline, ''), s.title), similarity(coalesce(v_title, ''), s.title)))
    , 1) AS score,
    coalesce(s.matched, '{}') AS matched_skills,
    s.cat_match, coalesce(s.exp_match, 'unknown'), s.loc_match, s.is_saved,
    count(*) OVER () AS total_count
  FROM scored s
  ORDER BY score DESC, s.published_at DESC
  OFFSET greatest(p_page - 1, 0) * greatest(p_page_size, 1)
  LIMIT greatest(p_page_size, 1);
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_recommended_jobs(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recommended_jobs(INT, INT) TO authenticated;
