-- Phase 11 hardening — input validation item 9. Every admin moderation RPC
-- (admin_set_account_status, admin_set_company_status,
-- admin_set_job_moderation) already rejects a blank reason, but nothing
-- capped its length before it lands in admin_audit_logs.reason or
-- reports.resolution_notes. Low severity (only authenticated admins can
-- reach these paths — this isn't an external attack surface), but cheap to
-- close, and a single table-level CHECK covers every current and future
-- write path through write_admin_audit_log() without having to touch each
-- RPC individually.

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_reason_length_check CHECK (reason IS NULL OR char_length(reason) <= 2000);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_resolution_notes_length_check
    CHECK (resolution_notes IS NULL OR char_length(resolution_notes) <= 2000);
