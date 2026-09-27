-- Phase 10: transactional email notifications.
--
-- AUDIT FINDING (see final report): public.user_settings already has one
-- row per user with exactly the toggle columns the brief's "email
-- preferences" section asks for — job_alerts / application_updates /
-- recruiter_messages / interview_notifications on the job-seeker side,
-- new_applications / candidate_messages / interview_updates /
-- job_expiry_reminders on the employer side — and both settings.tsx pages
-- already render them as "Notifications" / "Emails we send you about
-- hiring" toggles wired to that table. No email was ever actually sent for
-- any of it. Rather than create a parallel email_preferences table (the
-- brief's suggested name, not a requirement) this migration reuses
-- user_settings as-is: it is the real preference store, and the settings
-- UI needs no changes. Only the saved-search-alert bit was genuinely
-- missing per-search granularity, so that's added directly to
-- saved_job_searches per the brief's own suggestion (frequency/last-sent
-- have to live per search, not per user). Account/security email is never
-- user-disableable, so it has no toggle at all — the moderation trigger
-- below always enqueues it.

-- ── enums ────────────────────────────────────────────────────────────────
CREATE TYPE public.email_type AS ENUM (
  'application_status_changed',
  'new_application',
  'interview_scheduled',
  'interview_rescheduled',
  'interview_cancelled',
  'new_message',
  'saved_search_alert',
  'account_moderation'
);

CREATE TYPE public.email_outbox_status AS ENUM ('pending', 'processing', 'sent', 'failed');

-- ── saved_job_searches: alert columns ──────────────────────────────────
ALTER TABLE public.saved_job_searches
  ADD COLUMN email_alert_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN alert_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (alert_frequency IN ('daily', 'weekly')),
  ADD COLUMN last_alerted_at TIMESTAMPTZ;

-- Existing "Users manage own saved searches" FOR ALL policy already covers
-- these new columns (owner-only), so a user can never enable alerts on
-- someone else's saved search — no new policy needed.

CREATE INDEX saved_job_searches_alerts_due_idx
  ON public.saved_job_searches (alert_frequency, last_alerted_at)
  WHERE email_alert_enabled;

-- ── email_outbox ─────────────────────────────────────────────────────────
-- Database event / outbox → trusted worker → provider, per the brief.
-- Deliberately does NOT store a raw recipient email address — the worker
-- resolves the current verified address from public.profiles at
-- processing time (server-side only), so a stale/forged address can never
-- sit in this table. user_id + email_type + dedupe_key is the idempotency
-- key: the same business event is inserted at most once, and a retry
-- updates the existing row rather than creating a new one.
CREATE TABLE public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type public.email_type NOT NULL,
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.email_outbox_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  provider_message_id TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_outbox_dedupe_unique UNIQUE (user_id, email_type, dedupe_key),
  CONSTRAINT email_outbox_attempts_check CHECK (attempts >= 0 AND attempts <= max_attempts + 1)
);

CREATE INDEX email_outbox_pending_idx
  ON public.email_outbox (scheduled_for)
  WHERE status = 'pending';
CREATE INDEX email_outbox_user_id_idx ON public.email_outbox (user_id, created_at DESC);
-- Cooldown lookups for message emails (see enqueue_new_message_email below).
CREATE INDEX email_outbox_conversation_cooldown_idx
  ON public.email_outbox (user_id, email_type, created_at DESC)
  WHERE email_type = 'new_message';

-- No INSERT/UPDATE/DELETE grant to authenticated at all: a normal browser
-- client can only ever read its own rows (SELECT, for a "delivery status"
-- UI if one is added later) — it can never create an email job, change a
-- recipient, mark something sent, or retry/inspect anyone else's rows.
-- Every write comes from a SECURITY DEFINER trigger (enqueue) or the
-- service-role worker (processing).
GRANT SELECT ON public.email_outbox TO authenticated;
GRANT ALL ON public.email_outbox TO service_role;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own outbox entries"
  ON public.email_outbox FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- Preference + enqueue helpers (SECURITY DEFINER — same pattern as
-- has_role()/is_conversation_participant(): read tables the caller's own
-- RLS wouldn't necessarily expose, without granting broader access).
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.email_pref_application_updates(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT application_updates FROM public.user_settings WHERE user_id = p_user_id), true);
$$;

