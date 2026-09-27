// This file is server-only. It must never be imported by a route/component
// file — only by send-email.ts and server routes / cron handlers, loaded
// with a dynamic `await import(...)` the same way client.server.ts is, so
// it (and RESEND_API_KEY with it) never reaches the client bundle.
//
// The rest of the app only ever talks to sendOutboundEmail() in
// send-email.ts, never to Resend directly — that's the "provider-specific
// code behind a clean abstraction" boundary. Swapping providers later means
// rewriting this one file.

import { getEmailConfig } from "./config";
import type { OutboundEmail, SendResult } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendViaResend(email: OutboundEmail): Promise<SendResult> {
  const { resendApiKey, emailFrom } = getEmailConfig();

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Resend responded ${response.status}: ${sanitizeProviderError(body)}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return data.id ? { ok: true, providerMessageId: data.id } : { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown send error" };
  }
}

// Delivery logging must never persist a full provider error body (which can
// echo back template content / headers) — keep only a bounded, sanitized
// summary suitable for `email_outbox.last_error`.
function sanitizeProviderError(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, 300);
}
