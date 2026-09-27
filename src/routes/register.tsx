import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { friendlyAuthError, isPasswordValid, roleHome } from "@/lib/auth-utils";

const title = "Create your BizLinko account — BizLinko";
const description =
  "Join BizLinko as a job seeker or employer and start connecting talent with opportunity.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RegisterPage,
});

type Intent = "job_seeker" | "employer";

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent | null>(null);

  if (!intent) {
    return (
      <AuthLayout title="What are you looking for?" subtitle="Choose how you want to use BizLinko.">
        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => setIntent("job_seeker")}
            className="group flex items-start gap-4 rounded-xl border border-border p-5 text-left transition-colors hover:border-primary hover:bg-primary-soft/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Search className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                I&apos;m looking for a job
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Save jobs, apply faster and get alerts for roles that fit you.
              </span>
            </span>
            <ArrowRight className="ml-auto size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={() => setIntent("employer")}
            className="group flex items-start gap-4 rounded-xl border border-border p-5 text-left transition-colors hover:border-primary hover:bg-primary-soft/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Briefcase className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">I&apos;m hiring</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Set up your company and reach skilled professionals.
              </span>
            </span>
            <ArrowRight className="ml-auto size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <RegisterForm
      intent={intent}
      onBack={() => setIntent(null)}
      signUp={signUp}
      navigate={navigate}
    />
  );
}

function RegisterForm({
  intent,
  onBack,
  signUp,
  navigate,
}: {
  intent: Intent;
  onBack: () => void;
  signUp: ReturnType<typeof useAuth>["signUp"];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const employer = intent === "employer";
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    location: "",
    companyName: "",
    jobTitle: "",
    companyLocation: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(): string | null {
    if (!form.firstName.trim() || !form.lastName.trim())
      return "Please enter your first and last name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Please enter a valid email address.";
    if (!isPasswordValid(form.password))
      return "Your password must have at least 8 characters, an uppercase and lowercase letter, and a number.";
    if (form.password !== form.confirm) return "The two passwords don't match.";
    if (employer) {
      if (!form.companyName.trim()) return "Please enter your company name.";
      if (!form.jobTitle.trim()) return "Please enter your job title.";
      if (!form.companyLocation.trim()) return "Please enter your company location.";
    } else if (!form.location.trim()) {
      return "Please enter your location.";
    }
    if (!agreed) return "Please agree to the Terms to continue.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setSubmitting(true);
    try {
      const { role } = await signUp({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: intent,
        location: employer ? form.companyLocation.trim() : form.location.trim(),
        ...(employer
          ? {
              companyName: form.companyName.trim(),
              companyLocation: form.companyLocation.trim(),
              jobTitle: form.jobTitle.trim(),
            }
          : {}),
      });
      toast.success("Your account is ready.");
      navigate({ to: roleHome(role ?? intent), replace: true });
    } catch (err) {
      const message = friendlyAuthError(err instanceof Error ? err.message : undefined);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={employer ? "Create an employer account" : "Create your account"}
      subtitle={
        employer
          ? "Tell us about you and your company to start hiring."
          : "A few details and you're ready to apply."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => set("firstName")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => set("lastName")(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{employer ? "Work email" : "Email"}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {employer ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set("companyName")(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job title</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => set("jobTitle")(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyLocation">Company location</Label>
                <Input
                  id="companyLocation"
                  value={form.companyLocation}
                  onChange={(e) => set("companyLocation")(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => set("location")(e.target.value)}
              placeholder="City, Country"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
          />
          <PasswordStrength password={form.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            value={form.confirm}
            onChange={set("confirm")}
            autoComplete="new-password"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <Checkbox
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="font-medium text-primary hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" className="w-full sm:flex-1" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {submitting ? "Creating account…" : "Create Account"}
          </Button>
          <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
            Back
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
