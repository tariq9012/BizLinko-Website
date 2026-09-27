-- Phase 4: resumes, job applications, status history, and Supabase Storage
-- security for resume files.

CREATE TYPE public.application_status AS ENUM (
  'submitted', 'reviewing', 'shortlisted', 'rejected', 'hired', 'withdrawn'
);

-- ── resumes ─────────────────────────────────────────────────────────────
-- The file itself lives in Supabase Storage (bucket: resumes); this table
-- only holds metadata + the storage path. file_path convention:
-- {user_id}/{resume_id}/{filename} — matched by the storage policies below.
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resumes_file_size_check CHECK (file_size > 0 AND file_size <= 10 * 1024 * 1024),
  CONSTRAINT resumes_mime_type_check CHECK (
    mime_type IN (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  CONSTRAINT resumes_file_path_unique UNIQUE (file_path)
);

-- One primary resume per user, enforced at the database level as a safety
-- net (the trigger below handles the common-case "swap primary" UX).
CREATE UNIQUE INDEX resumes_one_primary_per_user ON public.resumes (user_id) WHERE is_primary;
CREATE INDEX resumes_user_id_idx ON public.resumes (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- When a resume is marked primary, unset it on the user's other resumes in
-- the same operation, so the UI never has to do a separate "unset old
-- primary" write (and can't leave two resumes primary if that write fails).
CREATE OR REPLACE FUNCTION public.resumes_enforce_single_primary()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.resumes
    SET is_primary = false
    WHERE user_id = NEW.user_id AND id <> NEW.id AND is_primary;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.resumes_enforce_single_primary() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER resumes_single_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.resumes_enforce_single_primary();

CREATE POLICY "Job seekers manage own resumes"
  ON public.resumes FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- (Employer read-access policy for resumes is added further down, once
-- job_applications exists — see "Employers view resumes of their applicants".)

-- ── job_applications ────────────────────────────────────────────────────
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- RESTRICT (not CASCADE): a resume referenced by an application can't be
  -- deleted outright. This keeps a single source of truth for "what did
  -- they actually submit" without needing a separate snapshot/versioning
  -- system — simpler, and the UI surfaces a clear "in use" error instead.
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE RESTRICT,
  cover_letter TEXT,
  status public.application_status NOT NULL DEFAULT 'submitted',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A withdrawn application doesn't block a fresh one — only one *active*
-- (non-withdrawn) application per job per applicant, enforced atomically
-- even under a concurrent double-submit race.
CREATE UNIQUE INDEX job_applications_one_active_per_user
  ON public.job_applications (job_id, applicant_id)
  WHERE status <> 'withdrawn';

CREATE INDEX job_applications_job_id_idx ON public.job_applications (job_id);
CREATE INDEX job_applications_applicant_id_idx ON public.job_applications (applicant_id);
CREATE INDEX job_applications_resume_id_idx ON public.job_applications (resume_id);
CREATE INDEX job_applications_status_idx ON public.job_applications (status);

GRANT SELECT, INSERT, UPDATE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Postgres detects (and refuses) circular RLS: job_applications' INSERT
-- policy needs to check resume ownership, and resumes' employer-read
-- policy needs to check job_applications — a direct cross-reference in
-- both policies' subqueries creates a cycle ("infinite recursion detected
-- in policy"). These SECURITY DEFINER helpers break the cycle the same way
-- has_role() does for user_roles: the internal query runs as the function
-- owner (bypassing RLS on the table it reads) instead of re-entering the
-- calling table's own policies.
CREATE OR REPLACE FUNCTION public.user_owns_resume(p_resume_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.resumes WHERE id = p_resume_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.employer_can_view_resume(p_resume_id UUID, p_employer_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_applications ja
    JOIN public.jobs j ON j.id = ja.job_id
    JOIN public.companies c ON c.id = j.company_id
    WHERE ja.resume_id = p_resume_id AND c.owner_id = p_employer_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_owns_resume(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.employer_can_view_resume(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_resume(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.employer_can_view_resume(UUID, UUID) TO authenticated, service_role;

-- An employer may read a resume ONLY through a legitimate application to
-- one of their own company's jobs — never a blanket "all resumes" grant.
-- (Defined here, not alongside the resumes table above, since it needs
-- job_applications to exist first.)
CREATE POLICY "Employers view resumes of their applicants"
  ON public.resumes FOR SELECT
  TO authenticated
  USING (public.employer_can_view_resume(id, auth.uid()));

CREATE TRIGGER job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── application_status_history ─────────────────────────────────────────
CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  previous_status public.application_status,
  new_status public.application_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX application_status_history_application_id_idx
  ON public.application_status_history (application_id);

-- No direct INSERT grant: only the SECURITY DEFINER trigger function below
-- writes here, so the audit trail can't be forged or edited by either side.
GRANT SELECT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view application history"
  ON public.application_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = application_id
        AND (
          ja.applicant_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            JOIN public.companies c ON c.id = j.company_id
            WHERE j.id = ja.job_id AND c.owner_id = auth.uid()
          )
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- ── Centralized status-transition + immutability guard ─────────────────
-- This is the single place application status rules live (mirrored in
-- src/features/applications/status.ts purely for UI button state — this
-- trigger is what actually enforces it). Runs SECURITY DEFINER so it can
-- always write the audit row regardless of the caller's own grants.
CREATE OR REPLACE FUNCTION public.job_applications_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_admin BOOLEAN := public.has_role(auth.uid(), 'admin');
  is_applicant BOOLEAN := auth.uid() = OLD.applicant_id;
  is_owning_employer BOOLEAN := EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.id = OLD.job_id AND c.owner_id = auth.uid()
  );
BEGIN
  -- Identity of the application can never change, by anyone.
  IF NEW.job_id <> OLD.job_id OR NEW.applicant_id <> OLD.applicant_id OR NEW.resume_id <> OLD.resume_id THEN
    RAISE EXCEPTION 'job_id, applicant_id and resume_id cannot be changed after submission';
  END IF;

  IF NOT is_admin AND NEW.status <> OLD.status THEN
    IF is_applicant THEN
      -- A job seeker may only withdraw, and only from a non-terminal state.
      IF NEW.status <> 'withdrawn' OR OLD.status NOT IN ('submitted', 'reviewing', 'shortlisted') THEN
        RAISE EXCEPTION 'You can only withdraw an application that is submitted, reviewing, or shortlisted';
      END IF;
    ELSIF is_owning_employer THEN
      IF NOT (
        (OLD.status = 'submitted' AND NEW.status = 'reviewing')
        OR (OLD.status = 'reviewing' AND NEW.status IN ('shortlisted', 'rejected', 'submitted'))
        OR (OLD.status = 'shortlisted' AND NEW.status IN ('hired', 'rejected', 'reviewing'))
      ) THEN
        RAISE EXCEPTION 'That status change is not allowed';
      END IF;
    ELSE
      RAISE EXCEPTION 'Not authorized to change this application';
    END IF;
  END IF;

  IF NEW.status = 'withdrawn' AND OLD.status <> 'withdrawn' THEN
    NEW.withdrawn_at := now();
  END IF;
  IF NEW.status <> 'submitted' AND OLD.status = 'submitted' AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;

  IF NEW.status <> OLD.status THEN
    INSERT INTO public.application_status_history (application_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.job_applications_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER job_applications_guard
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.job_applications_guard();

-- Log the initial 'submitted' row too, so history is complete from the start.
CREATE OR REPLACE FUNCTION public.job_applications_log_initial_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.application_status_history (application_id, previous_status, new_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, auth.uid());
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.job_applications_log_initial_status() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER job_applications_log_initial_status
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.job_applications_log_initial_status();

-- ── RLS: job_applications ───────────────────────────────────────────────
-- Job seeker: apply for themselves, to a published job that hasn't closed
-- or passed its deadline, with a resume they actually own. Never trusts the
-- browser for any of this.
CREATE POLICY "Job seekers apply to published open jobs"
  ON public.job_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND public.has_role(auth.uid(), 'job_seeker')
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND j.status = 'published'
        AND (j.application_deadline IS NULL OR j.application_deadline >= current_date)
    )
    AND public.user_owns_resume(resume_id, auth.uid())
  );

CREATE POLICY "Job seekers view own applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (applicant_id = auth.uid());

CREATE POLICY "Employers view applications to own company jobs"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = job_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Row-level ownership only — the job_applications_guard trigger above is
-- what actually restricts which *status* each side may set.
CREATE POLICY "Applicants update own application"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (applicant_id = auth.uid())
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Employers update applications to own company jobs"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = job_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = job_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Aggregate counts per job, for the employer jobs list (avoids an N+1 query
-- per job row). security_invoker=true is essential here: without it, a
-- view runs with its owner's privileges and would bypass job_applications'
-- RLS entirely, leaking every company's application counts to any
-- authenticated user. With it, the view is restricted exactly like a
-- direct query would be — an employer only ever sees rows for jobs they
-- have SELECT access to (their own company's jobs, or admin).
CREATE VIEW public.job_application_counts
WITH (security_invoker = true) AS
SELECT
  job_id,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'submitted') AS submitted,
  count(*) FILTER (WHERE status = 'reviewing') AS reviewing,
  count(*) FILTER (WHERE status = 'shortlisted') AS shortlisted,
  count(*) FILTER (WHERE status = 'hired') AS hired,
  count(*) FILTER (WHERE status = 'rejected') AS rejected
FROM public.job_applications
WHERE status <> 'withdrawn'
GROUP BY job_id;

GRANT SELECT ON public.job_application_counts TO authenticated;

-- ── RLS: profiles (employer access to applicants) ───────────────────────
-- profiles' own RLS (from the phase-1 migration) only lets a user read
-- their own row. An employer needs to see an applicant's name/location/bio
-- — but only for someone who actually applied to one of their jobs, the
-- same legitimate-relationship pattern used for resumes above. Added here,
-- not in the historical profiles migration, since it depends on
-- job_applications existing.
CREATE OR REPLACE FUNCTION public.employer_can_view_applicant_profile(p_applicant_id UUID, p_employer_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_applications ja
    JOIN public.jobs j ON j.id = ja.job_id
    JOIN public.companies c ON c.id = j.company_id
    WHERE ja.applicant_id = p_applicant_id AND c.owner_id = p_employer_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.employer_can_view_applicant_profile(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_can_view_applicant_profile(UUID, UUID) TO authenticated, service_role;

CREATE POLICY "Employers view profiles of their applicants"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.employer_can_view_applicant_profile(id, auth.uid()));

-- ── Storage: resumes bucket ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes', 'resumes', false, 10 * 1024 * 1024,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Path convention is {user_id}/{resume_id}/{filename}, so the first path
-- segment is always the owner's user id.
CREATE POLICY "Job seekers upload own resume files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Job seekers manage own resume files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Job seekers delete own resume files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Job seekers read own resume files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Employers/admins read a resume file only via the same legitimate-
-- application relationship enforced on the resumes table itself.
CREATE POLICY "Employers read applicant resume files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      EXISTS (
        SELECT 1
        FROM public.resumes r
        JOIN public.job_applications ja ON ja.resume_id = r.id
        JOIN public.jobs j ON j.id = ja.job_id
        JOIN public.companies c ON c.id = j.company_id
        WHERE r.file_path = storage.objects.name AND c.owner_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );
