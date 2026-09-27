-- Phase 7: real-time messaging + in-app notifications.
--
-- A conversation is tied 1:1 to a job_application — this is what stops an
-- arbitrary employer from messaging a random candidate: you can only ever
-- get a conversation for an application you are the candidate on, or the
-- owning employer of. Everything else (participants, messageability) is
-- derived from that one relationship, the same way interviews.* derives
-- job_id/candidate_id/company_id from application_id in Phase 6.

-- ── notification_type ───────────────────────────────────────────────────
CREATE TYPE public.notification_type AS ENUM (
  'application_status_changed',
  'new_application',
  'interview_scheduled',
  'interview_rescheduled',
  'interview_cancelled',
  'interview_completed',
  'new_message'
);

-- ── conversations ────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  CONSTRAINT conversations_application_id_unique UNIQUE (application_id)
);

CREATE INDEX conversations_application_id_idx ON public.conversations (application_id);
CREATE INDEX conversations_last_message_at_idx ON public.conversations (last_message_at DESC);

-- No INSERT/UPDATE grant to authenticated: rows are only ever created by
-- public.find_or_create_conversation() and only ever touched by the
-- messages_after_insert trigger below, both SECURITY DEFINER. Same pattern
-- as application_status_history / interview_events having no direct
-- authenticated INSERT grant.
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── conversation_participants ───────────────────────────────────────────
CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX conversation_participants_user_id_idx ON public.conversation_participants (user_id);
CREATE INDEX conversation_participants_conversation_id_idx
  ON public.conversation_participants (conversation_id);

-- INSERT is never granted directly — only find_or_create_conversation()
-- (SECURITY DEFINER) adds participants, so arbitrary users can never add
-- themselves to a conversation. UPDATE is granted so a participant can
-- maintain their own last_read_at.
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ── messages ─────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT messages_body_length_check CHECK (char_length(body) <= 5000),
  CONSTRAINT messages_body_not_blank_check CHECK (char_length(btrim(body)) > 0)
);

CREATE INDEX messages_conversation_id_created_at_idx
  ON public.messages (conversation_id, created_at, id);
CREATE INDEX messages_sender_id_idx ON public.messages (sender_id);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── notifications ────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_id_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

