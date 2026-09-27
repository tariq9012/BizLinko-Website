import type { ApplicationStatus } from "./types";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  hired: "Hired",
  withdrawn: "Withdrawn",
};

export const STATUS_TONE: Record<ApplicationStatus, "neutral" | "primary" | "success" | "warning"> =
  {
    submitted: "neutral",
    reviewing: "primary",
    shortlisted: "warning",
    interview: "primary",
    offer: "warning",
    rejected: "neutral",
    hired: "success",
    withdrawn: "neutral",
  };

export const ALL_STATUSES: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
  "hired",
  "withdrawn",
];

/** The pipeline board's columns, in order — a subset of ALL_STATUSES that
 * excludes 'withdrawn' (a candidate-initiated exit, not a stage an employer
 * moves someone into). */
export const PIPELINE_STAGES: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

/**
 * Mirrors the `job_applications_guard()` trigger exactly, so the UI only
 * ever offers a transition the database will actually accept. The trigger
 * itself is what enforces this — this table exists purely to drive which
 * buttons render/are enabled, and must be kept in sync with the migration
 * if either ever changes.
 */
export const EMPLOYER_ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["reviewing"],
  reviewing: ["shortlisted", "rejected", "submitted"],
  shortlisted: ["interview", "rejected", "reviewing"],
  interview: ["offer", "rejected", "shortlisted"],
  offer: ["hired", "rejected", "interview"],
  rejected: [],
  hired: [],
  withdrawn: [],
};

export const SEEKER_WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offer",
];

export function canSeekerWithdraw(status: ApplicationStatus): boolean {
  return SEEKER_WITHDRAWABLE_STATUSES.includes(status);
}

/** Applications in these statuses can never receive a new interview —
 * mirrors interviews_derive_fields()'s server-side check. */
const TERMINAL_STATUSES: ApplicationStatus[] = ["rejected", "withdrawn", "hired"];

export function canScheduleInterview(status: ApplicationStatus): boolean {
  return !TERMINAL_STATUSES.includes(status);
}
