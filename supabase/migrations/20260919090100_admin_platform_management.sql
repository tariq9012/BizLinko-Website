-- Phase 8: admin portal, platform moderation, reporting and audit logs.
--
-- Builds on architecture that already partially exists from Phase 1:
-- has_role()/app_role, profiles.status and companies.status/verified
-- (account_status). None of those columns had any real protection before
-- this migration — an employer could currently UPDATE their own
-- companies.verified straight to true, and any user could UPDATE their own
-- profiles.status away from a suspension. This migration closes both, adds
-- the missing job-moderation and reporting/audit primitives, and wires
-- account/company restrictions into the write paths that matter.

-- ══════════════════════════════════════════════════════════════════════
-- Enums
-- ══════════════════════════════════════════════════════════════════════
CREATE TYPE public.job_moderation_status AS ENUM ('clean', 'under_review', 'removed');
CREATE TYPE public.report_entity_type AS ENUM ('job', 'company', 'user');
CREATE TYPE public.report_reason AS ENUM (
  'scam', 'misleading', 'discrimination', 'spam', 'inappropriate',
  'duplicate', 'impersonation', 'harassment', 'other'
);
CREATE TYPE public.report_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

-- ══════════════════════════════════════════════════════════════════════
-- Helpers
-- ══════════════════════════════════════════════════════════════════════

-- Thin, readable alias over the has_role() helper Phase 1 already
-- established as the one source of truth for role checks — every policy
-- and function below uses this rather than re-deriving admin status.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- No profile row is treated as active (signup always creates one; this is
-- just a safe default rather than locking out an edge case).
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status = 'active' FROM public.profiles WHERE id = _user_id), true);
$$;
REVOKE EXECUTE ON FUNCTION public.is_account_active(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_active(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_company_active(_company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status = 'active' FROM public.companies WHERE id = _company_id), true);
$$;
REVOKE EXECUTE ON FUNCTION public.is_company_active(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_active(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Column pinning — an UPDATE from the owning user themselves can never
-- move these columns; only an admin session (or a SECURITY DEFINER
-- function running as one, since auth.uid() still resolves to the real
-- caller) can. This is the actual fix for the two privilege-escalation
-- paths noted above.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.profiles_pin_restricted_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.profiles_pin_restricted_columns() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_pin_restricted_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_pin_restricted_columns();

CREATE OR REPLACE FUNCTION public.companies_pin_restricted_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.verified := OLD.verified;
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.companies_pin_restricted_columns() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER companies_pin_restricted_columns
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_pin_restricted_columns();

-- ══════════════════════════════════════════════════════════════════════
-- jobs.moderation_status — a separate axis from the employer-owned
-- `status` (draft/published/closed/archived): a job can be
-- `published` + `under_review` at the same time.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.jobs
  ADD COLUMN moderation_status public.job_moderation_status NOT NULL DEFAULT 'clean';
CREATE INDEX jobs_moderation_status_idx ON public.jobs (moderation_status);

CREATE OR REPLACE FUNCTION public.jobs_pin_moderation_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.moderation_status := OLD.moderation_status;
    ELSE
      NEW.moderation_status := 'clean';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.jobs_pin_moderation_status() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER jobs_pin_moderation_status
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_pin_moderation_status();

-- ══════════════════════════════════════════════════════════════════════
-- Tighten existing RLS: public jobs must exclude admin-removed listings,
-- and account/company suspension must actually block the write paths the
-- brief calls out — not just be a badge in the admin UI.
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY "Owners update own company" ON public.companies;
CREATE POLICY "Owners update own company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = owner_id AND public.is_account_active(auth.uid()) AND public.is_company_active(id))
  );

DROP POLICY "Anyone can view published jobs" ON public.jobs;
CREATE POLICY "Anyone can view published jobs"
  ON public.jobs FOR SELECT
  USING (status = 'published' AND moderation_status <> 'removed');

DROP POLICY "Employers create jobs for own company" ON public.jobs;
CREATE POLICY "Employers create jobs for own company"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_role(auth.uid(), 'employer')
    AND public.is_account_active(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = company_id AND owner_id = auth.uid() AND public.is_company_active(id)
    )
  );

DROP POLICY "Employers update own company jobs" ON public.jobs;
CREATE POLICY "Employers update own company jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_account_active(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = company_id AND owner_id = auth.uid() AND public.is_company_active(id)
      )
    )
  );

