-- Schema audit: foreign-key columns are not automatically indexed by
-- Postgres (unlike primary/unique keys), and a few columns used in
-- WHERE clauses today have no supporting index. These are additive and
-- safe on an empty or small table; add them now before data volume grows.

-- companies.owner_id: looked up when an employer loads "my company"
CREATE INDEX IF NOT EXISTS companies_owner_id_idx ON public.companies (owner_id);

-- companies.status: every public company listing/detail query filters on this
CREATE INDEX IF NOT EXISTS companies_status_idx ON public.companies (status);

-- employer_profiles.company_id: will be looked up once company-side
-- team/member listing exists
CREATE INDEX IF NOT EXISTS employer_profiles_company_id_idx ON public.employer_profiles (company_id);
