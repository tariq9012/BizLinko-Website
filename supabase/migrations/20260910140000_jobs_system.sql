-- Phase 3: core jobs system (job_categories + jobs), replacing the static
-- frontend data as the source of truth for public listings.

-- ── Enums ────────────────────────────────────────────────────────────────
CREATE TYPE public.employment_type AS ENUM ('Full-time', 'Part-time', 'Contract', 'Internship');
CREATE TYPE public.workplace_type AS ENUM ('Remote', 'Hybrid', 'On-site');
CREATE TYPE public.experience_level AS ENUM ('Entry', 'Mid', 'Senior', 'Lead');
CREATE TYPE public.salary_period AS ENUM ('year', 'month', 'hour');
CREATE TYPE public.job_status AS ENUM ('draft', 'published', 'closed', 'archived');

-- ── job_categories ──────────────────────────────────────────────────────
-- Replaces src/data/categories.ts as the runtime source of truth. `icon_key`
-- is a string the frontend maps to a lucide-react icon component — no
-- React/UI concerns stored in the database.
CREATE TABLE public.job_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_key TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_categories TO anon, authenticated;
GRANT ALL ON public.job_categories TO service_role;
ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON public.job_categories FOR SELECT
  USING (active = true);

-- ── jobs ────────────────────────────────────────────────────────────────
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.job_categories(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  qualifications TEXT[] NOT NULL DEFAULT '{}',
  benefits TEXT[] NOT NULL DEFAULT '{}',

  employment_type public.employment_type NOT NULL,
  workplace_type public.workplace_type NOT NULL,
  experience_level public.experience_level NOT NULL,

  city TEXT NOT NULL,
  country TEXT NOT NULL,

  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT NOT NULL DEFAULT 'USD',
  salary_period public.salary_period NOT NULL DEFAULT 'year',
  hide_salary BOOLEAN NOT NULL DEFAULT false,

  skills TEXT[] NOT NULL DEFAULT '{}',

  status public.job_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  application_deadline DATE,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Full-text search across the fields job seekers actually search by.
  -- Postgres generated columns require an IMMUTABLE expression, and
  -- to_tsvector() is only STABLE (its output can depend on the text search
  -- configuration catalog), so this is kept up to date via a BEFORE
  -- INSERT/UPDATE trigger below instead of GENERATED ALWAYS AS ... STORED.
  search_vector TSVECTOR,

  CONSTRAINT jobs_salary_range_check
    CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
  CONSTRAINT jobs_company_slug_unique UNIQUE (company_id, slug)
);

GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Indexes for common job-marketplace query patterns.
CREATE INDEX jobs_status_idx ON public.jobs (status);
CREATE INDEX jobs_company_id_idx ON public.jobs (company_id);
CREATE INDEX jobs_category_id_idx ON public.jobs (category_id);
CREATE INDEX jobs_created_by_idx ON public.jobs (created_by);
CREATE INDEX jobs_employment_type_idx ON public.jobs (employment_type);
CREATE INDEX jobs_workplace_type_idx ON public.jobs (workplace_type);
CREATE INDEX jobs_experience_level_idx ON public.jobs (experience_level);
CREATE INDEX jobs_location_idx ON public.jobs (country, city);
CREATE INDEX jobs_search_vector_idx ON public.jobs USING GIN (search_vector);
-- Covers the single most common query: "newest published jobs first".
CREATE INDEX jobs_published_listing_idx ON public.jobs (published_at DESC) WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.jobs_update_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.skills, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '') || ' ' || coalesce(NEW.country, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.jobs_update_search_vector() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER jobs_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, skills, city, country ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_update_search_vector();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep published_at/closed_at consistent with status transitions regardless
-- of which client/query performs the update.
CREATE OR REPLACE FUNCTION public.jobs_track_status_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
    NEW.closed_at := NULL;
  ELSIF NEW.status = 'closed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'closed') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSIF NEW.status IN ('draft', 'archived') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.jobs_track_status_timestamps() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER jobs_status_timestamps
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_track_status_timestamps();

-- ── RLS: jobs ───────────────────────────────────────────────────────────
-- Public (anon + authenticated): published jobs only.
CREATE POLICY "Anyone can view published jobs"
  ON public.jobs FOR SELECT
  USING (status = 'published');

-- Employers: full visibility into their own company's jobs regardless of
-- status; admins: full visibility into everything. Ownership is resolved
-- through companies.owner_id, the same authority used by the companies
-- table's own RLS policies (see the phase-1 migration).
CREATE POLICY "Employers view own company jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- An employer can only ever create a job for a company they own, and only
-- if they actually hold the 'employer' role — the browser's request body is
-- never trusted for `company_id` or `created_by`.
CREATE POLICY "Employers create jobs for own company"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_role(auth.uid(), 'employer')
    AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  );

-- WITH CHECK re-validates ownership of the (possibly new) company_id too, so
-- an employer can never move a job onto a company they don't own.
CREATE POLICY "Employers update own company jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Hard delete is restricted to draft/archived jobs — a published or closed
-- job (which may already have a public/shared URL) should be archived
-- instead of destroyed. Admins can delete any job.
CREATE POLICY "Employers delete own draft or archived jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (
    (
      status IN ('draft', 'archived')
      AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );
