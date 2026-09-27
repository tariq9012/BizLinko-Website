import type { Database, Tables } from "@/integrations/supabase/types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type ApplicationRow = Tables<"job_applications">;
export type StatusHistoryRow = Tables<"application_status_history">;

/** Application as seen by the job seeker who submitted it — job + company
 * context joined in, resume joined in. */
export interface SeekerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  companyId: string;
  companyName: string;
  location: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  withdrawnAt: string | null;
  coverLetter: string | null;
  resumeId: string;
  resumeName: string;
}

export type SeekerApplicationRow = ApplicationRow & {
  jobs: {
    id: string;
    title: string;
    status: string;
    city: string;
    country: string;
    companies: { id: string; name: string } | null;
  } | null;
  resumes: { id: string; name: string } | null;
};

export function mapSeekerApplication(row: SeekerApplicationRow): SeekerApplication {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.jobs?.title ?? "Job no longer available",
    jobStatus: row.jobs?.status ?? "archived",
    companyId: row.jobs?.companies?.id ?? "",
    companyName: row.jobs?.companies?.name ?? "Unknown company",
    location: row.jobs ? [row.jobs.city, row.jobs.country].filter(Boolean).join(", ") : "",
    status: row.status,
    appliedAt: row.applied_at,
    reviewedAt: row.reviewed_at,
    withdrawnAt: row.withdrawn_at,
    coverLetter: row.cover_letter,
    resumeId: row.resume_id,
    resumeName: row.resumes?.name ?? "Resume",
  };
}

export const SEEKER_APPLICATION_SELECT =
  "*, jobs(id, title, status, city, country, companies(id, name)), resumes(id, name)";

/** Application as seen by the employer reviewing it — applicant profile
 * joined in, job title joined in, resume joined in. */
export interface ApplicantApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  coverLetter: string | null;
  resumeId: string;
  resumeName: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string | null;
  applicantLocation: string | null;
  applicantBio: string | null;
}

export type ApplicantApplicationRow = ApplicationRow & {
  jobs: { id: string; title: string } | null;
  resumes: { id: string; name: string } | null;
};

export type ApplicantProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  location: string | null;
  bio: string | null;
};

/**
 * `job_applications` has no direct foreign key to `profiles` — only to
 * `auth.users` (via applicant_id), while `profiles.id` separately
 * references `auth.users.id`. PostgREST can only auto-embed a related
 * table through a real FK between the two tables actually in the query, so
 * `profiles(...)` cannot be embedded directly in a `job_applications`
 * select — doing so fails with a "could not find a relationship" schema
 * error. The profile is fetched in a second query instead and merged in
 * here.
 */
export function mapApplicantApplication(
  row: ApplicantApplicationRow,
  profile: ApplicantProfile | null | undefined,
): ApplicantApplication {
  const first = profile?.first_name ?? "";
  const last = profile?.last_name ?? "";
  const name = `${first} ${last}`.trim();
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.jobs?.title ?? "Untitled role",
    status: row.status,
    appliedAt: row.applied_at,
    reviewedAt: row.reviewed_at,
    coverLetter: row.cover_letter,
    resumeId: row.resume_id,
    resumeName: row.resumes?.name ?? "Resume",
    applicantId: row.applicant_id,
    applicantName: name || "Applicant",
    applicantEmail: profile?.email ?? null,
    applicantLocation: profile?.location ?? null,
    applicantBio: profile?.bio ?? null,
  };
}

export const APPLICANT_APPLICATION_SELECT = "*, jobs(id, title), resumes(id, name)";

export interface StatusHistoryEntry {
  id: string;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  createdAt: string;
}

export function mapStatusHistory(row: StatusHistoryRow): StatusHistoryEntry {
  return {
    id: row.id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    createdAt: row.created_at,
  };
}
