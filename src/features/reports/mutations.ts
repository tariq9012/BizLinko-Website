import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReportEntityType, ReportReason } from "@/features/admin/types";

function friendlyReportError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("duplicate key") || message.includes("reports_no_duplicate_open_idx")) {
    return "You've already reported this — our team will review it.";
  }
  if (message.includes("row-level security")) {
    return "You don't have permission to submit this report.";
  }
  return message || "Couldn't submit the report. Please try again.";
}

export function useCreateReport() {
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      reason,
      description,
    }: {
      entityType: ReportEntityType;
      entityId: string;
      reason: ReportReason;
      description?: string;
    }) => {
      const { error } = await supabase.from("reports").insert({
        entity_type: entityType,
        entity_id: entityId,
        reason,
        description: description || null,
      });
      if (error) throw new Error(friendlyReportError(error));
    },
  });
}
