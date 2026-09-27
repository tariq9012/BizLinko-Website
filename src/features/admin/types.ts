import type { Database } from "@/integrations/supabase/types";

export type AccountStatus = Database["public"]["Enums"]["account_status"];
export type JobModerationStatus = Database["public"]["Enums"]["job_moderation_status"];
export type ReportEntityType = Database["public"]["Enums"]["report_entity_type"];
export type ReportReason = Database["public"]["Enums"]["report_reason"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  banned: "Banned",
  pending: "Pending",
};

export const JOB_MODERATION_LABEL: Record<JobModerationStatus, string> = {
  clean: "Clean",
  under_review: "Under review",
  removed: "Removed",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  under_review: "Under review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  scam: "Scam",
  misleading: "Misleading",
  discrimination: "Discrimination",
  spam: "Spam",
  inappropriate: "Inappropriate",
  duplicate: "Duplicate",
  impersonation: "Impersonation",
  harassment: "Harassment",
  other: "Other",
};

export const JOB_REPORT_REASONS: ReportReason[] = [
  "scam",
  "misleading",
  "discrimination",
  "spam",
  "inappropriate",
  "duplicate",
  "other",
];

export const ENTITY_REPORT_REASONS: ReportReason[] = [
  "impersonation",
  "scam",
  "harassment",
  "spam",
  "inappropriate",
  "other",
];

export function fullName(first: string | null, last: string | null, fallback = "—"): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name || fallback;
}