CREATE OR REPLACE FUNCTION public.email_pref_interview_candidate(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT interview_notifications FROM public.user_settings WHERE user_id = p_user_id), true);
$$;

CREATE OR REPLACE FUNCTION public.email_pref_new_application(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT new_applications FROM public.user_settings WHERE user_id = p_user_id), true);
$$;

-- Message emails go to either side of a conversation, so the preference
-- column to check depends on the recipient's role.
CREATE OR REPLACE FUNCTION public.email_pref_message(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN public.has_role(p_user_id, 'employer')
       THEN candidate_messages ELSE recruiter_messages END
     FROM public.user_settings WHERE user_id = p_user_id),
    true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_pref_application_updates(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_pref_interview_candidate(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_pref_new_application(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_pref_message(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_pref_application_updates(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_pref_interview_candidate(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_pref_new_application(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_pref_message(UUID) TO service_role;

-- A banned user shouldn't get normal engagement email (moderation/security
-- email is still allowed through — callers simply don't call this helper
-- for that category).
CREATE OR REPLACE FUNCTION public.email_recipient_is_active(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status <> 'banned' FROM public.profiles WHERE id = p_user_id), true);
$$;

REVOKE EXECUTE ON FUNCTION public.email_recipient_is_active(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_recipient_is_active(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_email(
  p_user_id UUID,
  p_email_type public.email_type,
  p_dedupe_key TEXT,
  p_payload JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.email_outbox (user_id, email_type, dedupe_key, payload)
  VALUES (p_user_id, p_email_type, p_dedupe_key, p_payload)
  ON CONFLICT (user_id, email_type, dedupe_key) DO NOTHING;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(UUID, public.email_type, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(UUID, public.email_type, TEXT, JSONB) TO service_role;

-- ══════════════════════════════════════════════════════════════════════
-- Enqueue triggers — one per Phase 7 notification trigger, additive.
-- These never replace the in-app notification triggers, only queue a
-- second delivery channel alongside them. Every one is an AFTER trigger
-- doing a single local INSERT, so it can never roll back the core
-- mutation and never talks to the network itself.
-- ══════════════════════════════════════════════════════════════════════

-- Application status change → candidate email, for meaningful stages only.
-- Mirrors notify_application_status_change()'s "don't email the applicant
-- for their own action" rule.
CREATE OR REPLACE FUNCTION public.enqueue_application_status_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.applicant_id THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('shortlisted', 'interview', 'offer', 'hired', 'rejected') THEN
    RETURN NEW;
  END IF;
  IF NOT public.email_recipient_is_active(NEW.applicant_id) THEN
    RETURN NEW;
  END IF;
  IF NOT public.email_pref_application_updates(NEW.applicant_id) THEN
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_email(
    NEW.applicant_id,
    'application_status_changed',
    NEW.id::text || ':' || NEW.status::text || ':' || extract(epoch FROM NEW.updated_at)::text,
    jsonb_build_object('application_id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_application_status_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_application_status_email
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_application_status_email();

-- New application → employer email.
CREATE OR REPLACE FUNCTION public.enqueue_new_application_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT c.owner_id INTO v_owner
  FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  IF v_owner IS NULL
     OR NOT public.email_recipient_is_active(v_owner)
     OR NOT public.email_pref_new_application(v_owner) THEN
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_email(
    v_owner, 'new_application', NEW.id::text,
    jsonb_build_object('application_id', NEW.id)
  );
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_new_application_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_new_application_email
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_new_application_email();

-- Interview lifecycle → candidate email. interview_events.id is already a
-- unique per-event row, so it doubles as a perfect idempotency key.
CREATE OR REPLACE FUNCTION public.enqueue_interview_event_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate UUID;
  v_type public.email_type;
BEGIN
  CASE NEW.event_type
    WHEN 'created' THEN v_type := 'interview_scheduled';
    WHEN 'rescheduled' THEN v_type := 'interview_rescheduled';
    WHEN 'cancelled' THEN v_type := 'interview_cancelled';
    ELSE RETURN NEW; -- 'completed' has no email
  END CASE;

  SELECT candidate_id INTO v_candidate FROM public.interviews WHERE id = NEW.interview_id;
  IF v_candidate IS NULL
     OR NOT public.email_recipient_is_active(v_candidate)
     OR NOT public.email_pref_interview_candidate(v_candidate) THEN
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_email(
    v_candidate, v_type, NEW.id::text,
    jsonb_build_object('interview_id', NEW.interview_id, 'interview_event_id', NEW.id)
  );
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_interview_event_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_interview_event_email
  AFTER INSERT ON public.interview_events
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_interview_event_email();

-- New message → the other participant's email, throttled to at most one
-- queued email per (recipient, conversation) per 10-minute cooldown
-- window, satisfied via email_outbox_conversation_cooldown_idx above.
CREATE OR REPLACE FUNCTION public.enqueue_new_message_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient RECORD;
  v_recent_exists BOOLEAN;
BEGIN
  FOR v_recipient IN
    SELECT cp.user_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id
  LOOP
    IF NOT public.email_recipient_is_active(v_recipient.user_id) THEN
      CONTINUE;
    END IF;
    IF NOT public.email_pref_message(v_recipient.user_id) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.email_outbox
      WHERE user_id = v_recipient.user_id
        AND email_type = 'new_message'
        AND (payload->>'conversation_id')::uuid = NEW.conversation_id
        AND created_at > now() - interval '10 minutes'
    ) INTO v_recent_exists;

    IF v_recent_exists THEN
      CONTINUE;
    END IF;

    PERFORM public.enqueue_email(
      v_recipient.user_id, 'new_message', NEW.id::text,
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_new_message_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_new_message_email
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_new_message_email();

-- Significant moderation actions → always sent, never gated by
-- user-configurable preference (account/security email is not
-- user-disableable per the brief). Fires only on the transition INTO
-- banned/suspended, not on every profile update.
CREATE OR REPLACE FUNCTION public.enqueue_moderation_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('suspended', 'banned') THEN
    PERFORM public.enqueue_email(
      NEW.id, 'account_moderation',
      NEW.status::text || ':' || extract(epoch FROM NEW.updated_at)::text,
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_moderation_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_moderation_email
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_moderation_email();

-- Company suspension → notify the company's owner (same email_type/shape,
-- payload just carries a company_id instead of relying on the user's own
-- profile status).
CREATE OR REPLACE FUNCTION public.enqueue_company_moderation_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('suspended', 'banned') AND NEW.owner_id IS NOT NULL THEN
    PERFORM public.enqueue_email(
      NEW.owner_id, 'account_moderation',
      'company:' || NEW.id::text || ':' || NEW.status::text || ':' || extract(epoch FROM NEW.updated_at)::text,
      jsonb_build_object('status', NEW.status, 'company_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_company_moderation_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_company_moderation_email
  AFTER UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_company_moderation_email();

-- ══════════════════════════════════════════════════════════════════════
-- Worker-facing RPCs — the process-email-outbox route uses the
-- service-role client, which already bypasses RLS entirely, so these
-- aren't strictly required for authorization. They exist so the worker's
-- "claim a batch" step is a single atomic statement (SKIP LOCKED) instead
-- of a separate select-then-update the service-role client would have to
-- coordinate itself, which matters once more than one worker invocation
-- can overlap.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.claim_pending_emails(p_limit INT DEFAULT 25)
RETURNS SETOF public.email_outbox
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  UPDATE public.email_outbox
  SET status = 'processing', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM public.email_outbox
    WHERE status = 'pending'
      AND scheduled_for <= now()
      AND attempts < max_attempts
    ORDER BY scheduled_for
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_pending_emails(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_emails(INT) TO service_role;
