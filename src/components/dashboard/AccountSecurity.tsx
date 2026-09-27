import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError, isPasswordValid } from "@/lib/auth-utils";

export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid(next)) {
      toast.error("Your new password must have 8+ characters, upper and lower case, and a number.");
      return;
    }
    if (next !== confirm) {
      toast.error("The two new passwords don't match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: next,
      current_password: current,
    } as never);
    setSaving(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password updated.");
  }

  return (
    <SettingsSection title="Password" description="Update the password you use to sign in.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Current password</Label>
          <PasswordInput id="current" value={current} onChange={setCurrent} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next">New password</Label>
          <PasswordInput id="next" value={next} onChange={setNext} autoComplete="new-password" />
          <PasswordStrength password={next} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmNew">Confirm new password</Label>
          <PasswordInput
            id="confirmNew"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {saving ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

export function DangerZone() {
  return (
    <SettingsSection
      title="Delete account"
      description="Permanently remove your account and everything in it."
      tone="danger"
    >
      <p className="text-sm text-muted-foreground">
        Account deletion isn&apos;t available yet. Contact us and we&apos;ll take care of it for
        you.
      </p>
      <Button variant="destructive" disabled>
        Delete account
      </Button>
    </SettingsSection>
  );
}
