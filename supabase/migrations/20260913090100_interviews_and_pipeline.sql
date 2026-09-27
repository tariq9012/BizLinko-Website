-- Phase 6: ATS pipeline transitions + interview scheduling. Runs after the
-- enum values from the previous migration have committed.

-- ── Updated centralized transition guard ────────────────────────────────
-- Same function as Phase 4, extended with interview/offer stages. Kept as
-- one CREATE OR REPLACE on the existing trigger function/trigger, not a
-- new one, so there is exactly one place this logic lives.
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
  IF NEW.job_id <> OLD.job_id OR NEW.applicant_id <> OLD.applicant_id OR NEW.resume_id <> OLD.resume_id THEN
    RAISE EXCEPTION 'job_id, applicant_id and resume_id cannot be changed after submission';
  END IF;

  IF NOT is_admin AND NEW.status <> OLD.status THEN
    IF is_applicant THEN
      -- A job seeker may only withdraw, from any non-terminal state.
      IF NEW.status <> 'withdrawn'
         OR OLD.status NOT IN ('submitted', 'reviewing', 'shortlisted', 'interview', 'offer') THEN
        RAISE EXCEPTION 'You can only withdraw an application that has not already been decided';
      END IF;
    ELSIF is_owning_employer THEN
      IF NOT (
        (OLD.status = 'submitted' AND NEW.status = 'reviewing')
        OR (OLD.status = 'reviewing' AND NEW.status IN ('shortlisted', 'rejected', 'submitted'))
        OR (OLD.status = 'shortlisted' AND NEW.status IN ('interview', 'rejected', 'reviewing'))
        OR (OLD.status = 'interview' AND NEW.status IN ('offer', 'rejected', 'shortlisted'))
        OR (OLD.status = 'offer' AND NEW.status IN ('hired', 'rejected', 'interview'))
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

-- ── Enums ────────────────────────────────────────────────────────────────
CREATE TYPE public.interview_method AS ENUM ('video', 'phone', 'onsite');
CREATE TYPE public.interview_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- ── interviews ──────────────────────────────────────────────────────────
-- job_id/candidate_id/company_id/scheduled_by are redundant with what's
-- derivable from application_id, kept anyway (per the brief) for query/RLS
-- performance — but a trigger below always overwrites them from the
-- application row, so the browser's values for these are never trusted.
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scheduled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  interview_method public.interview_method NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  location TEXT,
  meeting_url TEXT,

  status public.interview_status NOT NULL DEFAULT 'scheduled',
  cancellation_reason TEXT,

  -- Maintained by interviews_require_future() below (not computed inline
  -- in an index expression) because timestamptz + interval arithmetic is
  -- STABLE, not IMMUTABLE, in Postgres, and GIST index expressions must be
  -- immutable. A plain stored column sidesteps that entirely.
  scheduled_range TSTZRANGE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT interviews_duration_check CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT interviews_video_needs_url CHECK (interview_method <> 'video' OR meeting_url IS NOT NULL),
  CONSTRAINT interviews_onsite_needs_location CHECK (interview_method <> 'onsite' OR location IS NOT NULL)
);

CREATE INDEX interviews_application_id_idx ON public.interviews (application_id);
CREATE INDEX interviews_job_id_idx ON public.interviews (job_id);
CREATE INDEX interviews_company_id_idx ON public.interviews (company_id);
CREATE INDEX interviews_candidate_id_idx ON public.interviews (candidate_id);
CREATE INDEX interviews_scheduled_at_idx ON public.interviews (scheduled_at);
CREATE INDEX interviews_status_idx ON public.interviews (status);

-- Database-level conflict detection: no two SCHEDULED interviews for the
-- same candidate, or for the same scheduler, may overlap in time. Requires
-- btree_gist for the equality-plus-range exclusion.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.interviews ADD CONSTRAINT interviews_no_candidate_overlap
  EXCLUDE USING gist (
    candidate_id WITH =,
    scheduled_range WITH &&
  ) WHERE (status = 'scheduled');

ALTER TABLE public.interviews ADD CONSTRAINT interviews_no_scheduler_overlap
  EXCLUDE USING gist (
    scheduled_by WITH =,
    scheduled_range WITH &&
  ) WHERE (status = 'scheduled' AND scheduled_by IS NOT NULL);

GRANT SELECT, INSERT, UPDATE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Always derive job_id/candidate_id/company_id from the application row —
-- never trust these columns as supplied by the client, even though the
-- client's insert payload includes them for convenience.
CREATE OR REPLACE FUNCTION public.interviews_derive_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  app RECORD;
BEGIN
  SELECT ja.job_id, ja.applicant_id, j.company_id, ja.status
  INTO app
  FROM public.job_applications ja
  JOIN public.jobs j ON j.id = ja.job_id
  WHERE ja.id = NEW.application_id;

  IF app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  IF TG_OP = 'INSERT' AND app.status IN ('rejected', 'withdrawn', 'hired') THEN
    RAISE EXCEPTION 'Cannot schedule an interview for a % application', app.status;
  END IF;

  NEW.job_id := app.job_id;
  NEW.candidate_id := app.applicant_id;
  NEW.company_id := app.company_id;
  IF TG_OP = 'INSERT' THEN
    NEW.scheduled_by := auth.uid();
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.interviews_derive_fields() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER interviews_derive_fields
  BEFORE INSERT OR UPDATE OF application_id ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.interviews_derive_fields();

