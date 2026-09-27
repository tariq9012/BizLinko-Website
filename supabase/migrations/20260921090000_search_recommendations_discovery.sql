-- Phase 9: advanced job search, deterministic job recommendations, and
-- privacy-gated candidate discovery.
--
-- Audit finding fixed here: the Phase 8 "Anyone can view published jobs"
-- policy checked job status/moderation but never the owning company's
-- status, so a job from a suspended company could still surface in public
-- search. Fixed below, alongside everything new for Phase 9.

-- ══════════════════════════════════════════════════════════════════════
-- Extensions
-- ══════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ══════════════════════════════════════════════════════════════════════
-- Fix: public job visibility must also respect company suspension
-- ══════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.is_company_active(UUID) TO anon;

DROP POLICY "Anyone can view published jobs" ON public.jobs;
CREATE POLICY "Anyone can view published jobs"
  ON public.jobs FOR SELECT
  USING (status = 'published' AND moderation_status <> 'removed' AND public.is_company_active(company_id));

-- ══════════════════════════════════════════════════════════════════════
-- Trigram + supporting indexes for fuzzy/typo-tolerant search and the new
-- candidate-discovery filters.
-- ══════════════════════════════════════════════════════════════════════
CREATE INDEX jobs_title_trgm_idx ON public.jobs USING GIN (title gin_trgm_ops);
CREATE INDEX jobs_city_trgm_idx ON public.jobs USING GIN (city gin_trgm_ops);
CREATE INDEX jobs_skills_gin_idx ON public.jobs USING GIN (skills);
CREATE INDEX companies_name_trgm_idx ON public.companies USING GIN (name gin_trgm_ops);

-- ══════════════════════════════════════════════════════════════════════
-- Candidate discoverability — privacy-conscious default (off).
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN discoverable_to_employers BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX profiles_discoverable_idx ON public.profiles (discoverable_to_employers) WHERE discoverable_to_employers;
CREATE INDEX profiles_open_to_work_idx ON public.profiles (open_to_work) WHERE open_to_work;
CREATE INDEX profiles_skills_gin_idx ON public.profiles USING GIN (skills);
CREATE INDEX profiles_years_of_experience_idx ON public.profiles (years_of_experience);

-- ══════════════════════════════════════════════════════════════════════
-- recent_job_searches — capped at 20 per user via an AFTER INSERT trigger,
-- never a background job. Only meaningful (non-empty) searches are stored;
-- enforced client-side (nothing to search for isn't worth remembering) and
-- reinforced here as a CHECK.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.recent_job_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recent_job_searches_not_empty_check CHECK (
    (query IS NOT NULL AND btrim(query) <> '') OR filters <> '{}'::jsonb
  )
);

CREATE INDEX recent_job_searches_user_id_created_at_idx ON public.recent_job_searches (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.recent_job_searches TO authenticated;
GRANT ALL ON public.recent_job_searches TO service_role;
ALTER TABLE public.recent_job_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recent searches"
  ON public.recent_job_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.trim_recent_job_searches()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.recent_job_searches
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM public.recent_job_searches
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 20
    );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trim_recent_job_searches() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trim_recent_job_searches
  AFTER INSERT ON public.recent_job_searches
  FOR EACH ROW EXECUTE FUNCTION public.trim_recent_job_searches();

-- ══════════════════════════════════════════════════════════════════════
-- saved_job_searches — named, rerunnable searches (no email alerts yet;
-- that's Phase 10).
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.saved_job_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_job_searches_name_length_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE INDEX saved_job_searches_user_id_idx ON public.saved_job_searches (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_job_searches TO authenticated;
GRANT ALL ON public.saved_job_searches TO service_role;
ALTER TABLE public.saved_job_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved searches"
  ON public.saved_job_searches FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER saved_job_searches_updated_at
  BEFORE UPDATE ON public.saved_job_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- saved_candidates — an employer's private bookmark list. Bookmarking
-- never freezes a snapshot of the candidate's data: every read re-checks
-- current discoverability (see get_saved_candidates below), so a
-- candidate who later opts out disappears from it immediately.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.saved_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_candidates_unique UNIQUE (employer_user_id, candidate_user_id)
);

CREATE INDEX saved_candidates_employer_idx ON public.saved_candidates (employer_user_id);

GRANT SELECT, INSERT, DELETE ON public.saved_candidates TO authenticated;
GRANT ALL ON public.saved_candidates TO service_role;
ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers manage own saved candidates"
  ON public.saved_candidates FOR ALL
  TO authenticated
  USING (employer_user_id = auth.uid())
  WITH CHECK (
    employer_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'employer')
  );

