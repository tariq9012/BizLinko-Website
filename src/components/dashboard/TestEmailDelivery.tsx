import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { Button } from "@/components/ui/button";
import { sendTestEmail } from "@/features/email/test-send.functions";

/**
 * Lets a signed-in user verify email delivery is working end to end.
 * Deliberately has no "send to" field — it always sends to the current
 * account's own verified email (enforced server-side in
 * sendTestEmail.functions.ts), so it can never be used to relay arbitrary
 * mail to a third party.
 *
 * Development-only (Phase 12 hardening): a production build has no
 * legitimate use for a "send yourself a test email" button in every user's
 * settings, and leaving it up invites needless Resend usage from ordinary
 * users. Hidden here via `import.meta.env.DEV` (a build-time constant, so
 * this branch — and the component below it — is stripped entirely from
 * the production bundle rather than just hidden by CSS). The server
 * function backing this also refuses to run outside development, so the
 * feature fails closed even if something else were to call it directly.
 */
export function TestEmailDelivery() {
  const [sending, setSending] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  async function handleSend() {
    setSending(true);
    try {
      await sendTestEmail();
      toast.success("Test email sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the test email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SettingsSection
      title="Test email delivery"
      description="Send yourself a test email to confirm notifications are reaching your inbox."
    >
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void handleSend()} disabled={sending}>
          {sending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          {sending ? "Sending…" : "Send test email"}
        </Button>
      </div>
    </SettingsSection>
  );
}
