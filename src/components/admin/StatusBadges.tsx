import { Badge } from "@/components/ui/badge";
import {
  ACCOUNT_STATUS_LABEL,
  JOB_MODERATION_LABEL,
  REPORT_STATUS_LABEL,
  type AccountStatus,
  type JobModerationStatus,
  type ReportStatus,
} from "@/features/admin/types";

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge
      variant={status === "active" ? "secondary" : status === "pending" ? "outline" : "destructive"}
    >
      {ACCOUNT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function JobModerationBadge({ status }: { status: JobModerationStatus }) {
  return (
    <Badge
      variant={
        status === "clean" ? "secondary" : status === "under_review" ? "outline" : "destructive"
      }
    >
      {JOB_MODERATION_LABEL[status]}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge
      variant={
        status === "resolved"
          ? "secondary"
          : status === "dismissed"
            ? "outline"
            : status === "open"
              ? "destructive"
              : "outline"
      }
    >
      {REPORT_STATUS_LABEL[status]}
    </Badge>
  );
}
