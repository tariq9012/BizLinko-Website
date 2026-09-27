import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formValuesToScheduledAt, type InterviewFormValues } from "./schemas";

function friendlyInterviewError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (code === "23P01") {
    return "This overlaps with another scheduled interview. Please pick a different time.";
  }
  if (message.includes("row-level security") || code === "42501") {
    return "You don't have permission to do that.";
  }
  return message || "Something went wrong. Please try again.";
}

function useInvalidateInterviews() {
  const queryClient = useQueryClient();
  return (applicationId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["application-interviews", applicationId] });
    void queryClient.invalidateQueries({ queryKey: ["employer-interviews"] });
    void queryClient.invalidateQueries({ queryKey: ["candidate-interviews"] });
    void queryClient.invalidateQueries({ queryKey: ["next-interview"] });
    void queryClient.invalidateQueries({ queryKey: ["interview-events"] });
    void queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["my-application"] });
    void queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["employer-application"] });
    void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  };
}

export function useScheduleInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async ({
      applicationId,
      values,
    }: {
      applicationId: string;
      values: InterviewFormValues;
    }) => {
      const { data, error } = await supabase
        .from("interviews")
        .insert({
          application_id: applicationId,
          interview_method: values.interviewMethod,
          title: values.title,
          scheduled_at: formValuesToScheduledAt(values),
          duration_minutes: values.durationMinutes,
          timezone: values.timezone,
          location: values.location || null,
          meeting_url: values.meetingUrl || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(friendlyInterviewError(error));

      if (values.notes?.trim()) {
        const { error: notesError } = await supabase
          .from("interview_notes")
          .insert({ interview_id: data.id, notes: values.notes.trim() });
        if (notesError) throw new Error(friendlyInterviewError(notesError));
      }
      return data;
    },
    onSuccess: (_d, { applicationId }) => invalidate(applicationId),
  });
}

export function useRescheduleInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async ({
      interviewId,
      applicationId,
      values,
    }: {
      interviewId: string;
      applicationId: string;
      values: InterviewFormValues;
    }) => {
      const { error } = await supabase
        .from("interviews")
        .update({
          title: values.title,
          interview_method: values.interviewMethod,
          scheduled_at: formValuesToScheduledAt(values),
          duration_minutes: values.durationMinutes,
          timezone: values.timezone,
          location: values.location || null,
          meeting_url: values.meetingUrl || null,
        })
        .eq("id", interviewId);
      if (error) throw new Error(friendlyInterviewError(error));
    },
    onSuccess: (_d, { applicationId }) => invalidate(applicationId),
  });
}

export function useCancelInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async ({
      interviewId,
      applicationId,
      reason,
    }: {
      interviewId: string;
      applicationId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from("interviews")
        .update({ status: "cancelled", cancellation_reason: reason || null })
        .eq("id", interviewId);
      if (error) throw new Error(friendlyInterviewError(error));
    },
    onSuccess: (_d, { applicationId }) => invalidate(applicationId),
  });
}

export function useCompleteInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async ({
      interviewId,
      applicationId,
    }: {
      interviewId: string;
      applicationId: string;
    }) => {
      const { error } = await supabase
        .from("interviews")
        .update({ status: "completed" })
        .eq("id", interviewId);
      if (error) throw new Error(friendlyInterviewError(error));
    },
    onSuccess: (_d, { applicationId }) => invalidate(applicationId),
  });
}

export function useUpdateInterviewNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ interviewId, notes }: { interviewId: string; notes: string }) => {
      const { error } = await supabase
        .from("interview_notes")
        .upsert({ interview_id: interviewId, notes });
      if (error) throw new Error(friendlyInterviewError(error));
    },
    onSuccess: (_d, { interviewId }) => {
      void queryClient.invalidateQueries({ queryKey: ["interview-notes", interviewId] });
    },
  });
}