-- Require a future scheduled_at on insert and on any reschedule, and keep
-- scheduled_range in sync with scheduled_at/duration_minutes so the
-- overlap EXCLUDE constraints above always see the current interval.
CREATE OR REPLACE FUNCTION public.interviews_require_future()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'scheduled' AND (TG_OP = 'INSERT' OR NEW.scheduled_at <> OLD.scheduled_at) THEN
    IF NEW.scheduled_at <= now() THEN
      RAISE EXCEPTION 'Interview must be scheduled in the future';
    END IF;
  END IF;
  NEW.scheduled_range := tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_minutes));
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.interviews_require_future() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER interviews_require_future
  BEFORE INSERT OR UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.interviews_require_future();

-- Move a shortlisted application into the 'interview' stage the moment its
-- first active interview is scheduled. Never touches a terminal status —
-- interviews_derive_fields() already blocks scheduling against
-- rejected/withdrawn/hired applications, and this only fires from
-- 'shortlisted' specifically, so 'interview'/'offer' applications getting
-- another round are left exactly as they are.
CREATE OR REPLACE FUNCTION public.interviews_advance_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.job_applications
  SET status = 'interview'
  WHERE id = NEW.application_id AND status = 'shortlisted';
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.interviews_advance_application_status() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER interviews_advance_application_status
  AFTER INSERT ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.interviews_advance_application_status();

-- ── RLS: interviews ─────────────────────────────────────────────────────
CREATE POLICY "Employers view interviews for own company jobs"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Candidates view own interviews"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "Employers schedule interviews for own company jobs"
  ON public.interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.companies c ON c.id = j.company_id
      WHERE ja.id = application_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employers manage interviews for own company jobs"
  ON public.interviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── interview_notes ─────────────────────────────────────────────────────
-- Kept in a separate table (not a column on interviews) specifically so
-- the candidate-facing RLS gap it would otherwise create is impossible:
-- RLS is row-level, not column-level, so a "notes" column on interviews
-- would need to be hidden by client discipline alone once a candidate has
-- any SELECT access to that row. A dedicated table gets a real, enforced
-- employer-only policy instead.
CREATE TABLE public.interview_notes (
  interview_id UUID PRIMARY KEY REFERENCES public.interviews(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.interview_notes TO authenticated;
GRANT ALL ON public.interview_notes TO service_role;
ALTER TABLE public.interview_notes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER interview_notes_updated_at
  BEFORE UPDATE ON public.interview_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Employers manage own interview notes"
  ON public.interview_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.companies c ON c.id = i.company_id
      WHERE i.id = interview_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.companies c ON c.id = i.company_id
      WHERE i.id = interview_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── interview_events (audit trail) ──────────────────────────────────────
CREATE TABLE public.interview_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'rescheduled', 'cancelled', 'completed')),
  previous_scheduled_at TIMESTAMPTZ,
  new_scheduled_at TIMESTAMPTZ,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX interview_events_interview_id_idx ON public.interview_events (interview_id);

-- No direct INSERT grant — only the SECURITY DEFINER trigger below writes
-- here, same pattern as application_status_history.
GRANT SELECT ON public.interview_events TO authenticated;
GRANT ALL ON public.interview_events TO service_role;
ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view interview events"
  ON public.interview_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      WHERE i.id = interview_id
        AND (
          i.candidate_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = i.company_id AND c.owner_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE OR REPLACE FUNCTION public.interviews_log_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.interview_events (interview_id, event_type, new_scheduled_at, changed_by)
    VALUES (NEW.id, 'created', NEW.scheduled_at, auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.interview_events (interview_id, event_type, changed_by, notes)
    VALUES (NEW.id, 'cancelled', auth.uid(), NEW.cancellation_reason);
  ELSIF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    INSERT INTO public.interview_events (interview_id, event_type, changed_by)
    VALUES (NEW.id, 'completed', auth.uid());
  ELSIF NEW.scheduled_at <> OLD.scheduled_at THEN
    INSERT INTO public.interview_events (interview_id, event_type, previous_scheduled_at, new_scheduled_at, changed_by)
    VALUES (NEW.id, 'rescheduled', OLD.scheduled_at, NEW.scheduled_at, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.interviews_log_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER interviews_log_event_insert
  AFTER INSERT ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.interviews_log_event();

CREATE TRIGGER interviews_log_event_update
  AFTER UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.interviews_log_event();
