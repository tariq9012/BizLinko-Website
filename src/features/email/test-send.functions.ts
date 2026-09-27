// TanStack Start server function. The `.handler()` body below runs
// server-only (never bundled to the client, same as any other
// createServerFn) — it's safe to reach into the email lib here even
// though this file is imported from a client settings page.
//
// Deliberately NOT a public `/send-test-email?to=...` route: it requires
// an authenticated session (via requireSupabaseAuth, the same middleware
// every other authenticated server function in this project uses) and
// ignores any recipient the caller might try to supply — it only ever
// sends to the signed-in user's own verified profile email.
//
// Development-only feature (Phase 12 hardening): the UI button is hidden
// in production builds (see TestEmailDelivery.tsx), but that alone doesn't
// stop someone calling this server function directly, so it also fails
// closed here — refusing to run at all outside development, regardless of
// how it's invoked. This is intentionally a hard refusal rather than a
// rate limiter: there is nothing legitimate for this endpoint to do in
// production, so there's nothing to rate-limit instead of block.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOutboundEmail } = await import("@/lib/email/send-email");
    const { escapeHtml } = await import("@/lib/email/templates");
    const { getEmailConfig } = await import("@/lib/email/config");

    // Fail fast with a clear message if the server isn't configured yet,
    // rather than silently doing nothing.
    const emailConfig = getEmailConfig();

    if (!emailConfig.isDevelopment) {
      throw new Error("Test email delivery is only available in development.");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.email) {
      throw new Error("No verified email address on your account.");
    }

    const name = profile.first_name ?? "there";
    const result = await sendOutboundEmail(
      profile.email,
      {
        subject: "BizLinko test email",
        html: `<p>Hi ${escapeHtml(name)},</p><p>This is a test email from your BizLinko account settings. If you received this, transactional email delivery is working.</p>`,
        text: `Hi ${name},\n\nThis is a test email from your BizLinko account settings. If you received this, transactional email delivery is working.`,
      },
      `test-send:${context.userId}:${Date.now()}`,
    );

    if (!result.ok) {
      throw new Error(result.error ?? "Failed to send test email.");
    }

    return { ok: true as const };
  });
