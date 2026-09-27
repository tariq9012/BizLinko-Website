import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { ReportStatusBadge } from "@/components/admin/StatusBadges";
import { useAdminReports } from "@/features/admin/queries";
import {
  REPORT_REASON_LABEL,
  type ReportEntityType,
  type ReportReason,
  type ReportStatus,
} from "@/features/admin/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin — BizLinko" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const [entityType, setEntityType] = useState<ReportEntityType | "all">("all");
  const [reason, setReason] = useState<ReportReason | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useAdminReports({
    status: status === "all" ? null : status,
    entityType: entityType === "all" ? null : entityType,
    reason: reason === "all" ? null : reason,
    page,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <>
      <DashboardHeader title="Reports" description="User-submitted reports awaiting review." />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ReportStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v as ReportEntityType | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Entity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="job">Job</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={reason}
          onValueChange={(v) => {
            setReason(v as ReportReason | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {(Object.keys(REPORT_REASON_LABEL) as ReportReason[]).map((r) => (
              <SelectItem key={r} value={r}>
                {REPORT_REASON_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load reports" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No reports match these filters"
          description="Nothing to review right now."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.report_id}>
                    <TableCell>
                      <Link
                        to="/admin/reports/$reportId"
                        params={{ reportId: r.report_id }}
                        className="hover:underline"
                      >
                        <p className="font-medium text-foreground">{r.entity_label ?? "—"}</p>
                        <p className="text-xs capitalize text-muted-foreground">{r.entity_type}</p>
                      </Link>
                    </TableCell>
                    <TableCell>{REPORT_REASON_LABEL[r.reason]}</TableCell>
                    <TableCell>{r.reporter_name || "—"}</TableCell>
                    <TableCell>
                      <ReportStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(r.created_at)}
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
