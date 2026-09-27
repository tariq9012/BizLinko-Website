import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Pagination } from "@/components/common/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAuditLogs } from "@/features/admin/queries";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 30;

const ACTIONS = [
  "user_suspended",
  "user_restored",
  "user_banned",
  "company_verified",
  "company_unverified",
  "company_suspended",
  "company_restored",
  "job_removed",
  "job_under_review",
  "job_restored",
  "report_status_changed",
];

const ACTION_LABEL: Record<string, string> = {
  user_suspended: "User suspended",
  user_restored: "User restored",
  user_banned: "User banned",
  company_verified: "Company verified",
  company_unverified: "Company unverified",
  company_suspended: "Company suspended",
  company_restored: "Company restored",
  job_removed: "Job removed",
  job_under_review: "Job under review",
  job_restored: "Job restored",
  report_status_changed: "Report status changed",
};

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Admin — BizLinko" }] }),
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const [action, setAction] = useState<string>("all");
  const [entityType, setEntityType] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useAdminAuditLogs({
    adminId: null,
    action: action === "all" ? null : action,
    entityType: entityType === "all" ? null : entityType,
    page,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <>
      <DashboardHeader
        title="Audit Logs"
        description="Every moderation action taken on the platform, in order."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Entity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="job">Job</SelectItem>
            <SelectItem value="report">Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load audit logs" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No audit entries yet"
          description="Moderation actions will show up here."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.log_id}>
                    <TableCell>{l.admin_name || "—"}</TableCell>
                    <TableCell>{ACTION_LABEL[l.action] ?? l.action}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {l.entity_type}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {l.reason || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(l.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </>
  );
}
