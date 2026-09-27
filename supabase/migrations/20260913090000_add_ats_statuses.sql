-- Phase 6: extend application_status with ATS pipeline stages.
--
-- Postgres requires a new enum value to be committed before it can be used
-- in the same session (CHECK constraints, function bodies, etc.) — using it
-- in the same transaction raises "unsafe use of new value of enum type".
-- This migration ONLY adds the values; everything that references them
-- (the updated transition trigger, new tables, etc.) lives in the next
-- migration file so it runs after this one has committed.
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'interview' AFTER 'shortlisted';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'offer' AFTER 'interview';
