import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Kanban, Loader2, MoreHorizontal, Pencil, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import { useEmployerJobs } from "@/features/jobs/queries";
import { useSetJobStatus, useDeleteJob, useDuplicateJob } from "@/features/jobs/mutations";
import { useJobApplicationCounts } from "@/features/applications/queries";
import { formatDate } from "@/lib/format";
import type { Job, JobStatus } from "@/types";

const title = "My Jobs — BizLinko";
const description = "Manage your job posts: publish, close, edit or duplicate a listing.";

export const Route = createFileRoute("/_authenticated/employer/jobs/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: EmployerJobsPage,
});

const statusTone: Record<JobStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  published: "default",
  closed: "outline",
  archived: "destructive",
};

function EmployerJobsPage() {
  const { data: company } = useEmployerCompany();
  const { data: jobs = [], isPending } = useEmployerJobs(company?.id);
  const { data: applicationCounts } = useJobApplicationCounts(jobs.map((j) => j.id));
  const setStatus = useSetJobStatus();
  const deleteJob = useDeleteJob();
  const duplicateJob = useDuplicateJob();
  const [pendingDelete, setPendingDelete] = useState<Job | null>(null);

  const transition = async (job: Job, status: JobStatus) => {
    if (!company) return;
    try {
      await setStatus.mutateAsync({ id: job.id, companyId: company.id, status });
      toast.success(`"${job.title}" is now ${status}.`);
    } catch {
      toast.error("That update didn't go through. Please try again.");
    }
  };

  const duplicate = async (job: Job) => {
    if (!company) return;
    try {
      await duplicateJob.mutateAsync({ id: job.id, companyId: company.id });
      toast.success(`Duplicated "${job.title}" as a new draft.`);
    } catch {
      toast.error("Couldn't duplicate this job. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !company) return;
    try {
      await deleteJob.mutateAsync({ id: pendingDelete.id, companyId: company.id });
      toast.success(`Deleted "${pendingDelete.title}".`);
    } catch {
      toast.error("Couldn't delete this job. Please try again.");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <DashboardHeader
        title="My Jobs"
        description="Every role you've posted, and its current status."
        action={
          <Button asChild>
            <Link to="/employer/post-job">
              <PlusCircle className="size-4" /> Post a job
            </Link>
          </Button>
        }
      />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="You haven't posted any jobs yet"
          description="Create your first job post to start reaching candidates."
          action={
            <Button asChild>
              <Link to="/employer/post-job">Post a job</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: job.id }}
                      className="hover:text-primary"
                    >
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusTone[job.status ?? "draft"]} className="capitalize">
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{job.location}</TableCell>
                  <TableCell className="text-muted-foreground">{job.type}</TableCell>
                  <TableCell>
                    {(applicationCounts?.get(job.id)?.total ?? 0) > 0 ? (
                      <Link
                        to="/employer/applications"
                        search={{ jobId: job.id }}
                        className="text-primary hover:underline"
                      >
                        {applicationCounts?.get(job.id)?.total} applicant
                        {applicationCounts?.get(job.id)?.total === 1 ? "" : "s"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0 applicants</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.status === "published" || job.status === "closed"
                      ? formatDate(job.postedAt)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${job.title}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/employer/jobs/$jobId/edit" params={{ jobId: job.id }}>
                            <Pencil className="size-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/employer/jobs/$jobId/pipeline" params={{ jobId: job.id }}>
                            <Kanban className="size-4" /> Pipeline
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(job)}>
                          <Copy className="size-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {job.status === "draft" && (
                          <DropdownMenuItem onClick={() => transition(job, "published")}>
                            Publish
                          </DropdownMenuItem>
                        )}
                        {job.status === "published" && (
                          <>
                            <DropdownMenuItem onClick={() => transition(job, "draft")}>
                              Unpublish (return to draft)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => transition(job, "closed")}>
                              Close
                            </DropdownMenuItem>
                          </>
                        )}
                        {job.status === "closed" && (
                          <DropdownMenuItem onClick={() => transition(job, "published")}>
                            Re-publish
                          </DropdownMenuItem>
                        )}
                        {(job.status === "published" || job.status === "closed") && (
                          <DropdownMenuItem onClick={() => transition(job, "archived")}>
                            Archive
                          </DropdownMenuItem>
                        )}
                        {(job.status === "draft" || job.status === "archived") && (
                          <DropdownMenuItem
                            onClick={() => setPendingDelete(job)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the job post. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
