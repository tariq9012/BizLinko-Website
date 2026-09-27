// Server-only orchestration layer between the outbox worker and the
// provider client. Nothing here is imported by client/browser code.

import { resolveDevSafeRecipient } from "./config";
import { sendViaResend } from "./client";
import type { RenderedEmail, SendResult } from "./types";

export async function sendOutboundEmail(
  recipientEmail: string,
  rendered: RenderedEmail,
  idempotencyKey: string,
): Promise<SendResult> {
  const to = resolveDevSafeRecipient(recipientEmail);
  return sendViaResend({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey,
  });
}