-- ══════════════════════════════════════════════════════════════════════
-- search_job_ids — the single source of truth for "which published jobs
-- match, in what order, on what page". Everything else (autocomplete
-- aside) hydrates full rows for the ids this returns, reusing the
-- existing job+company+category select/mapping code instead of
-- duplicating it in SQL.
--
-- Salary filtering deliberately never compares numbers across periods —
-- a $90,000/year role and a $9,000/month role aren't directly comparable
-- without an assumption this app has no reliable basis for, so min/max
-- salary filters only apply when p_salary_period is given and only match
-- jobs posted in that same period; otherwise they're ignored rather than
-- silently wrong.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.search_job_ids(
  p_keyword TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_employment_types public.employment_type[] DEFAULT NULL,
  p_workplace_types public.workplace_type[] DEFAULT NULL,
  p_experience_levels public.experience_level[] DEFAULT NULL,
  p_min_salary NUMERIC DEFAULT NULL,
  p_max_salary NUMERIC DEFAULT NULL,
  p_salary_period public.salary_period DEFAULT NULL,
  p_skills TEXT[] DEFAULT NULL,
  p_date_posted TEXT DEFAULT NULL,
  p_verified_only BOOLEAN DEFAULT false,
  p_sort TEXT DEFAULT 'newest',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 6
) RETURNS TABLE (job_id UUID, rank REAL, total_count BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF p_page_size > 50 THEN
    RAISE EXCEPTION 'p_page_size too large';
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      j.id,
      CASE
        WHEN p_keyword IS NULL OR btrim(p_keyword) = '' THEN 0
        ELSE
          ts_rank(j.search_vector, websearch_to_tsquery('english', p_keyword))
          + similarity(j.title, p_keyword)
      END AS rank,
      j.published_at, j.salary_max, j.salary_min, j.title
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.status = 'published'
      AND j.moderation_status <> 'removed'
      AND public.is_company_active(j.company_id)
      AND (
        p_keyword IS NULL OR btrim(p_keyword) = ''
        OR j.search_vector @@ websearch_to_tsquery('english', p_keyword)
        OR c.name ILIKE '%' || p_keyword || '%'
        OR similarity(j.title, p_keyword) > 0.25
      )
      AND (
        p_location IS NULL OR btrim(p_location) = ''
        OR j.city ILIKE '%' || p_location || '%'
        OR j.country ILIKE '%' || p_location || '%'
        OR similarity(coalesce(j.city, ''), p_location) > 0.25
      )
      AND (p_category_id IS NULL OR j.category_id = p_category_id)
      AND (p_employment_types IS NULL OR j.employment_type = ANY (p_employment_types))
      AND (p_workplace_types IS NULL OR j.workplace_type = ANY (p_workplace_types))
      AND (p_experience_levels IS NULL OR j.experience_level = ANY (p_experience_levels))
      AND (
        (p_min_salary IS NULL AND p_max_salary IS NULL)
        OR (
          p_salary_period IS NOT NULL AND j.salary_period = p_salary_period
          AND (p_min_salary IS NULL OR j.salary_max >= p_min_salary)
          AND (p_max_salary IS NULL OR j.salary_min <= p_max_salary)
        )
      )
      AND (
        p_skills IS NULL OR array_length(p_skills, 1) IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(j.skills) js
          WHERE lower(js) = ANY (SELECT lower(x) FROM unnest(p_skills) x)
        )
      )
      AND (
        p_date_posted IS NULL
        OR (p_date_posted = '24h' AND j.published_at >= now() - interval '1 day')
        OR (p_date_posted = '7d' AND j.published_at >= now() - interval '7 days')
        OR (p_date_posted = '30d' AND j.published_at >= now() - interval '30 days')
      )
      AND (NOT p_verified_only OR c.verified)
  )
  SELECT m.id, m.rank, count(*) OVER ()
  FROM matches m
  ORDER BY
    CASE WHEN p_sort = 'relevance' THEN m.rank END DESC NULLS LAST,
    CASE WHEN p_sort = 'salary-high' THEN m.salary_max END DESC NULLS LAST,
    CASE WHEN p_sort = 'salary-low' THEN m.salary_min END ASC NULLS LAST,
    CASE WHEN p_sort = 'oldest' THEN m.published_at END ASC,
    CASE WHEN p_sort = 'title' THEN m.title END ASC,
    m.published_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;

