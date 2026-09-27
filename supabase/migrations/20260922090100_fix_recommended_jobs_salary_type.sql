-- Fix: get_recommended_jobs declared salary_min/salary_max as NUMERIC in
-- its RETURNS TABLE, but jobs.salary_min/salary_max are actually INTEGER
-- (see 20260910140000_jobs_system.sql). RETURN QUERY requires the exact
-- declared output type, so this raised "Returned type integer does not
-- match expected type numeric in column 9" — PostgREST surfaced that as a
-- 400. Fixing the declared type to INTEGER, matching the real column.
-- CREATE OR REPLACE can't change a function's column types when they're
-- defined via RETURNS TABLE (Postgres treats that as changing the
-- function's row type — "cannot change return type of existing
-- function"), so this drops the old version first.
DROP FUNCTION IF EXISTS public.get_recommended_jobs(INT, INT);

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

  IF v_skills IS NULL OR (array_length(v_skills, 1) IS NULL AND v_headline IS NULL AND v_years IS NULL) THEN
    RETURN;
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
      (
        (45.0 * coalesce(array_length(s.matched, 1), 0) / greatest(array_length((SELECT skills FROM public.jobs WHERE id = s.id), 1), 1))
        + (CASE WHEN s.cat_match THEN 20 ELSE 0 END)
        + (CASE s.exp_match WHEN 'exact' THEN 15 WHEN 'adjacent' THEN 7 ELSE 0 END)
        + (CASE WHEN s.loc_match THEN 15 ELSE 0 END)
        + (5 * greatest(similarity(coalesce(v_headline, ''), s.title), similarity(coalesce(v_title, ''), s.title)))
      )::numeric
    , 1) AS match_score,
    coalesce(s.matched, '{}'), s.cat_match, coalesce(s.exp_match, 'unknown'), s.loc_match, s.is_saved,
    count(*) OVER ()
  FROM scored s
  ORDER BY match_score DESC, s.published_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
