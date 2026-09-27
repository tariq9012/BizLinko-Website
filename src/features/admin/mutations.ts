import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccountStatus, JobModerationStatus, ReportStatus } from "./types";

function friendlyAdminError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("row-level security") || message.includes("Not authorized")) {
    return "You don't have permission to do that.";
  }
  return message || "Something went wrong. Please try again.";
}

function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return (keys: string[][]) => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
  };
}

export function useAdminSetAccountStatus() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: AccountStatus;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("admin_set_account_status", {
        p_user_id: userId,
        p_status: status,
        p_reason: reason,
      });
      if (error) throw new Error(friendlyAdminError(error));
    },
    onSuccess: (_d, { userId }) =>
      invalidate([
        ["admin", "users"],
        ["admin", "user-detail", userId],
      ]),
  });
}

export function useAdminSetCompanyVerification() {
  const invalidate = useInvalidateAdmin();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      verified,
      reason,
    }: {
      companyId: string;
      verified: boolean;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("admin_set_company_verification", {
        p_company_id: companyId,
        p_verified: verified,
        p_reason: reason ?? null,
      });
      if (error) throw new Error(friendlyAdminError(error));
    },
    onSuccess: (_d, { companyId }) => {
      invalidate([
        ["admin", "companies"],
        ["admin", "company-detail", companyId],
      ]);
      void queryClient.invalidateQueries({ queryKey: ["company"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["featured-companies"] });
    },
  });
}

export function useAdminSetCompanyStatus() {
  const invalidate = useInvalidateAdmin();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      status,
      reason,
    }: {
      companyId: string;
      status: AccountStatus;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("admin_set_company_status", {
        p_company_id: companyId,
        p_status: status,
        p_reason: reason,
      });
      if (error) throw new Error(friendlyAdminError(error));
    },
    onSuccess: (_d, { companyId }) => {
      invalidate([
        ["admin", "companies"],
        ["admin", "company-detail", companyId],
      ]);
      void queryClient.invalidateQueries({ queryKey: ["company"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["featured-companies"] });
    },
  });
}

export function useAdminSetJobModeration() {
  const invalidate = useInvalidateAdmin();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      status,
      reason,
    }: {
      jobId: string;
      status: JobModerationStatus;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("admin_set_job_moderation", {
        p_job_id: jobId,
        p_status: status,
        p_reason: reason,
      });
      if (error) throw new Error(friendlyAdminError(error));
    },
    onSuccess: () => {
      invalidate([["admin", "jobs"]]);
      // A removal/restore changes what the public marketplace shows.
      void queryClient.invalidateQueries({ queryKey: ["public-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["job"] });
      void queryClient.invalidateQueries({ queryKey: ["featured-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["recent-jobs"] });
    },
  });
}

export function useAdminUpdateReportStatus() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      resolutionNotes,
    }: {
      reportId: string;
      status: ReportStatus;
      resolutionNotes?: string;
    }) => {
      const { error } = await supabase.rpc("admin_update_report_status", {
        p_report_id: reportId,
        p_status: status,
        p_resolution_notes: resolutionNotes ?? null,
      });
      if (error) throw new Error(friendlyAdminError(error));
    },
    onSuccess: (_d, { reportId }) =>
      invalidate([
        ["admin", "reports"],
        ["admin", "report-detail", reportId],
      ]),
  });
}
