import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { JobModerationBadge } from "@/components/admin/StatusBadges";
import { ModerationDialog } from "@/components/admin/ModerationDialog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminJobs } from "@/features/admin/queries";
import { useAdminSetJobModeration } from "@/features/admin/mutations";
import type { JobModerationStatus } from "@/features/admin/types";
import type { Database } from "@/integrations/supabase/types";
import { formatDate } from "@/lib/format";

type JobStatus = Database["public"]["Enums"]["job_status"];
const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Admin — BizLinko" }] }),
  component: AdminJobsPage,
});

function AdminJobsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [moderationStatus, setModerationStatus] = useState<JobModerationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const setModeration = useAdminSetJobModeration();

  const { data, isPending, isError } = useAdminJobs({
    search,
    companyId: null,
    status: status === "all" ? null : status,
    moderationStatus: moderationStatus === "all" ? null : moderationStatus,
    page,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  const handleModerate = async (jobId: string, next: JobModerationStatus, reason: string) => {
    try {
      await setModeration.mutateAsync({ jobId, status: next, reason });
      toast.success(
        next === "removed"
          ? "Job removed from public listings"
          : next === "clean"
            ? "Job restored"
            : "Job marked under review",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this job.");
    }
  };

  return (
    <>
      <DashboardHeader
        title="Jobs"
        description="Every job listing on the platform, with moderation controls."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search by job title…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as JobStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Job status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={moderationStatus}
          onValueChange={(v) => {
            setModerationStatus(v as JobModerationStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]" aria-label="Moderation status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moderation</SelectItem>
            <SelectItem value="clean">Clean</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
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
        <EmptyState title="Couldn't load jobs" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No jobs match these filters"
          description="Try a different search or filter."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Moderation</TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((j) => (
                  <TableRow key={j.job_id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{j.company_name}</p>
                    </TableCell>
                    <TableCell className="capitalize">{j.status}</TableCell>
                    <TableCell>
                      <JobModerationBadge status={j.moderation_status} />
                    </TableCell>
                    <TableCell>{j.applicant_count}</TableCell>
                    <TableCell>{j.report_count > 0 ? j.report_count : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(j.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link to="/jobs/$jobId" params={{ jobId: j.job_id }} target="_blank">
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        {j.moderation_status === "removed" ? (
                          <ModerationDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="size-8">
                                <RotateCcw className="size-4" />
                              </Button>
                            }
                            title={`Restore "${j.title}"?`}
                            description="This makes the job publicly visible again (if its own status is still published)."
                            confirmLabel="Restore job"
                            onConfirm={(reason) => handleModerate(j.job_id, "clean", reason)}
                          />
                        ) : (
                          <ModerationDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                            title={`Remove "${j.title}"?`}
                            description="This hides the job from public search and listings. Historical applications remain available to the employer and candidates."
                            confirmLabel="Remove job"
                            destructive
                            onConfirm={(reason) => handleModerate(j.job_id, "removed", reason)}
                          />
                        )}
                      </div>
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