-- No INSERT grant to authenticated — only the SECURITY DEFINER trigger
-- functions below create notifications, so a user can never fabricate a
-- notification for themselves or anyone else.
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════
-- Helper functions (SECURITY DEFINER — break the same RLS-recursion risk
-- that has_role()/user_owns_resume() break for other tables: a
-- conversation_participants policy that queried conversation_participants
-- again for authorization would be circular).
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id
  ) OR public.has_role(p_user_id, 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated, service_role;

-- Messaging is allowed for every application status except the two exits
-- the brief calls out (rejected/withdrawn); 'hired' stays messageable.
CREATE OR REPLACE FUNCTION public.conversation_is_messageable(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ja.status NOT IN ('rejected', 'withdrawn')
  FROM public.conversations c
  JOIN public.job_applications ja ON ja.id = c.application_id
  WHERE c.id = p_conversation_id;
$$;

REVOKE EXECUTE ON FUNCTION public.conversation_is_messageable(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_is_messageable(UUID) TO authenticated, service_role;

-- Lazy, idempotent conversation creation. Authorizes the caller against the
-- application itself (never against client-supplied company/candidate
-- IDs), then finds-or-creates exactly one conversation + its two
-- participants, safe under concurrent double-clicks via the UNIQUE
-- constraint + ON CONFLICT.
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(p_application_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app RECORD;
  v_employer_owner UUID;
  v_conversation_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ja.id, ja.applicant_id, ja.status, j.company_id
  INTO v_app
  FROM public.job_applications ja
  JOIN public.jobs j ON j.id = ja.job_id
  WHERE ja.id = p_application_id;

  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT c.owner_id INTO v_employer_owner FROM public.companies c WHERE c.id = v_app.company_id;

  IF v_caller <> v_app.applicant_id
     AND (v_employer_owner IS NULL OR v_caller <> v_employer_owner)
     AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Not authorized to message on this application';
  END IF;

  IF v_app.status IN ('rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Messaging is not available for this application';
  END IF;

  INSERT INTO public.conversations (application_id)
  VALUES (p_application_id)
  ON CONFLICT (application_id) DO NOTHING;

  SELECT id INTO v_conversation_id FROM public.conversations WHERE application_id = p_application_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_app.applicant_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  IF v_employer_owner IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, v_employer_owner)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN v_conversation_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_conversation(UUID) TO authenticated;

-- ── RLS: conversations ───────────────────────────────────────────────────
CREATE POLICY "Participants view own conversation"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

-- ── RLS: conversation_participants ──────────────────────────────────────
-- Deliberately scoped to the caller's own row only — the messaging UI
-- derives "who's the other party" from the application/job/company join
-- it already has, so it never needs to SELECT another participant's row
-- here, and no broader read policy (which would need the same
-- is_conversation_participant recursion-avoidance trick) is required.
CREATE POLICY "Users view own participant row"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own participant row"
  ON public.conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── RLS: messages ────────────────────────────────────────────────────────
CREATE POLICY "Participants view conversation messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
    AND public.conversation_is_messageable(conversation_id)
  );

CREATE POLICY "Senders edit or delete own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ── RLS: notifications ───────────────────────────────────────────────────
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════
-- Message integrity + side-effect triggers
-- ══════════════════════════════════════════════════════════════════════

-- Defense in depth alongside the INSERT policy above: never trust
-- sender_id from the client, and re-check messageability server-side.
CREATE OR REPLACE FUNCTION public.messages_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.sender_id := auth.uid();
  IF NOT public.is_conversation_participant(NEW.conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;
  IF NOT public.conversation_is_messageable(NEW.conversation_id) THEN
    RAISE EXCEPTION 'This conversation no longer accepts new messages';
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.messages_before_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_before_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_before_insert();

-- Sender may only change body (→ sets edited_at) or soft-delete (→ sets
-- deleted_at); every other column is pinned to its previous value so an
-- UPDATE can never be used to reassign a message to someone else or to a
-- different conversation.
CREATE OR REPLACE FUNCTION public.messages_before_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() <> OLD.sender_id THEN
    RAISE EXCEPTION 'Only the sender can modify this message';
  END IF;
  NEW.conversation_id := OLD.conversation_id;
  NEW.sender_id := OLD.sender_id;
  NEW.created_at := OLD.created_at;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.deleted_at := now();
  ELSIF NEW.body <> OLD.body THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.messages_before_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_before_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_before_update();

-- Keeps conversations.last_message_at authoritative and notifies every
-- other participant. Runs only on genuinely new messages (not edits).
CREATE OR REPLACE FUNCTION public.messages_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient RECORD;
  v_preview TEXT;
  v_url_prefix TEXT;
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;

  v_preview := left(btrim(NEW.body), 140);

  FOR v_recipient IN
    SELECT cp.user_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id
  LOOP
    v_url_prefix := CASE WHEN public.has_role(v_recipient.user_id, 'employer')
      THEN '/employer/messages' ELSE '/job-seeker/messages' END;

    INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id, action_url)
    VALUES (
      v_recipient.user_id,
      'new_message',
      'New message',
      v_preview,
      'conversation',
      NEW.conversation_id,
      v_url_prefix || '?conversation=' || NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.messages_after_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_after_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_after_insert();

-- ══════════════════════════════════════════════════════════════════════
-- Automatic recruitment-event notifications
-- ══════════════════════════════════════════════════════════════════════

-- New application → notify the employer/company owner. AFTER INSERT so it
-- never blocks the Apply Now flow.
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID;
  v_job_title TEXT;
BEGIN
  SELECT c.owner_id, j.title INTO v_owner, v_job_title
  FROM public.jobs j
  JOIN public.companies c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id, action_url)
    VALUES (
      v_owner,
      'new_application',
      'New application received',
      'A candidate applied for ' || coalesce(v_job_title, 'your job') || '.',
      'application',
      NEW.id,
      '/employer/applications/' || NEW.id
    );
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_new_application() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_new_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- Status change → notify the candidate, except when the candidate is the
-- one who made the change (e.g. withdrawing) — no need to notify someone
-- of their own action.
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job_title TEXT;
  v_title TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.applicant_id THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;

  v_title := CASE NEW.status
    WHEN 'reviewing' THEN 'Application moved to Reviewing'
    WHEN 'shortlisted' THEN 'You have been shortlisted'
    WHEN 'interview' THEN 'Your application moved to Interview'
    WHEN 'offer' THEN 'Your application moved to Offer'
    WHEN 'hired' THEN 'Application marked as Hired'
    WHEN 'rejected' THEN 'Application update'
    ELSE 'Application status updated'
  END;

  INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id, action_url)
  VALUES (
    NEW.applicant_id,
    'application_status_changed',
    v_title,
    'Your application for ' || coalesce(v_job_title, 'this role') || ' was updated.',
    'application',
    NEW.id,
    '/job-seeker/applications/' || NEW.id
  );
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_application_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_application_status_change
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_status_change();

-- Interview lifecycle → notify the candidate. Reuses interview_events
-- (Phase 6's own audit trail of created/rescheduled/cancelled/completed)
-- as the single source of truth instead of re-deriving the same state
-- transitions a second time against `interviews` directly.
CREATE OR REPLACE FUNCTION public.notify_interview_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interview RECORD;
  v_type public.notification_type;
  v_title TEXT;
  v_when TEXT;
BEGIN
  SELECT i.candidate_id, i.application_id, i.title AS interview_title, i.scheduled_at,
         j.title AS job_title, c.name AS company_name
  INTO v_interview
  FROM public.interviews i
  JOIN public.job_applications ja ON ja.id = i.application_id
  JOIN public.jobs j ON j.id = i.job_id
  JOIN public.companies c ON c.id = i.company_id
  WHERE i.id = NEW.interview_id;

  IF v_interview IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.event_type
    WHEN 'created' THEN v_type := 'interview_scheduled'; v_title := 'Interview scheduled';
    WHEN 'rescheduled' THEN v_type := 'interview_rescheduled'; v_title := 'Interview rescheduled';
    WHEN 'cancelled' THEN v_type := 'interview_cancelled'; v_title := 'Interview cancelled';
    WHEN 'completed' THEN v_type := 'interview_completed'; v_title := 'Interview completed';
    ELSE RETURN NEW;
  END CASE;

  v_when := to_char(coalesce(NEW.new_scheduled_at, v_interview.scheduled_at), 'FMMonth FMDD, YYYY "at" HH12:MI AM');

  INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id, action_url)
  VALUES (
    v_interview.candidate_id,
    v_type,
    v_title,
    v_interview.job_title || ' at ' || v_interview.company_name
      || CASE WHEN NEW.event_type IN ('created', 'rescheduled') THEN ' — ' || v_when ELSE '' END,
    'interview',
    NEW.interview_id,
    '/job-seeker/applications/' || v_interview.application_id
  );
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_interview_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_interview_event
  AFTER INSERT ON public.interview_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_interview_event();

-- ══════════════════════════════════════════════════════════════════════
-- Read-side RPCs — avoid N+1 by computing conversation previews + unread
-- counts in one query each, instead of the client fetching every message.
-- Plain SQL functions (SECURITY INVOKER, the default): they run with the
-- caller's own row-level access, so they add no privilege beyond what the
-- RLS policies above already grant that user directly.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  conversation_id UUID,
  application_id UUID,
  job_id UUID,
  job_title TEXT,
  company_id UUID,
  company_name TEXT,
  company_logo TEXT,
  candidate_id UUID,
  candidate_first_name TEXT,
  candidate_last_name TEXT,
  candidate_avatar TEXT,
  application_status public.application_status,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_sender_id UUID,
  last_message_deleted_at TIMESTAMPTZ,
  unread_count BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    c.id, c.application_id, ja.job_id, j.title, j.company_id, comp.name, comp.logo,
    ja.applicant_id, p.first_name, p.last_name, p.profile_image, ja.status,
    c.last_message_at, lm.body, lm.sender_id, lm.deleted_at,
    COALESCE(unread.cnt, 0)
  FROM public.conversations c
  JOIN public.job_applications ja ON ja.id = c.application_id
  JOIN public.jobs j ON j.id = ja.job_id
  JOIN public.companies comp ON comp.id = j.company_id
  LEFT JOIN public.profiles p ON p.id = ja.applicant_id
  LEFT JOIN LATERAL (
    SELECT m.body, m.sender_id, m.deleted_at
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM public.messages m2
    JOIN public.conversation_participants me ON me.conversation_id = c.id AND me.user_id = auth.uid()
    WHERE m2.conversation_id = c.id
      AND m2.sender_id <> auth.uid()
      AND m2.deleted_at IS NULL
      AND m2.created_at > COALESCE(me.last_read_at, 'epoch'::timestamptz)
  ) unread ON true
  WHERE EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
  )
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS BIGINT LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::bigint
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id AND cp.user_id = auth.uid()
  WHERE m.sender_id <> auth.uid()
    AND m.deleted_at IS NULL
    AND m.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamptz);
$$;

REVOKE EXECUTE ON FUNCTION public.get_unread_message_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count() TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- Realtime
-- ══════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
