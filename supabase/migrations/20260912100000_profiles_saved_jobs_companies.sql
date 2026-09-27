-- Phase 5: candidate profile depth (experience/education/skills), saved
-- jobs, and database-backed company profiles.

-- ── profiles: extend with professional candidate fields ────────────────
ALTER TABLE public.profiles
  ADD COLUMN headline TEXT,
  ADD COLUMN current_job_title TEXT,
  ADD COLUMN current_company TEXT,
  ADD COLUMN years_of_experience INTEGER,
  ADD COLUMN skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN github_url TEXT,
  ADD COLUMN portfolio_url TEXT,
  ADD COLUMN open_to_work BOOLEAN NOT NULL DEFAULT false;

-- ── profile_experience ──────────────────────────────────────────────────
CREATE TABLE public.profile_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  employment_type public.employment_type,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_experience_date_range_check CHECK (end_date IS NULL OR start_date <= end_date),
  CONSTRAINT profile_experience_current_no_end_check CHECK (NOT is_current OR end_date IS NULL)
);

CREATE INDEX profile_experience_user_id_idx ON public.profile_experience (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_experience TO authenticated;
GRANT ALL ON public.profile_experience TO service_role;
ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profile_experience_updated_at
  BEFORE UPDATE ON public.profile_experience
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Job seekers manage own experience"
  ON public.profile_experience FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Same legitimate-application-relationship pattern already used for
-- resumes/profiles in Phase 4 — an employer sees a candidate's experience
-- only once that candidate has actually applied to one of their jobs.
CREATE POLICY "Employers view experience of their applicants"
  ON public.profile_experience FOR SELECT
  TO authenticated
  USING (public.employer_can_view_applicant_profile(user_id, auth.uid()));

-- ── profile_education ───────────────────────────────────────────────────
CREATE TABLE public.profile_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  grade TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_education_date_range_check CHECK (
    start_date IS NULL OR end_date IS NULL OR start_date <= end_date
  )
);

CREATE INDEX profile_education_user_id_idx ON public.profile_education (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_education TO authenticated;
GRANT ALL ON public.profile_education TO service_role;
ALTER TABLE public.profile_education ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profile_education_updated_at
  BEFORE UPDATE ON public.profile_education
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Job seekers manage own education"
  ON public.profile_education FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employers view education of their applicants"
  ON public.profile_education FOR SELECT
  TO authenticated
  USING (public.employer_can_view_applicant_profile(user_id, auth.uid()));

-- ── saved_jobs ──────────────────────────────────────────────────────────
CREATE TABLE public.saved_jobs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE INDEX saved_jobs_user_id_idx ON public.saved_jobs (user_id);

GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job seekers manage own saved jobs"
  ON public.saved_jobs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'job_seeker'));

-- ── companies: extend with public profile fields ────────────────────────
ALTER TABLE public.companies
  ADD COLUMN slug TEXT,
  ADD COLUMN cover_image_url TEXT,
  ADD COLUMN founded_year INTEGER,
  ADD COLUMN linkedin_url TEXT,
  ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false;

-- Backfill slugs for any existing rows before enforcing NOT NULL/UNIQUE —
-- dedupe by appending a short suffix of the id when two companies would
-- otherwise collide (e.g. two companies both named "Acme").
UPDATE public.companies
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
    || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

ALTER TABLE public.companies
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT companies_slug_unique UNIQUE (slug);

-- ── Aggregate views (public, count-only — no N+1 on listing pages) ──────
CREATE VIEW public.job_category_counts
WITH (security_invoker = true) AS
SELECT jc.id AS category_id, jc.slug, count(j.id) AS published_count
FROM public.job_categories jc
LEFT JOIN public.jobs j ON j.category_id = jc.id AND j.status = 'published'
GROUP BY jc.id, jc.slug;

GRANT SELECT ON public.job_category_counts TO anon, authenticated;

CREATE VIEW public.company_open_job_counts
WITH (security_invoker = true) AS
SELECT c.id AS company_id, count(j.id) AS open_job_count
FROM public.companies c
LEFT JOIN public.jobs j ON j.company_id = c.id AND j.status = 'published'
GROUP BY c.id;

GRANT SELECT ON public.company_open_job_counts TO anon, authenticated;

-- ── Storage: avatars (public — deliberate, professional profile photos) ─
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5 * 1024 * 1024, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Job seekers manage own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Job seekers update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Job seekers delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Storage: company-assets (public branding — logo/cover) ──────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-assets', 'company-assets', true, 5 * 1024 * 1024, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

-- Path convention: {company_id}/logo.ext or {company_id}/cover.ext — only
-- that company's owner may write there. NOTE: the subquery must reference
-- `objects.name` explicitly (not bare `name`) — `companies` has its own
-- `name` column, and inside a correlated subquery Postgres resolves an
-- unqualified `name` to the innermost matching column (companies.name),
-- silently breaking the path check.
CREATE POLICY "Company owners upload own assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners update own assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners delete own assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(objects.name))[1] AND c.owner_id = auth.uid()
    )
  );
