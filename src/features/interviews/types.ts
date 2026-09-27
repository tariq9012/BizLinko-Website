import type { Database, Tables } from "@/integrations/supabase/types";

export type InterviewMethod = Database["public"]["Enums"]["interview_method"];
export type InterviewStatus = Database["public"]["Enums"]["interview_status"];
export type InterviewRow = Tables<"interviews">;
export type InterviewEventRow = Tables<"interview_events">;

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  companyId: string;
  interviewMethod: InterviewMethod;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  status: InterviewStatus;
  cancellationReason: string | null;
  createdAt: string;
}

export function mapInterviewRow(row: InterviewRow): Interview {
  return {
    id: row.id,
    applicationId: row.application_id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    companyId: row.company_id,
    interviewMethod: row.interview_method,
    title: row.title,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    timezone: row.timezone,
    location: row.location,
    meetingUrl: row.meeting_url,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
  };
}

/** Interview joined with job title, company name, and candidate name — the
 * shape the employer interviews page and job seeker interviews page both
 * need. */
export type InterviewWithContext = Interview & {
  jobTitle: string;
  companyName: string;
  candidateName: string;
};

export type InterviewRowWithContext = InterviewRow & {
  jobs: { title: string } | null;
  companies: { name: string } | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

export function mapInterviewWithContext(row: InterviewRowWithContext): InterviewWithContext {
  const first = row.profiles?.first_name ?? "";
  const last = row.profiles?.last_name ?? "";
  return {
    ...mapInterviewRow(row),
    jobTitle: row.jobs?.title ?? "Untitled role",
    companyName: row.companies?.name ?? "Unknown company",
    candidateName: `${first} ${last}`.trim() || "Candidate",
  };
}

export interface InterviewEvent {
  id: string;
  eventType: "created" | "rescheduled" | "cancelled" | "completed";
  previousScheduledAt: string | null;
  newScheduledAt: string | null;
  notes: string | null;
  createdAt: string;
}

export function mapInterviewEvent(row: InterviewEventRow): InterviewEvent {
  return {
    id: row.id,
    eventType: row.event_type as InterviewEvent["eventType"],
    previousScheduledAt: row.previous_scheduled_at,
    newScheduledAt: row.new_scheduled_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
