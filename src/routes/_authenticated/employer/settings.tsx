import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SettingsSection, ToggleRow } from "@/components/dashboard/SettingsSection";
import { ChangePassword, DangerZone } from "@/routes/_authenticated/job-seeker/settings";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TestEmailDelivery } from "@/components/dashboard/TestEmailDelivery";

const title = "Employer Settings — BizLinko";
const description = "Manage hiring notifications and your account security.";

export const Route = createFileRoute("/_authenticated/employer/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: EmployerSettings,
});

const toggles = [
  {
    key: "new_applications",
    label: "New applications",
    description: "When someone applies to a role.",
  },
  {
    key: "candidate_messages",
    label: "Candidate messages",
    description: "Replies from candidates.",
  },
  {
    key: "interview_updates",
    label: "Interview updates",
    description: "Scheduling changes and reminders.",
  },
  {
    key: "job_expiry_reminders",
    label: "Job expiry reminders",
    description: "Before a post stops running.",
  },
] as const;

type ToggleKey = (typeof toggles)[number]["key"];

function EmployerSettings() {
  const { currentUser } = useAuth();
  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    new_applications: true,
    candidate_messages: true,
    interview_updates: true,
    job_expiry_reminders: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("new_applications, candidate_messages, interview_updates, job_expiry_reminders")
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
      <DashboardHeader title="Settings" description="Hiring notifications and account security." />
      <div className="space-y-6">
        <SettingsSection title="Notifications" description="Emails we send you about hiring.">
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
        <ChangePassword />
        <DangerZone />
      </div>
    </>
  );
}
