import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSavedJobs } from "@/features/saved-jobs/queries";
import { useUnsaveJob } from "@/features/saved-jobs/mutations";
import { formatSalary } from "@/lib/format";

const title = "Saved Jobs — BizLinko";

export const Route = createFileRoute("/_authenticated/job-seeker/saved-jobs")({
  head: () => ({ meta: [{ title }] }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const { currentUser } = useAuth();
  const { data: savedJobs = [], isPending } = useSavedJobs();
  const unsaveJob = useUnsaveJob();

  const handleRemove = async (jobId: string) => {
    if (!currentUser) return;
    try {
      await unsaveJob.mutateAsync({ jobId, userId: currentUser.id });
      toast.success("Removed from saved jobs.");
    } catch {
      toast.error("Couldn't remove this job. Please try again.");
    }
  };

  return (
    <>
      <DashboardHeader title="Saved Jobs" description="Roles you've bookmarked to revisit." />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : savedJobs.length === 0 ? (
        <EmptyState
          title="You haven't saved any jobs yet"
          description="Tap the bookmark icon on a job to save it here."
          action={
            <Button asChild>
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {savedJobs.map(({ job, savedAt }) => (
            <div
              key={job.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <LogoPlaceholder name={job.companyName} />
                <div>
                  <p className="font-medium text-foreground">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.companyName} · {job.location} · {job.type} · {job.workMode}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {job.status !== "published" && <Tag tone="warning">Closed</Tag>}
                    {!job.hideSalary && (
                      <span className="text-xs text-muted-foreground">{formatSalary(job)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Saved {new Date(savedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {job.status === "published" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/jobs/$jobId/apply" params={{ jobId: job.id }}>
                      Apply
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
                    View Job
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(job.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
