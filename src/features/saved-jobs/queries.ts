import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  JOB_SELECT_WITH_RELATIONS,
  mapJobRow,
  type JobRowWithRelations,
} from "@/features/jobs/types";

export interface SavedJob {
  savedAt: string;
  job: ReturnType<typeof mapJobRow>;
}

export function useSavedJobs() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["saved-jobs", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async (): Promise<SavedJob[]> => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select(`created_at, jobs(${JOB_SELECT_WITH_RELATIONS})`)
        .eq("user_id", currentUser?.id as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as { created_at: string; jobs: JobRowWithRelations | null }[])
        .filter((row) => row.jobs)
        .map((row) => ({
          savedAt: row.created_at,
          job: mapJobRow(row.jobs as JobRowWithRelations),
        }));
    },
  });
}

export function useIsJobSaved(jobId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["is-job-saved", jobId, currentUser?.id],
    enabled: !!jobId && !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("job_id", jobId as string)
        .eq("user_id", currentUser?.id as string)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

/** Efficient count-only query for the dashboard stat card — no rows
 * fetched, just the count. */
export function useSavedJobsCount() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["saved-jobs-count", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("saved_jobs")
        .select("job_id", { count: "exact", head: true })
        .eq("user_id", currentUser?.id as string);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
