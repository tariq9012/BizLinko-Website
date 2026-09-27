// Shared types for the transactional email system. Safe to import from
// both server and (rarely) client code — no secrets or provider SDKs here.

export type EmailType =
  | "application_status_changed"
  | "new_application"
  | "interview_scheduled"
  | "interview_rescheduled"
  | "interview_cancelled"
  | "new_message"
  | "saved_search_alert"
  | "account_moderation";

export type EmailOutboxStatus = "pending" | "processing" | "sent" | "failed";

export interface EmailOutboxRow {
  id: string;
  user_id: string;
  email_type: EmailType;
  dedupe_key: string;
  payload: Record<string, unknown>;
  status: EmailOutboxStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// What a rendered email actually is, regardless of which provider sends it.
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// What send-email.ts needs to hand to a provider. Never contains secrets —
// the API key lives only in client.ts, read directly from process.env.
export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Used by providers that support idempotency keys, to guard against a
   *  duplicate provider-level send on worker retry after a network error
   *  where the first attempt may have actually succeeded. */
  idempotencyKey?: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}
