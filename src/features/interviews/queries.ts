import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  mapInterviewEvent,
  mapInterviewRow,
  mapInterviewWithContext,
  type InterviewEventRow,
  type InterviewRow,
  type InterviewRowWithContext,
  type InterviewStatus,
} from "./types";

// interviews.candidate_id references auth.users(id), not public.profiles(id)
// directly, so PostgREST has no foreign key to auto-embed `profiles` through
// (same reason job_applications fetches candidate profiles as a separate,
// merged query in features/applications/queries.ts). Embedding it here used
// to 400 with "Could not find a relationship between interviews and
// profiles in the schema cache".
const WITH_CONTEXT_SELECT = "*, jobs(title), companies(name)";

type InterviewContextRow = Omit<InterviewRowWithContext, "profiles">;

async function attachCandidateProfiles(
  rows: InterviewContextRow[],
): Promise<InterviewRowWithContext[]> {
  const candidateIds = [...new Set(rows.map((r) => r.candidate_id))];
  const profileById = new Map<string, { first_name: string | null; last_name: string | null }>();
  if (candidateIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", candidateIds);
    if (error) throw error;
    for (const p of profiles) profileById.set(p.id, p);
  }
  return rows.map((row) => ({ ...row, profiles: profileById.get(row.candidate_id) ?? null }));
}

export function useApplicationInterviews(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["application-interviews", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("application_id", applicationId as string)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data as InterviewRow[]).map(mapInterviewRow);
    },
  });
}

export function useInterviewEvents(interviewId: string | undefined) {
  return useQuery({
    queryKey: ["interview-events", interviewId],
    enabled: !!interviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_events")
        .select("*")
        .eq("interview_id", interviewId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as InterviewEventRow[]).map(mapInterviewEvent);
    },
  });
}

/** Employer-only — see the note in the interview_notes migration comment
 * for why this lives in its own table/query rather than a column read
 * alongside the interview itself. */
export function useInterviewNotes(interviewId: string | undefined) {
  return useQuery({
    queryKey: ["interview-notes", interviewId],
    enabled: !!interviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_notes")
        .select("notes")
        .eq("interview_id", interviewId as string)
        .maybeSingle();
      if (error) throw error;
      return data?.notes ?? "";
    },
  });
}

export interface EmployerInterviewFilters {
  status?: InterviewStatus | undefined;
  jobId?: string | undefined;
}

export function useEmployerInterviews(
  companyId: string | undefined,
  filters: EmployerInterviewFilters = {},
) {
  return useQuery({
    queryKey: ["employer-interviews", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let query = supabase
        .from("interviews")
        .select(WITH_CONTEXT_SELECT)
        .eq("company_id", companyId as string)
        .order("scheduled_at", { ascending: true });
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.jobId) query = query.eq("job_id", filters.jobId);
      const { data, error } = await query;
      if (error) throw error;
      const withProfiles = await attachCandidateProfiles(data as unknown as InterviewContextRow[]);
      return withProfiles.map(mapInterviewWithContext);
    },
  });
}

export function useCandidateInterviews(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-interviews", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select(WITH_CONTEXT_SELECT)
        .eq("candidate_id", candidateId as string)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      const withProfiles = await attachCandidateProfiles(data as unknown as InterviewContextRow[]);
      return withProfiles.map(mapInterviewWithContext);
    },
  });
}

/** Soonest upcoming scheduled interview for the dashboard widget — one row
 * only, not the whole list. */
export function useNextUpcomingInterview(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["next-interview", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select(WITH_CONTEXT_SELECT)
        .eq("candidate_id", candidateId as string)
        .eq("status", "scheduled")
        .gt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const withProfiles = await attachCandidateProfiles([data as unknown as InterviewContextRow]);
      return mapInterviewWithContext(withProfiles[0]!);
    },
  });
}

/** Pipeline board data: every non-withdrawn application for one job, with
 * candidate + resume context, grouped by the UI into columns. Scoped to a
 * single job (not "every applicant across every job") per the brief. */
export function usePipelineApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*, resumes(id, name), profiles(id, first_name, last_name, headline)")
        .eq("job_id", jobId as string)
        .neq("status", "withdrawn")
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
