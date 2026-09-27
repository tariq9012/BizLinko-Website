import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useInvalidateSavedJobs() {
  const queryClient = useQueryClient();
  return (jobId: string, userId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["saved-jobs", userId] });
    void queryClient.invalidateQueries({ queryKey: ["is-job-saved", jobId, userId] });
    void queryClient.invalidateQueries({ queryKey: ["saved-jobs-count", userId] });
  };
}

export function useSaveJob() {
  const invalidate = useInvalidateSavedJobs();
  return useMutation({
    mutationFn: async ({ jobId, userId }: { jobId: string; userId: string }) => {
      const { error } = await supabase
        .from("saved_jobs")
        .insert({ job_id: jobId, user_id: userId });
      // A duplicate save (e.g. a double click) is harmless — treat it as
      // success rather than surfacing a raw constraint-violation error.
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: (_d, { jobId, userId }) => invalidate(jobId, userId),
  });
}

export function useUnsaveJob() {
  const invalidate = useInvalidateSavedJobs();
  return useMutation({
    mutationFn: async ({ jobId, userId }: { jobId: string; userId: string }) => {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("job_id", jobId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, { jobId, userId }) => invalidate(jobId, userId),
  });
}
