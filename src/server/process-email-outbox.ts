// Trusted server worker: processes public.email_outbox.
//
// Note on architecture: TanStack Start's file-based API-route factories
// (createServerFileRoute / createAPIFileRoute) are not available in the
// version pinned in this project's package.json (@tanstack/react-start
// 1.168.32) — they don't exist in that package's exports. Rather than pull
// in a version bump (out of scope for a Phase 10 email feature, and risky
// for an unrelated dependency upgrade), these cron workers are plain
// fetch handlers dispatched directly from this project's own src/server.ts
// custom entry — the same seam that already wraps TanStack's default
// server-entry for SSR error handling. See handleApiRequest() there.
//
// Protected by authenticateCronRequest (Bearer CRON_SECRET) — the same
// scaffolded helper already used to gate other scheduled jobs in this
// project. Never reachable with a user session token, only the shared
// cron secret configured in the scheduler.
//
// Invoke on a schedule (every 1-2 minutes is reasonable) — see README
// "Phase 10 manual setup" for exact pg_cron + pg_net SQL.
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import type { EmailOutboxRow } from "@/lib/email/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BATCH_SIZE = 25;

export async function handleProcessEmailOutbox(request: Request): Promise<Response> {
  const authError = await authenticateCronRequest(request);
  if (authError) return authError;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendOutboundEmail } = await import("@/lib/email/send-email");
  const { renderEmailForRow } = await import("@/lib/email/render-outbox-row");

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_pending_emails", {
    p_limit: BATCH_SIZE,
  });

  if (claimError) {
    return Response.json({ ok: false, error: claimError.message }, { status: 500 });
  }

  const rows = (claimed ?? []) as EmailOutboxRow[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const rendered = await renderEmailForRow(supabaseAdmin, row);
      if (!rendered) {
        // Recipient no longer resolvable (deleted account, etc.) — not a
        // provider failure, don't retry it forever.
        await supabaseAdmin
          .from("email_outbox")
          .update({ status: "failed", last_error: "Recipient email could not be resolved" })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }

      const idempotencyKey = `${row.id}:${row.attempts}`;
      const result = await sendOutboundEmail(
        rendered.recipientEmail,
        rendered.email,
        idempotencyKey,
      );

      if (result.ok) {
        await supabaseAdmin
          .from("email_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: result.providerMessageId ?? null,
            last_error: null,
          })
          .eq("id", row.id);
        sent += 1;
      } else {
        await applyFailure(supabaseAdmin, row, result.error ?? "Unknown provider error");
        failed += 1;
      }
    } catch (err) {
      await applyFailure(
        supabaseAdmin,
        row,
        err instanceof Error ? err.message : "Unknown worker error",
      );
      failed += 1;
    }
  }

  return Response.json({ ok: true, claimed: rows.length, sent, failed, skipped });
}

async function applyFailure(
  admin: SupabaseClient<Database>,
  row: EmailOutboxRow,
  errorMessage: string,
): Promise<void> {
  const exhausted = row.attempts >= row.max_attempts;
  // Bounded backoff: short delay after the first failure, longer after the
  // second. Never retried once max_attempts is reached (rows past that
  // point simply won't be picked up by claim_pending_emails again).
  const patch: Database["public"]["Tables"]["email_outbox"]["Update"] = {
    status: exhausted ? "failed" : "pending",
    last_error: errorMessage.slice(0, 300),
  };
  if (!exhausted) {
    patch.scheduled_for = new Date(Date.now() + backoffMs(row.attempts)).toISOString();
  }
  await admin.from("email_outbox").update(patch).eq("id", row.id);
}

function backoffMs(attempts: number): number {
  // attempt 1 -> retry in 2 min, attempt 2 -> retry in 10 min, then failed.
  return attempts <= 1 ? 2 * 60_000 : 10 * 60_000;
}
