-- Fix: several Phase 8 admin RPCs have a RETURNS TABLE output column
-- (company_id, job_id, user_id, or status) with the same name as a column
-- on a table queried unqualified inside the function body. PL/pgSQL's
-- default `plpgsql.variable_conflict = error` then raises "column
-- reference ... is ambiguous" at runtime — PostgREST surfaces that as a
-- plain 400 Bad Request, which is what showed up testing /admin/companies.
-- Fix is mechanical: qualify every such reference with its table alias.
-- CREATE OR REPLACE keeps the same signature, so no grants need re-doing.

CREATE OR REPLACE FUNCTION public.admin_get_user_detail(p_user_id UUID)
RETURNS TABLE (
  user_id UUID, email TEXT, first_name TEXT, last_name TEXT, avatar TEXT,
  phone TEXT, location TEXT, bio TEXT, role public.app_role, status public.account_status, created_at TIMESTAMPTZ,
  applications_count BIGINT, saved_jobs_count BIGINT, interviews_count BIGINT,
  company_id UUID, company_name TEXT, company_verified BOOLEAN, company_status public.account_status,
  company_jobs_count BIGINT, company_applications_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    p.id, p.email, p.first_name, p.last_name, p.profile_image, p.phone, p.location, p.bio,
    ur.role, p.status, p.created_at,
    (SELECT count(*) FROM public.job_applications ja WHERE ja.applicant_id = p.id),
    (SELECT count(*) FROM public.saved_jobs sj WHERE sj.user_id = p.id),
    (SELECT count(*) FROM public.interviews i WHERE i.candidate_id = p.id),
    c.id, c.name, c.verified, c.status,
    (SELECT count(*) FROM public.jobs j WHERE j.company_id = c.id),
    (SELECT count(*) FROM public.job_applications ja JOIN public.jobs j ON j.id = ja.job_id WHERE j.company_id = c.id)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.companies c ON c.owner_id = p.id
  WHERE p.id = p_user_id
  LIMIT 1;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_companies(
  p_search TEXT DEFAULT NULL, p_verified BOOLEAN DEFAULT NULL,
  p_status public.account_status DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 20
) RETURNS TABLE (
  company_id UUID, name TEXT, logo TEXT, industry TEXT, location TEXT,
  owner_id UUID, owner_name TEXT, verified BOOLEAN, status public.account_status, created_at TIMESTAMPTZ,
  jobs_count BIGINT, published_jobs_count BIGINT, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    c.id, c.name, c.logo, c.industry, c.location, c.owner_id,
    btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
    c.verified, c.status, c.created_at,
    (SELECT count(*) FROM public.jobs j WHERE j.company_id = c.id),
    (SELECT count(*) FROM public.jobs j WHERE j.company_id = c.id AND j.status = 'published' AND j.moderation_status <> 'removed'),
    count(*) OVER ()
  FROM public.companies c
  LEFT JOIN public.profiles p ON p.id = c.owner_id
  WHERE (p_verified IS NULL OR c.verified = p_verified)
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_search IS NULL OR btrim(p_search) = '' OR c.name ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_get_company_detail(p_company_id UUID)
RETURNS TABLE (
  company_id UUID, name TEXT, logo TEXT, industry TEXT, location TEXT, website TEXT, founded_year INT,
  verified BOOLEAN, status public.account_status, created_at TIMESTAMPTZ,
  owner_id UUID, owner_name TEXT, owner_email TEXT,
  jobs_count BIGINT, published_jobs_count BIGINT, applications_count BIGINT, open_reports_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    c.id, c.name, c.logo, c.industry, c.location, c.website, c.founded_year,
    c.verified, c.status, c.created_at,
    c.owner_id, btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), p.email,
    (SELECT count(*) FROM public.jobs j WHERE j.company_id = c.id),
    (SELECT count(*) FROM public.jobs j WHERE j.company_id = c.id AND j.status = 'published' AND j.moderation_status <> 'removed'),
    (SELECT count(*) FROM public.job_applications ja JOIN public.jobs j ON j.id = ja.job_id WHERE j.company_id = c.id),
    (SELECT count(*) FROM public.reports r WHERE r.entity_type = 'company' AND r.entity_id = c.id AND r.status IN ('open', 'under_review'))
  FROM public.companies c
  LEFT JOIN public.profiles p ON p.id = c.owner_id
  WHERE c.id = p_company_id
  LIMIT 1;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_jobs(
  p_search TEXT DEFAULT NULL, p_company_id UUID DEFAULT NULL, p_status public.job_status DEFAULT NULL,
  p_moderation_status public.job_moderation_status DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 20
) RETURNS TABLE (
  job_id UUID, title TEXT, company_id UUID, company_name TEXT, status public.job_status,
  moderation_status public.job_moderation_status, created_at TIMESTAMPTZ, published_at TIMESTAMPTZ,
  applicant_count BIGINT, report_count BIGINT, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    j.id, j.title, j.company_id, c.name, j.status, j.moderation_status, j.created_at, j.published_at,
    (SELECT count(*) FROM public.job_applications ja WHERE ja.job_id = j.id),
    (SELECT count(*) FROM public.reports r WHERE r.entity_type = 'job' AND r.entity_id = j.id AND r.status IN ('open', 'under_review')),
    count(*) OVER ()
  FROM public.jobs j
  JOIN public.companies c ON c.id = j.company_id
  WHERE (p_company_id IS NULL OR j.company_id = p_company_id)
    AND (p_status IS NULL OR j.status = p_status)
    AND (p_moderation_status IS NULL OR j.moderation_status = p_moderation_status)
    AND (p_search IS NULL OR btrim(p_search) = '' OR j.title ILIKE '%' || p_search || '%')
  ORDER BY j.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