DROP POLICY "Job seekers apply to published open jobs" ON public.job_applications;
CREATE POLICY "Job seekers apply to published open jobs"
  ON public.job_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND public.has_role(auth.uid(), 'job_seeker')
    AND public.is_account_active(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id AND j.status = 'published' AND j.moderation_status <> 'removed'
    )
  );

-- job_applications previously had no admin bypass at all — needed for the
-- Phase 8 oversight page (`/admin/applications`).
CREATE POLICY "Admins view all applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY "Employers schedule interviews for own company jobs" ON public.interviews;
CREATE POLICY "Employers schedule interviews for own company jobs"
  ON public.interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_account_active(auth.uid())
    AND public.is_company_active(company_id)
    AND EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.companies c ON c.id = j.company_id
      WHERE ja.id = application_id AND c.owner_id = auth.uid()
    )
  );

-- A suspended/banned sender can no longer send new messages. Company-level
-- suspension is deliberately not threaded through messaging in this pass —
-- existing conversations stay readable either way, which matches the
-- "historical data stays available" principle Phase 8 asks for elsewhere.
CREATE OR REPLACE FUNCTION public.messages_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.sender_id := auth.uid();
  IF NOT public.is_account_active(auth.uid()) THEN
    RAISE EXCEPTION 'Your account does not currently have messaging access';
  END IF;
  IF NOT public.is_conversation_participant(NEW.conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;
  IF NOT public.conversation_is_messageable(NEW.conversation_id) THEN
    RAISE EXCEPTION 'This conversation no longer accepts new messages';
  END IF;
  RETURN NEW;
END; $$;

-- ══════════════════════════════════════════════════════════════════════
-- reports
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type public.report_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  reason public.report_reason NOT NULL,
  description TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reports_description_length_check CHECK (description IS NULL OR char_length(description) <= 2000)
);

CREATE INDEX reports_status_idx ON public.reports (status);
CREATE INDEX reports_entity_idx ON public.reports (entity_type, entity_id);
CREATE INDEX reports_reporter_id_idx ON public.reports (reporter_id);
-- One open/under-review report per (reporter, entity) — obvious duplicate
-- spam is rejected outright rather than silently piling up.
CREATE UNIQUE INDEX reports_no_duplicate_open_idx
  ON public.reports (reporter_id, entity_type, entity_id)
  WHERE status IN ('open', 'under_review');

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only real, existing targets are reportable — the entity_id can't point
-- at nothing, and a job/company can't be reported through the "user" path
-- or vice versa.
CREATE OR REPLACE FUNCTION public.report_entity_exists(p_entity_type public.report_entity_type, p_entity_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_entity_type
    WHEN 'job' THEN EXISTS (SELECT 1 FROM public.jobs WHERE id = p_entity_id)
    WHEN 'company' THEN EXISTS (SELECT 1 FROM public.companies WHERE id = p_entity_id)
    WHEN 'user' THEN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_entity_id)
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.report_entity_exists(public.report_entity_type, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_entity_exists(public.report_entity_type, UUID) TO authenticated;

CREATE POLICY "Users create own reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND status = 'open'
    AND assigned_admin_id IS NULL
    AND resolution_notes IS NULL
    AND public.report_entity_exists(entity_type, entity_id)
  );

CREATE POLICY "Users view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

