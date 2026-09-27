-- Phase 8: admin portal + platform moderation.
--
-- account_status already exists (active, suspended, pending) from Phase 1
-- and already backs both profiles.status and companies.status. It's missing
-- 'banned', which Phase 8's moderation model needs. A new enum value must
-- commit before it can be referenced by name elsewhere (functions, checks),
-- so this is its own migration — everything that uses 'banned' lives in the
-- next file, same split used for application_status in Phase 6.
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'banned';
