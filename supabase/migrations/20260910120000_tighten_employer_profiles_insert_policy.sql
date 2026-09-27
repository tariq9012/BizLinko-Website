-- Security fix: employer_profiles INSERT previously only checked
-- `auth.uid() = user_id`, unlike the equivalent `companies` INSERT policy,
-- which also requires `has_role(auth.uid(), 'employer')`. That let any
-- authenticated user (including job seekers) insert an employer_profiles
-- row for themselves and attach it to any existing company_id.
--
-- This tightens the INSERT policy to match the companies table's pattern.
DROP POLICY IF EXISTS "Employers insert own employer profile" ON public.employer_profiles;

CREATE POLICY "Employers insert own employer profile"
  ON public.employer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'employer'));