REVOKE EXECUTE ON FUNCTION public.search_job_ids(
  TEXT, TEXT, UUID, public.employment_type[], public.workplace_type[], public.experience_level[],
  NUMERIC, NUMERIC, public.salary_period, TEXT[], TEXT, BOOLEAN, TEXT, INT, INT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_job_ids(
  TEXT, TEXT, UUID, public.employment_type[], public.workplace_type[], public.experience_level[],
  NUMERIC, NUMERIC, public.salary_period, TEXT[], TEXT, BOOLEAN, TEXT, INT, INT
) TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- get_search_suggestions — autocomplete. Same moderation filter as
-- search_job_ids so a removed job's title can never surface as a
-- suggestion either.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_search_suggestions(p_query TEXT, p_limit INT DEFAULT 8)
RETURNS TABLE (suggestion TEXT, kind TEXT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF p_query IS NULL OR btrim(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  (
    SELECT DISTINCT j.title, 'title'
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.status = 'published' AND j.moderation_status <> 'removed' AND public.is_company_active(j.company_id)
      AND (j.title ILIKE p_query || '%' OR similarity(j.title, p_query) > 0.3)
    ORDER BY j.title
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT DISTINCT c.name, 'company'
    FROM public.companies c
    JOIN public.jobs j ON j.company_id = c.id
    WHERE j.status = 'published' AND j.moderation_status <> 'removed' AND public.is_company_active(c.id)
      AND c.name ILIKE p_query || '%'
    ORDER BY c.name
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT DISTINCT skill, 'skill'
    FROM (
      SELECT unnest(j.skills) AS skill
      FROM public.jobs j
      WHERE j.status = 'published' AND j.moderation_status <> 'removed' AND public.is_company_active(j.company_id)
    ) s
    WHERE skill ILIKE p_query || '%'
    ORDER BY skill
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT DISTINCT j.city, 'location'
    FROM public.jobs j
    WHERE j.status = 'published' AND j.moderation_status <> 'removed' AND public.is_company_active(j.company_id)
      AND j.city IS NOT NULL AND j.city ILIKE p_query || '%'
    ORDER BY j.city
    LIMIT p_limit
  )
  LIMIT p_limit;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_search_suggestions(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_search_suggestions(TEXT, INT) TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- get_similar_jobs — deterministic similarity to one specific job. No
-- personalization, so it's safe for anonymous visitors too.
--
-- Score (documented, max 100): same category +40; skill overlap up to
-- +40 (proportional to overlap / job's own skill count); same
-- city +10; same workplace_type +10.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_similar_jobs(p_job_id UUID, p_limit INT DEFAULT 4)
RETURNS TABLE (job_id UUID, score NUMERIC)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT category_id, skills, city, workplace_type, company_id
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF v_job IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT j.id,
    (CASE WHEN j.category_id IS NOT DISTINCT FROM v_job.category_id AND v_job.category_id IS NOT NULL THEN 40 ELSE 0 END)
    + (CASE WHEN array_length(v_job.skills, 1) > 0 THEN
        40.0 * (
          SELECT count(*) FROM unnest(j.skills) js
          WHERE lower(js) = ANY (SELECT lower(x) FROM unnest(v_job.skills) x)
        ) / array_length(v_job.skills, 1)
      ELSE 0 END)
    + (CASE WHEN j.city IS NOT DISTINCT FROM v_job.city AND v_job.city IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN j.workplace_type = v_job.workplace_type THEN 10 ELSE 0 END) AS match_score
  FROM public.jobs j
  JOIN public.companies c ON c.id = j.company_id
  WHERE j.id <> p_job_id
    AND j.status = 'published'
    AND j.moderation_status <> 'removed'
    AND public.is_company_active(j.company_id)
  ORDER BY match_score DESC, j.published_at DESC
  LIMIT p_limit;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_similar_jobs(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_similar_jobs(UUID, INT) TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- get_recommended_jobs — for the CALLING user only (auth.uid(), never a
-- parameter), which is itself the fix for "can't request another user's
-- recommendations by changing a user id" — there is no such id to change.
--
-- Score (documented, max 100), built only from data the candidate
-- themselves provided or generated by using the platform — no protected
-- attributes anywhere:
--   Skills overlap             up to 45  (matched / job's own skill count)
--   Category affinity          +20       job's category appears among the
--                                         candidate's saved/applied jobs
--   Experience compatibility   up to 15  years_of_experience mapped to an
--                                         experience_level bucket vs the
--                                         job's own level (exact=15, one
--                                         bucket off=7, else 0)
--   Location/workplace fit     up to 15  remote job = automatic 15;
--                                         else candidate.location matches
--                                         job city/country = 15
--   Title/headline relevance   up to 5   trigram similarity between the
--                                         candidate's headline or current
--                                         job title and the job title
-- Already-applied jobs are excluded outright (recommending the same job
-- back after applying has little value); saved jobs are still eligible.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_recommended_jobs(p_page INT DEFAULT 1, p_page_size INT DEFAULT 10)
RETURNS TABLE (
  job_id UUID, title TEXT, company_name TEXT, company_logo TEXT, city TEXT, country TEXT,
  workplace_type public.workplace_type, employment_type public.employment_type,
  salary_min NUMERIC, salary_max NUMERIC, salary_period public.salary_period, published_at TIMESTAMPTZ,
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
      (45.0 * coalesce(array_length(s.matched, 1), 0) / greatest(array_length((SELECT skills FROM public.jobs WHERE id = s.id), 1), 1))
      + (CASE WHEN s.cat_match THEN 20 ELSE 0 END)
      + (CASE s.exp_match WHEN 'exact' THEN 15 WHEN 'adjacent' THEN 7 ELSE 0 END)
      + (CASE WHEN s.loc_match THEN 15 ELSE 0 END)
      + (5 * greatest(similarity(coalesce(v_headline, ''), s.title), similarity(coalesce(v_title, ''), s.title)))
    , 1) AS match_score,
    coalesce(s.matched, '{}'), s.cat_match, coalesce(s.exp_match, 'unknown'), s.loc_match, s.is_saved,
    count(*) OVER ()
  FROM scored s
  ORDER BY match_score DESC, s.published_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_recommended_jobs(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recommended_jobs(INT, INT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Candidate discovery. SECURITY DEFINER because the authorization rule
-- ("must be an active employer or admin") and the field-level restriction
-- ("only these columns, ever") both need to be enforced inside the
-- function itself, not left to a generic RLS SELECT policy that any
-- authenticated role could otherwise piggyback on.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.can_discover_candidates()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin()
    OR (public.has_role(auth.uid(), 'employer') AND public.is_account_active(auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.can_discover_candidates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_discover_candidates() TO authenticated;

CREATE OR REPLACE FUNCTION public.search_discoverable_candidates(
  p_search TEXT DEFAULT NULL,
  p_skills TEXT[] DEFAULT NULL,
  p_min_years INT DEFAULT NULL,
  p_max_years INT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_open_to_work BOOLEAN DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
) RETURNS TABLE (
  candidate_id UUID, first_name TEXT, last_name TEXT, avatar TEXT, headline TEXT, current_job_title TEXT,
  years_of_experience INT, skills TEXT[], open_to_work BOOLEAN, location TEXT, total_count BIGINT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_discover_candidates() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.first_name, p.last_name, p.profile_image, p.headline, p.current_job_title,
    p.years_of_experience, p.skills, p.open_to_work, p.location,
    count(*) OVER ()
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'job_seeker'
  WHERE p.discoverable_to_employers = true
    AND p.status = 'active'
    AND (p_open_to_work IS NULL OR p.open_to_work = p_open_to_work)
    AND (p_min_years IS NULL OR p.years_of_experience >= p_min_years)
    AND (p_max_years IS NULL OR p.years_of_experience <= p_max_years)
    AND (
      p_location IS NULL OR btrim(p_location) = '' OR p.location ILIKE '%' || p_location || '%'
    )
    AND (
      p_skills IS NULL OR array_length(p_skills, 1) IS NULL
      OR EXISTS (SELECT 1 FROM unnest(p.skills) ps WHERE lower(ps) = ANY (SELECT lower(x) FROM unnest(p_skills) x))
    )
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '') || ' ' || coalesce(p.headline, '') || ' ' || coalesce(p.current_job_title, ''))
        ILIKE '%' || p_search || '%'
    )
  ORDER BY p.years_of_experience DESC NULLS LAST, p.updated_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;

REVOKE EXECUTE ON FUNCTION public.search_discoverable_candidates(TEXT, TEXT[], INT, INT, TEXT, BOOLEAN, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_discoverable_candidates(TEXT, TEXT[], INT, INT, TEXT, BOOLEAN, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_candidate_detail_for_employer(p_candidate_id UUID)
RETURNS TABLE (
  candidate_id UUID, first_name TEXT, last_name TEXT, avatar TEXT, headline TEXT, current_job_title TEXT,
  bio TEXT, years_of_experience INT, skills TEXT[], open_to_work BOOLEAN, location TEXT,
  github_url TEXT, portfolio_url TEXT, experience JSONB, education JSONB
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_discover_candidates() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.first_name, p.last_name, p.profile_image, p.headline, p.current_job_title, p.bio,
    p.years_of_experience, p.skills, p.open_to_work, p.location, p.github_url, p.portfolio_url,
    (SELECT jsonb_agg(jsonb_build_object(
      'jobTitle', job_title, 'companyName', company_name, 'startDate', start_date,
      'endDate', end_date, 'isCurrent', is_current
    ) ORDER BY start_date DESC) FROM public.profile_experience WHERE user_id = p.id),
    (SELECT jsonb_agg(jsonb_build_object(
      'institution', institution, 'degree', degree, 'fieldOfStudy', field_of_study,
      'startDate', start_date, 'endDate', end_date
    ) ORDER BY start_date DESC NULLS LAST) FROM public.profile_education WHERE user_id = p.id)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'job_seeker'
  WHERE p.id = p_candidate_id AND p.discoverable_to_employers = true AND p.status = 'active'
  LIMIT 1;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_candidate_detail_for_employer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_candidate_detail_for_employer(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_saved_candidates(p_page INT DEFAULT 1, p_page_size INT DEFAULT 20)
RETURNS TABLE (
  candidate_id UUID, first_name TEXT, last_name TEXT, avatar TEXT, headline TEXT,
  years_of_experience INT, skills TEXT[], open_to_work BOOLEAN, location TEXT,
  saved_at TIMESTAMPTZ, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.can_discover_candidates() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.profile_image, p.headline,
    p.years_of_experience, p.skills, p.open_to_work, p.location, sc.created_at,
    count(*) OVER ()
  FROM public.saved_candidates sc
  JOIN public.profiles p ON p.id = sc.candidate_user_id
  WHERE sc.employer_user_id = auth.uid()
    AND p.discoverable_to_employers = true
    AND p.status = 'active'
  ORDER BY sc.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_saved_candidates(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_saved_candidates(INT, INT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- get_matching_candidates_for_job — read-only discovery assistance for
-- one specific job. Never touches job_applications/interviews/messages —
-- it cannot change ATS status, message anyone, or create an application;
-- it only SELECTs.
--
-- Score (documented, max 100): skills overlap up to 60 (matched / job's
-- skill count), experience compatibility up to 25 (same bucket-mapping as
-- get_recommended_jobs: exact=25, adjacent=12), location/workplace fit up
-- to 15 (remote job = 15; else candidate location vs job city/country).
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_matching_candidates_for_job(p_job_id UUID, p_page INT DEFAULT 1, p_page_size INT DEFAULT 20)
RETURNS TABLE (
  candidate_id UUID, first_name TEXT, last_name TEXT, avatar TEXT, headline TEXT,
  years_of_experience INT, matched_skills TEXT[], skills TEXT[], experience_match TEXT,
  location_match BOOLEAN, score NUMERIC, total_count BIGINT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT j.skills, j.experience_level, j.city, j.country, j.workplace_type, j.company_id
  INTO v_job
  FROM public.jobs j
  WHERE j.id = p_job_id;

  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id = v_job.company_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this job';
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      p.id, p.first_name, p.last_name, p.profile_image, p.headline, p.years_of_experience, p.skills,
      (SELECT array_agg(ps) FROM unnest(p.skills) ps
        WHERE lower(ps) = ANY (SELECT lower(x) FROM unnest(coalesce(v_job.skills, '{}')) x)) AS matched,
      CASE
        WHEN v_job.experience_level IS NULL OR p.years_of_experience IS NULL THEN NULL
        WHEN (CASE WHEN p.years_of_experience <= 1 THEN 'Entry' WHEN p.years_of_experience <= 4 THEN 'Mid'
              WHEN p.years_of_experience <= 8 THEN 'Senior' ELSE 'Lead' END) = v_job.experience_level::text THEN 'exact'
        WHEN abs(
          array_position(ARRAY['Entry','Mid','Senior','Lead'],
            (CASE WHEN p.years_of_experience <= 1 THEN 'Entry' WHEN p.years_of_experience <= 4 THEN 'Mid'
             WHEN p.years_of_experience <= 8 THEN 'Senior' ELSE 'Lead' END))
          - array_position(ARRAY['Entry','Mid','Senior','Lead'], v_job.experience_level::text)
        ) = 1 THEN 'adjacent'
        ELSE 'none'
      END AS exp_match,
      (v_job.workplace_type = 'Remote'
        OR (p.location IS NOT NULL AND (p.location ILIKE '%' || coalesce(v_job.city, '') || '%' OR p.location ILIKE '%' || coalesce(v_job.country, '') || '%'))
      ) AS loc_match
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'job_seeker'
    WHERE p.discoverable_to_employers = true AND p.status = 'active'
  )
  SELECT
    s.id, s.first_name, s.last_name, s.profile_image, s.headline, s.years_of_experience,
    coalesce(s.matched, '{}'), s.skills, coalesce(s.exp_match, 'unknown'), s.loc_match,
    round(
      (60.0 * coalesce(array_length(s.matched, 1), 0) / greatest(array_length(coalesce(v_job.skills, '{}'), 1), 1))
      + (CASE s.exp_match WHEN 'exact' THEN 25 WHEN 'adjacent' THEN 12 ELSE 0 END)
      + (CASE WHEN s.loc_match THEN 15 ELSE 0 END)
    , 1) AS match_score,
    count(*) OVER ()
  FROM scored s
  ORDER BY match_score DESC, s.years_of_experience DESC NULLS LAST
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_matching_candidates_for_job(UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_matching_candidates_for_job(UUID, INT, INT) TO authenticated;
