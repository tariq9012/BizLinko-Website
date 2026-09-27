import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  APPLICANT_APPLICATION_SELECT,
  SEEKER_APPLICATION_SELECT,
  mapApplicantApplication,
  mapSeekerApplication,
  mapStatusHistory,
  type ApplicantApplicationRow,
  type ApplicantProfile,
  type ApplicationStatus,
  type SeekerApplicationRow,
} from "./types";

export function useMyApplications() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["my-applications", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select(SEEKER_APPLICATION_SELECT)
        .eq("applicant_id", currentUser?.id as string)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as SeekerApplicationRow[]).map(mapSeekerApplication);
    },
  });
}

export function useMyApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["my-application", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select(SEEKER_APPLICATION_SELECT)
        .eq("id", applicationId as string)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSeekerApplication(data as unknown as SeekerApplicationRow) : null;
    },
  });
}

/** Whether the current job seeker already has a non-withdrawn application
 * for this job — drives the Apply button state on the job detail page. */
export function useHasApplied(jobId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["has-applied", jobId, currentUser?.id],
    enabled: !!jobId && !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("id, status")
        .eq("job_id", jobId as string)
        .eq("applicant_id", currentUser?.id as string)
        .neq("status", "withdrawn")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useApplicationStatusHistory(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["application-status-history", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_status_history")
        .select("*")
        .eq("application_id", applicationId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapStatusHistory);
    },
  });
}

export interface EmployerApplicationsFilters {
  jobId?: string | undefined;
  status?: ApplicationStatus | undefined;
  search?: string | undefined;
}

const PAGE_SIZE = 10;

export function useEmployerApplications(
  jobIds: string[],
  filters: EmployerApplicationsFilters,
  page: number,
) {
  return useQuery({
    queryKey: ["employer-applications", jobIds, filters, page],
    enabled: jobIds.length > 0,
    queryFn: async () => {
      let query = supabase
        .from("job_applications")
        .select(APPLICANT_APPLICATION_SELECT, { count: "exact" })
        .in("job_id", filters.jobId ? [filters.jobId] : jobIds)
        .order("applied_at", { ascending: false });

      if (filters.status) query = query.eq("status", filters.status);

      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;

      const appRows = data as unknown as ApplicantApplicationRow[];
      const applicantIds = [...new Set(appRows.map((r) => r.applicant_id))];
      const profileById = new Map<string, ApplicantProfile>();
      if (applicantIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, location, bio")
          .in("id", applicantIds);
        if (profileError) throw profileError;
        for (const p of profiles) profileById.set(p.id, p);
      }

      let rows = appRows.map((row) =>
        mapApplicantApplication(row, profileById.get(row.applicant_id)),
      );
      // Applicant-name search happens client-side on the already-narrowed
      // page of results (name isn't a column PostgREST can filter on
      // through a joined table without a dedicated view) — acceptable
      // since it only ever scans this one page, not the whole table.
      const search = filters.search?.trim().toLowerCase();
      if (search) {
        rows = rows.filter((r) => r.applicantName.toLowerCase().includes(search));
      }

      return { applications: rows, total: count ?? 0 };
    },
  });
}

export function useEmployerApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["employer-application", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select(APPLICANT_APPLICATION_SELECT)
        .eq("id", applicationId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as ApplicantApplicationRow;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, location, bio")
        .eq("id", row.applicant_id)
        .maybeSingle();
      if (profileError) throw profileError;

      return mapApplicantApplication(row, profile);
    },
  });
}

/** Per-job application counts for the employer jobs list — one query for
 * every job at once via the job_application_counts view, not N+1. */
export function useJobApplicationCounts(jobIds: string[]) {
  return useQuery({
    queryKey: ["job-application-counts", jobIds],
    enabled: jobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_application_counts")
        .select("*")
        .in("job_id", jobIds);
      if (error) throw error;
      return new Map(data.map((row) => [row.job_id as string, row]));
    },
  });
}
