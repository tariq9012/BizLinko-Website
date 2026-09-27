-- Phase 6: job_application_counts (defined in the Phase 4 migration) needs
-- interview/offer columns now that those statuses exist. CREATE OR REPLACE
-- VIEW keeps this a additive change rather than editing the historical file.
CREATE OR REPLACE VIEW public.job_application_counts
WITH (security_invoker = true) AS
SELECT
  job_id,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'submitted') AS submitted,
  count(*) FILTER (WHERE status = 'reviewing') AS reviewing,
  count(*) FILTER (WHERE status = 'shortlisted') AS shortlisted,
  count(*) FILTER (WHERE status = 'hired') AS hired,
  count(*) FILTER (WHERE status = 'rejected') AS rejected,
  count(*) FILTER (WHERE status = 'interview') AS interview,
  count(*) FILTER (WHERE status = 'offer') AS offer
FROM public.job_applications
WHERE status <> 'withdrawn'
GROUP BY job_id;
