import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, ExternalLink, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ReportStatusBadge } from "@/components/admin/StatusBadges";
import { ModerationDialog } from "@/components/admin/ModerationDialog";
import { useAdminReportDetail } from "@/features/admin/queries";
import { useAdminUpdateReportStatus } from "@/features/admin/mutations";
import { REPORT_REASON_LABEL } from "@/features/admin/types";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports_/$reportId")({
  head: () => ({ meta: [{ title: "Report — Admin — BizLinko" }] }),
  component: AdminReportDetailPage,
});

function targetLink(entityType: string, entityId: string): string | null {
  if (entityType === "job") return `/admin/jobs`;
  if (entityType === "company") return `/admin/companies/${entityId}`;
  if (entityType === "user") return `/admin/users/${entityId}`;
  return null;
}

function AdminReportDetailPage() {
  const { reportId } = Route.useParams();
  const { data: report, isPending, isError } = useAdminReportDetail(reportId);
  const updateStatus = useAdminUpdateReportStatus();

  if (isPending) {
    return <LoadingSkeleton className="h-64 w-full rounded-2xl" />;
  }
  if (isError || !report) {
    return (
      <EmptyState
        title="Couldn't load this report"
        description="It may not exist, or something went wrong."
      />
    );
  }

  const handleUpdate = async (
    status: "under_review" | "resolved" | "dismissed",
    resolutionNotes: string,
  ) => {
    try {
      await updateStatus.mutateAsync({ reportId, status, resolutionNotes });
      toast.success(
        status === "under_review"
          ? "Marked under review"
          : status === "resolved"
            ? "Report resolved"
            : "Report dismissed",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this report.");
    }
  };

  const link = targetLink(report.entity_type, report.entity_id);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link to="/admin/reports">
          <ArrowLeft className="size-4" /> Back to reports
        </Link>
      </Button>

      <DashboardHeader
        title={`Report: ${report.entity_label ?? "—"}`}
        description={`${REPORT_REASON_LABEL[report.reason]} · reported ${formatDate(report.created_at)}`}
        action={
          report.status === "resolved" || report.status === "dismissed" ? undefined : (
            <div className="flex flex-wrap gap-2">
              {report.status === "open" && (
                <ModerationDialog
                  trigger={
                    <Button variant="outline">
                      <Eye className="size-4" /> Mark under review
                    </Button>
                  }
                  title="Mark this report under review?"
                  description="This signals you're actively looking into it."
                  confirmLabel="Mark under review"
                  requireReason={false}
                  onConfirm={(notes) => handleUpdate("under_review", notes)}
                />
              )}
              <ModerationDialog
                trigger={
                  <Button>
                    <CheckCircle2 className="size-4" /> Resolve
                  </Button>
                }
                title="Resolve this report?"
                description="Add resolution notes describing what action was taken (if any)."
                confirmLabel="Resolve"
                onConfirm={(notes) => handleUpdate("resolved", notes)}
              />
              <ModerationDialog
                trigger={
                  <Button variant="outline">
                    <XCircle className="size-4" /> Dismiss
                  </Button>
                }
                title="Dismiss this report?"
                description="Use this when the report doesn't require action."
                confirmLabel="Dismiss"
                onConfirm={(notes) => handleUpdate("dismissed", notes)}
              />
            </div>
          )
        }
      />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Target</p>
            <p className="font-medium text-foreground">
              {report.entity_label}{" "}
              <span className="capitalize text-muted-foreground">({report.entity_type})</span>
            </p>
          </div>
          {link && (
            <Button variant="outline" size="sm" asChild>
              <Link to={link}>
                <ExternalLink className="size-3.5" /> View target
              </Link>
            </Button>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Reporter</p>
          <p className="font-medium text-foreground">
            {report.reporter_name || "—"}{" "}
            {report.reporter_email ? `(${report.reporter_email})` : ""}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Reason</p>
          <p className="font-medium text-foreground">{REPORT_REASON_LABEL[report.reason]}</p>
        </div>

        {report.description && (
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap text-foreground">{report.description}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <ReportStatusBadge status={report.status} />
        </div>

        {report.resolution_notes && (
          <div>
            <p className="text-sm text-muted-foreground">Resolution notes</p>
            <p className="whitespace-pre-wrap text-foreground">{report.resolution_notes}</p>
            {report.resolved_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Resolved {formatDate(report.resolved_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