-- No UPDATE policy for plain authenticated users at all: moderation status,
-- assignment and resolution notes are only ever changed through
-- admin_update_report_status() below, never a direct table UPDATE.

-- ══════════════════════════════════════════════════════════════════════
-- admin_audit_logs — immutable from the client. No INSERT/UPDATE/DELETE
-- grant to `authenticated` at all; every row is written by the SECURITY
-- DEFINER moderation functions below (which run as their owner and so can
-- still write despite the missing grant), never by a normal client INSERT.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at DESC);
CREATE INDEX admin_audit_logs_admin_id_idx ON public.admin_audit_logs (admin_id);
CREATE INDEX admin_audit_logs_action_idx ON public.admin_audit_logs (action);
CREATE INDEX admin_audit_logs_entity_idx ON public.admin_audit_logs (entity_type, entity_id);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.write_admin_audit_log(
  p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_reason TEXT, p_metadata JSONB DEFAULT NULL
) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, reason, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_reason, p_metadata);
$$;
REVOKE EXECUTE ON FUNCTION public.write_admin_audit_log(TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Moderation RPCs. Every one independently re-checks is_admin() — a
-- malicious user calling the RPC directly (bypassing the admin UI
-- entirely) gets the same rejection a forged request would.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_set_account_status(p_user_id UUID, p_status public.account_status, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'A moderation reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles SET status = p_status WHERE id = p_user_id;

  v_action := CASE p_status
    WHEN 'suspended' THEN 'user_suspended'
    WHEN 'banned' THEN 'user_banned'
    ELSE 'user_restored'
  END;
  PERFORM public.write_admin_audit_log(v_action, 'user', p_user_id, p_reason, NULL);
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(UUID, public.account_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(UUID, public.account_status, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_company_verification(p_company_id UUID, p_verified BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  UPDATE public.companies SET verified = p_verified WHERE id = p_company_id;
  PERFORM public.write_admin_audit_log(
    CASE WHEN p_verified THEN 'company_verified' ELSE 'company_unverified' END,
    'company', p_company_id, p_reason, NULL
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_company_verification(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_company_verification(UUID, BOOLEAN, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_company_status(p_company_id UUID, p_status public.account_status, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'A moderation reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  UPDATE public.companies SET status = p_status WHERE id = p_company_id;
  PERFORM public.write_admin_audit_log(
    CASE WHEN p_status = 'active' THEN 'company_restored' ELSE 'company_suspended' END,
    'company', p_company_id, p_reason, NULL
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_company_status(UUID, public.account_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_company_status(UUID, public.account_status, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_job_moderation(p_job_id UUID, p_status public.job_moderation_status, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'A moderation reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id = p_job_id) THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  UPDATE public.jobs SET moderation_status = p_status WHERE id = p_job_id;

  v_action := CASE p_status
    WHEN 'removed' THEN 'job_removed'
    WHEN 'under_review' THEN 'job_under_review'
    ELSE 'job_restored'
  END;
  PERFORM public.write_admin_audit_log(v_action, 'job', p_job_id, p_reason, NULL);
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_job_moderation(UUID, public.job_moderation_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_job_moderation(UUID, public.job_moderation_status, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_report_status(
  p_report_id UUID, p_status public.report_status, p_resolution_notes TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reports WHERE id = p_report_id) THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  UPDATE public.reports
  SET status = p_status,
      assigned_admin_id = COALESCE(assigned_admin_id, auth.uid()),
      resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
      resolved_at = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() ELSE NULL END
  WHERE id = p_report_id;

  PERFORM public.write_admin_audit_log(
    'report_status_changed', 'report', p_report_id, p_resolution_notes,
    jsonb_build_object('new_status', p_status)
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_update_report_status(UUID, public.report_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_report_status(UUID, public.report_status, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Read RPCs. None of these are SECURITY DEFINER — every table involved
-- already grants admins full SELECT through its own RLS policy (has_role
-- checks added back in Phase 1/6/7), so running as the caller is both
-- sufficient and least-privilege. Each still opens with an explicit
-- is_admin() guard for a clear error instead of a silent empty result.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS TABLE (
  total_users BIGINT, job_seekers BIGINT, employers BIGINT,
  total_companies BIGINT, verified_companies BIGINT,
  published_jobs BIGINT, total_applications BIGINT, applications_this_month BIGINT,
  interviews_scheduled BIGINT, offers BIGINT, hires BIGINT,
  open_reports BIGINT, unresolved_reports BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.user_roles WHERE role = 'job_seeker'),
    (SELECT count(*) FROM public.user_roles WHERE role = 'employer'),
    (SELECT count(*) FROM public.companies),
    (SELECT count(*) FROM public.companies WHERE verified),
    (SELECT count(*) FROM public.jobs WHERE status = 'published' AND moderation_status <> 'removed'),
    (SELECT count(*) FROM public.job_applications),
    (SELECT count(*) FROM public.job_applications WHERE applied_at >= date_trunc('month', now())),
    (SELECT count(*) FROM public.interviews WHERE status = 'scheduled'),
    (SELECT count(*) FROM public.job_applications WHERE status = 'offer'),
    (SELECT count(*) FROM public.job_applications WHERE status = 'hired'),
    (SELECT count(*) FROM public.reports WHERE status = 'open'),
    (SELECT count(*) FROM public.reports WHERE status IN ('open', 'under_review'));
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- One row per day for the last p_days days, for whichever metric was
-- asked for — a single small function backs every analytics chart rather
-- than one bespoke query per metric.
CREATE OR REPLACE FUNCTION public.admin_daily_counts(p_metric TEXT, p_days INT DEFAULT 30)
RETURNS TABLE (day DATE, count BIGINT) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_metric NOT IN ('users', 'jobs', 'applications', 'hires') THEN
    RAISE EXCEPTION 'Unknown metric: %', p_metric;
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date AS day
  ),
  events AS (
    SELECT created_at::date AS day FROM public.profiles WHERE p_metric = 'users'
    UNION ALL
    SELECT created_at::date FROM public.jobs WHERE p_metric = 'jobs'
    UNION ALL
    SELECT applied_at::date FROM public.job_applications WHERE p_metric = 'applications'
    UNION ALL
    SELECT updated_at::date FROM public.job_applications WHERE p_metric = 'hires' AND status = 'hired'
  )
  SELECT d.day, count(e.day)
  FROM days d
  LEFT JOIN events e ON e.day = d.day
  GROUP BY d.day
  ORDER BY d.day;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_daily_counts(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_daily_counts(TEXT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search TEXT DEFAULT NULL, p_role public.app_role DEFAULT NULL,
  p_status public.account_status DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 20
) RETURNS TABLE (
  user_id UUID, email TEXT, first_name TEXT, last_name TEXT, avatar TEXT,
  role public.app_role, status public.account_status, created_at TIMESTAMPTZ,
  company_name TEXT, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, p.profile_image, ur.role, p.status, p.created_at,
         c.name, count(*) OVER ()
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.companies c ON c.owner_id = p.id
  WHERE (p_role IS NULL OR ur.role = p_role)
    AND (p_status IS NULL OR p.status = p_status)
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '') || ' ' || coalesce(p.email, ''))
        ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(TEXT, public.app_role, public.account_status, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, public.app_role, public.account_status, INT, INT) TO authenticated;

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
    (SELECT count(*) FROM public.job_applications WHERE applicant_id = p.id),
    (SELECT count(*) FROM public.saved_jobs WHERE user_id = p.id),
    (SELECT count(*) FROM public.interviews WHERE candidate_id = p.id),
    c.id, c.name, c.verified, c.status,
    (SELECT count(*) FROM public.jobs WHERE company_id = c.id),
    (SELECT count(*) FROM public.job_applications ja JOIN public.jobs j ON j.id = ja.job_id WHERE j.company_id = c.id)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.companies c ON c.owner_id = p.id
  WHERE p.id = p_user_id
  LIMIT 1;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(UUID) TO authenticated;

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
    (SELECT count(*) FROM public.jobs WHERE company_id = c.id),
    (SELECT count(*) FROM public.jobs WHERE company_id = c.id AND status = 'published' AND moderation_status <> 'removed'),
    count(*) OVER ()
  FROM public.companies c
  LEFT JOIN public.profiles p ON p.id = c.owner_id
  WHERE (p_verified IS NULL OR c.verified = p_verified)
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_search IS NULL OR btrim(p_search) = '' OR c.name ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_companies(TEXT, BOOLEAN, public.account_status, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_companies(TEXT, BOOLEAN, public.account_status, INT, INT) TO authenticated;

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
    (SELECT count(*) FROM public.jobs WHERE company_id = c.id),
    (SELECT count(*) FROM public.jobs WHERE company_id = c.id AND status = 'published' AND moderation_status <> 'removed'),
    (SELECT count(*) FROM public.job_applications ja JOIN public.jobs j ON j.id = ja.job_id WHERE j.company_id = c.id),
    (SELECT count(*) FROM public.reports WHERE entity_type = 'company' AND entity_id = c.id AND status IN ('open', 'under_review'))
  FROM public.companies c
  LEFT JOIN public.profiles p ON p.id = c.owner_id
  WHERE c.id = p_company_id
  LIMIT 1;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_company_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_company_detail(UUID) TO authenticated;

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
    (SELECT count(*) FROM public.job_applications WHERE job_id = j.id),
    (SELECT count(*) FROM public.reports WHERE entity_type = 'job' AND entity_id = j.id AND status IN ('open', 'under_review')),
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
REVOKE EXECUTE ON FUNCTION public.admin_list_jobs(TEXT, UUID, public.job_status, public.job_moderation_status, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_jobs(TEXT, UUID, public.job_status, public.job_moderation_status, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_reports(
  p_status public.report_status DEFAULT NULL, p_entity_type public.report_entity_type DEFAULT NULL,
  p_reason public.report_reason DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 20
) RETURNS TABLE (
  report_id UUID, reporter_id UUID, reporter_name TEXT, entity_type public.report_entity_type,
  entity_id UUID, entity_label TEXT, reason public.report_reason, description TEXT,
  status public.report_status, assigned_admin_id UUID, resolution_notes TEXT,
  resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    r.id, r.reporter_id, btrim(coalesce(rp.first_name, '') || ' ' || coalesce(rp.last_name, '')),
    r.entity_type, r.entity_id,
    CASE r.entity_type
      WHEN 'job' THEN (SELECT title FROM public.jobs WHERE id = r.entity_id)
      WHEN 'company' THEN (SELECT name FROM public.companies WHERE id = r.entity_id)
      WHEN 'user' THEN (SELECT btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) FROM public.profiles WHERE id = r.entity_id)
    END,
    r.reason, r.description, r.status, r.assigned_admin_id, r.resolution_notes, r.resolved_at, r.created_at,
    count(*) OVER ()
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  WHERE (p_status IS NULL OR r.status = p_status)
    AND (p_entity_type IS NULL OR r.entity_type = p_entity_type)
    AND (p_reason IS NULL OR r.reason = p_reason)
  ORDER BY r.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_reports(public.report_status, public.report_entity_type, public.report_reason, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_reports(public.report_status, public.report_entity_type, public.report_reason, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_report_detail(p_report_id UUID)
RETURNS TABLE (
  report_id UUID, reporter_id UUID, reporter_name TEXT, reporter_email TEXT,
  entity_type public.report_entity_type, entity_id UUID, entity_label TEXT,
  reason public.report_reason, description TEXT, status public.report_status,
  assigned_admin_id UUID, resolution_notes TEXT, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    r.id, r.reporter_id, btrim(coalesce(rp.first_name, '') || ' ' || coalesce(rp.last_name, '')), rp.email,
    r.entity_type, r.entity_id,
    CASE r.entity_type
      WHEN 'job' THEN (SELECT title FROM public.jobs WHERE id = r.entity_id)
      WHEN 'company' THEN (SELECT name FROM public.companies WHERE id = r.entity_id)
      WHEN 'user' THEN (SELECT btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) FROM public.profiles WHERE id = r.entity_id)
    END,
    r.reason, r.description, r.status, r.assigned_admin_id, r.resolution_notes, r.resolved_at, r.created_at
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  WHERE r.id = p_report_id
  LIMIT 1;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_report_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_report_detail(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_audit_logs(
  p_admin_id UUID DEFAULT NULL, p_action TEXT DEFAULT NULL, p_entity_type TEXT DEFAULT NULL,
  p_page INT DEFAULT 1, p_page_size INT DEFAULT 30
) RETURNS TABLE (
  log_id UUID, admin_id UUID, admin_name TEXT, action TEXT, entity_type TEXT, entity_id UUID,
  reason TEXT, metadata JSONB, created_at TIMESTAMPTZ, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    l.id, l.admin_id, btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
    l.action, l.entity_type, l.entity_id, l.reason, l.metadata, l.created_at,
    count(*) OVER ()
  FROM public.admin_audit_logs l
  LEFT JOIN public.profiles p ON p.id = l.admin_id
  WHERE (p_admin_id IS NULL OR l.admin_id = p_admin_id)
    AND (p_action IS NULL OR l.action = p_action)
    AND (p_entity_type IS NULL OR l.entity_type = p_entity_type)
  ORDER BY l.created_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_audit_logs(UUID, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(UUID, TEXT, TEXT, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_applications(
  p_search TEXT DEFAULT NULL, p_status public.application_status DEFAULT NULL,
  p_page INT DEFAULT 1, p_page_size INT DEFAULT 20
) RETURNS TABLE (
  application_id UUID, candidate_name TEXT, job_id UUID, job_title TEXT, company_name TEXT,
  status public.application_status, applied_at TIMESTAMPTZ, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    ja.id, btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
    j.id, j.title, c.name, ja.status, ja.applied_at,
    count(*) OVER ()
  FROM public.job_applications ja
  JOIN public.jobs j ON j.id = ja.job_id
  JOIN public.companies c ON c.id = j.company_id
  LEFT JOIN public.profiles p ON p.id = ja.applicant_id
  WHERE (p_status IS NULL OR ja.status = p_status)
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      j.title ILIKE '%' || p_search || '%' OR
      (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ILIKE '%' || p_search || '%'
    )
  ORDER BY ja.applied_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_applications(TEXT, public.application_status, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_applications(TEXT, public.application_status, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_interviews(
  p_status public.interview_status DEFAULT NULL, p_page INT DEFAULT 1, p_page_size INT DEFAULT 20
) RETURNS TABLE (
  interview_id UUID, candidate_name TEXT, company_name TEXT, job_title TEXT,
  scheduled_at TIMESTAMPTZ, method public.interview_method, status public.interview_status, total_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT
    i.id, btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), c.name, j.title,
    i.scheduled_at, i.interview_method, i.status,
    count(*) OVER ()
  FROM public.interviews i
  JOIN public.jobs j ON j.id = i.job_id
  JOIN public.companies c ON c.id = i.company_id
  LEFT JOIN public.profiles p ON p.id = i.candidate_id
  WHERE (p_status IS NULL OR i.status = p_status)
  ORDER BY i.scheduled_at DESC
  OFFSET greatest(p_page - 1, 0) * p_page_size LIMIT p_page_size;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_interviews(public.interview_status, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_interviews(public.interview_status, INT, INT) TO authenticated;
