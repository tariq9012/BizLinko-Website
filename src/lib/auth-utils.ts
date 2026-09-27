export type AppRole = "job_seeker" | "employer" | "admin";

export const roleLabel: Record<AppRole, string> = {
  job_seeker: "Job Seeker",
  employer: "Employer",
  admin: "Admin",
};

export function roleHome(role: AppRole | null | undefined): string {
  if (role === "employer") return "/employer";
  if (role === "admin") return "/admin";
  return "/job-seeker";
}

export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return passwordChecks(password).every((c) => c.passed);
}

export function passwordStrength(password: string): { score: number; label: string } {
  const passed = passwordChecks(password).filter((c) => c.passed).length;
  const bonus = password.length >= 12 ? 1 : 0;
  const score = Math.min(4, passed + bonus);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] ?? "Very weak" };
}

export interface ProfileLike {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  profile_image?: string | null;
  headline?: string | null;
  skills?: string[] | null;
}

/**
 * Centralized profile-completeness score. Factors: first name, location,
 * bio, headline, skills, resume, experience, education — each worth an
 * equal share. The extra counts (resume/experience/education) come from
 * separate tables, so they're passed in rather than read off the profile
 * row itself.
 */
export function profileCompletion(
  profile: ProfileLike | null | undefined,
  extras: { hasResume?: boolean; hasExperience?: boolean; hasEducation?: boolean } = {},
): number {
  if (!profile) return 0;
  const hasText = (value: string | null | undefined) =>
    typeof value === "string" && value.trim().length > 0;
  const factors = [
    hasText(profile.first_name),
    hasText(profile.location),
    hasText(profile.bio),
    hasText(profile.headline),
    !!profile.skills && profile.skills.length > 0,
    !!extras.hasResume,
    !!extras.hasExperience,
    !!extras.hasEducation,
  ];
  const filled = factors.filter(Boolean).length;
  return Math.round((filled / factors.length) * 100);
}

export function displayName(profile: ProfileLike | null | undefined, fallback = "Account"): string {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  return profile?.email?.split("@")[0] ?? fallback;
}

/** Friendly copy for auth errors — never surface raw technical detail. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login"))
    return "That email and password combination doesn't match an account.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("pwned") || m.includes("compromised"))
    return "This password has appeared in a known data breach. Please choose a different one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts right now. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "We couldn't reach the server. Check your connection and try again.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email address before signing in.";
  return message?.trim() ? message : "Something went wrong. Please try again.";
}
