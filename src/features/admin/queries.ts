import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AccountStatus,
  AppRole,
  JobModerationStatus,
  ReportEntityType,
  ReportReason,
  ReportStatus,
} from "./types";
import type { Database } from "@/integrations/supabase/types";

const PAGE_SIZE = 20;

// ── Dashboard ────────────────────────────────────────────────────────────

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats");
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export type GrowthMetric = "users" | "jobs" | "applications" | "hires";

export function useAdminDailyCounts(metric: GrowthMetric, days: number) {
  return useQuery({
    queryKey: ["admin", "daily-counts", metric, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_daily_counts", {
        p_metric: metric,
        p_days: days,
      });
      if (error) throw error;
      return data;
    },
  });
}

// ── Users ────────────────────────────────────────────────────────────────

export interface AdminUsersFilters {
  search: string;
  role: AppRole | null;
  status: AccountStatus | null;
  page: number;
}

export function useAdminUsers(filters: AdminUsersFilters) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_search: filters.search || null,
        p_role: filters.role,
        p_status: filters.status,
        p_page: filters.page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export function useAdminUserDetail(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "user-detail", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_user_detail", {
        p_user_id: userId as string,
      });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

// ── Companies ────────────────────────────────────────────────────────────

export interface AdminCompaniesFilters {
  search: string;
  verified: boolean | null;
  status: AccountStatus | null;
  page: number;
}

export function useAdminCompanies(filters: AdminCompaniesFilters) {
  return useQuery({
    queryKey: ["admin", "companies", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_companies", {
        p_search: filters.search || null,
        p_verified: filters.verified,
        p_status: filters.status,
        p_page: filters.page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export function useAdminCompanyDetail(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "company-detail", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_company_detail", {
        p_company_id: companyId as string,
      });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

// ── Jobs ─────────────────────────────────────────────────────────────────

export interface AdminJobsFilters {
  search: string;
  companyId: string | null;
  status: Database["public"]["Enums"]["job_status"] | null;
  moderationStatus: JobModerationStatus | null;
  page: number;
}

export function useAdminJobs(filters: AdminJobsFilters) {
  return useQuery({
    queryKey: ["admin", "jobs", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_jobs", {
        p_search: filters.search || null,
        p_company_id: filters.companyId,
        p_status: filters.status,
        p_moderation_status: filters.moderationStatus,
        p_page: filters.page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

// ── Reports ──────────────────────────────────────────────────────────────

export interface AdminReportsFilters {
  status: ReportStatus | null;
  entityType: ReportEntityType | null;
  reason: ReportReason | null;
  page: number;
}

export function useAdminReports(filters: AdminReportsFilters) {
  return useQuery({
    queryKey: ["admin", "reports", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_reports", {
        p_status: filters.status,
        p_entity_type: filters.entityType,
        p_reason: filters.reason,
        p_page: filters.page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export function useAdminReportDetail(reportId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "report-detail", reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_report_detail", {
        p_report_id: reportId as string,
      });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

// ── Audit logs ───────────────────────────────────────────────────────────

export interface AdminAuditFilters {
  adminId: string | null;
  action: string | null;
  entityType: string | null;
  page: number;
}

export function useAdminAuditLogs(filters: AdminAuditFilters) {
  return useQuery({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_audit_logs", {
        p_admin_id: filters.adminId,
        p_action: filters.action,
        p_entity_type: filters.entityType,
        p_page: filters.page,
        p_page_size: 30,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

// ── Application / interview oversight ───────────────────────────────────

export interface AdminApplicationsFilters {
  search: string;
  status: Database["public"]["Enums"]["application_status"] | null;
  page: number;
}

export function useAdminApplications(filters: AdminApplicationsFilters) {
  return useQuery({
    queryKey: ["admin", "applications", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_applications", {
        p_search: filters.search || null,
        p_status: filters.status,
        p_page: filters.page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export function useAdminInterviews(
  status: Database["public"]["Enums"]["interview_status"] | null,
  page: number,
) {
  return useQuery({
    queryKey: ["admin", "interviews", status, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_interviews", {
        p_status: status,
        p_page: page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return { rows: data, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export { PAGE_SIZE as ADMIN_PAGE_SIZE };
