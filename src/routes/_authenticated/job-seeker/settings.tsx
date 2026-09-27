import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SettingsSection, ToggleRow } from "@/components/dashboard/SettingsSection";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError, isPasswordValid } from "@/lib/auth-utils";
import { TestEmailDelivery } from "@/components/dashboard/TestEmailDelivery";

const title = "Settings — BizLinko";
const description = "Manage your notifications, privacy and password.";

export const Route = createFileRoute("/_authenticated/job-seeker/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SeekerSettings,
});

const toggles = [
  { key: "job_alerts", label: "Job alerts", description: "New roles that match your search." },
  {
    key: "application_updates",
    label: "Application updates",
    description: "Status changes on your applications.",
  },
  {
    key: "recruiter_messages",
    label: "Recruiter messages",
    description: "When an employer reaches out.",
  },
  {
    key: "interview_notifications",
    label: "Interview notifications",
    description: "Invitations and reminders.",
  },
  {
    key: "profile_public",
    label: "Public profile",
    description: "Let employers discover your profile.",
  },
] as const;

type ToggleKey = (typeof toggles)[number]["key"];

function SeekerSettings() {
  const { currentUser } = useAuth();
  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    job_alerts: true,
    application_updates: true,
    recruiter_messages: true,
    interview_notifications: true,
    profile_public: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [discoverableLoaded, setDiscoverableLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("discoverable_to_employers")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!active) return;
      if (data) setDiscoverable(data.discoverable_to_employers);
      setDiscoverableLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  async function updateDiscoverable(value: boolean) {
    if (!currentUser) return;
    const previous = discoverable;
    setDiscoverable(value);
    const { error } = await supabase
      .from("profiles")
      .update({ discoverable_to_employers: value })
      .eq("id", currentUser.id);
    if (error) {
      setDiscoverable(previous);
      toast.error("We couldn't save that. Please try again.");
      return;
    }
    toast.success(
      value
        ? "Employers can now discover your profile."
        : "Your profile is hidden from employer discovery.",
    );
  }

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select(
          "job_alerts, application_updates, recruiter_messages, interview_notifications, profile_public",
        )
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (!active) return;
      if (data) setValues(data as Record<ToggleKey, boolean>);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  async function update(key: ToggleKey, value: boolean) {
    if (!currentUser) return;
    const previous = values[key];
    setValues((v) => ({ ...v, [key]: value }));
    // Supabase's generated `Update` type rejects a computed-property object
    // literal passed directly as the argument (`{ [key]: value }`), since TS
    // can't derive a contextual type from its conditional `update()` overload
    // and falls back to a `{ [x: string]: boolean }` index signature. Typing
    // the intermediate variable explicitly against the known toggle-key
    // union fixes the inference without an `as`/unsafe cast.
    const patch: Partial<Record<ToggleKey, boolean>> = { [key]: value };
    const { error } = await supabase
      .from("user_settings")
      .update(patch)
      .eq("user_id", currentUser.id);
    if (error) {
      setValues((v) => ({ ...v, [key]: previous }));
      toast.error("We couldn't save that. Please try again.");
      return;
    }
    toast.success("Preference saved.");
  }

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Choose what you hear about and keep your account secure."
      />

      <div className="space-y-6">
        <SettingsSection title="Notifications" description="Emails we send you.">
          {toggles.map((t) => (
            <ToggleRow key={t.key} label={t.label} description={t.description}>
              <Switch
                checked={values[t.key]}
                disabled={!loaded}
                onCheckedChange={(v) => void update(t.key, v)}
                aria-label={t.label}
              />
            </ToggleRow>
          ))}
        </SettingsSection>

        <TestEmailDelivery />

        <SettingsSection
          title="Employer discovery"
          description="Control whether employers can find you outside of jobs you've applied to."
        >
          <ToggleRow
            label="Allow employers to discover my profile"
            description="When enabled, employers can find your profile in candidate search and job-matching results, and see your headline, skills, experience and education. Your email, phone, resume files and application history are never shown. This doesn't affect employers you've already applied to — they keep the access they need to process your application either way."
          >
            <Switch
              checked={discoverable}
              disabled={!discoverableLoaded}
              onCheckedChange={(v) => void updateDiscoverable(v)}
              aria-label="Allow employers to discover my profile"
            />
          </ToggleRow>
        </SettingsSection>

        <ChangePassword />
        <DangerZone />
      </div>
    </>
  );
}

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
