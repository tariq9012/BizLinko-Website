import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ApplicationStatus } from "./types";

function friendlyApplicationError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (code === "23505") return "You've already applied to this job.";
  if (message.includes("row-level security") || code === "42501") {
    return "This job may no longer be accepting applications.";
  }
  return message || "Something went wrong. Please try again.";
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      applicantId,
      resumeId,
      coverLetter,
    }: {
      jobId: string;
      applicantId: string;
      resumeId: string;
      coverLetter: string;
    }) => {
      const { data, error } = await supabase
        .from("job_applications")
        .insert({
          job_id: jobId,
          applicant_id: applicantId,
          resume_id: resumeId,
          cover_letter: coverLetter || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(friendlyApplicationError(error));
      return data;
    },
    onSuccess: (_data, { jobId }) => {
      void queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["has-applied", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["job-application-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
    },
  });
}

function useInvalidateApplications() {
  const queryClient = useQueryClient();
  return (applicationId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["my-application", applicationId] });
    void queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["employer-application", applicationId] });
    void queryClient.invalidateQueries({ queryKey: ["application-status-history", applicationId] });
    void queryClient.invalidateQueries({ queryKey: ["job-application-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["has-applied"] });
  };
}

export function useWithdrawApplication() {
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: "withdrawn" })
        .eq("id", applicationId);
      if (error) throw new Error(friendlyApplicationError(error));
      return applicationId;
    },
    onSuccess: (applicationId) => invalidate(applicationId),
  });
}

export function useUpdateApplicationStatus() {
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: async ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: ApplicationStatus;
    }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status })
        .eq("id", applicationId);
      if (error) throw new Error(friendlyApplicationError(error));
      return applicationId;
    },
    onSuccess: (applicationId) => invalidate(applicationId),
  });
}
