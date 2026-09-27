import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJob } from "@/features/jobs/queries";
import { usePipelineApplications } from "@/features/interviews/queries";
import { useUpdateApplicationStatus } from "@/features/applications/mutations";
import {
  EMPLOYER_ALLOWED_TRANSITIONS,
  PIPELINE_STAGES,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/features/applications/status";
import type { ApplicationStatus } from "@/features/applications/types";

export const Route = createFileRoute("/_authenticated/employer/jobs/$jobId_/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — BizLinko" }] }),
  component: PipelinePage,
});

interface PipelineRow {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  profiles: { first_name: string | null; last_name: string | null; headline: string | null } | null;
  resumes: { id: string; name: string } | null;
}

function PipelinePage() {
  const { jobId } = Route.useParams();
  const { data: job } = useJob(jobId);
  const { data: applications, isPending, isError } = usePipelineApplications(jobId);
  const updateStatus = useUpdateApplicationStatus();
  const [movingId, setMovingId] = useState<string | null>(null);

  const rows = useMemo(() => (applications ?? []) as unknown as PipelineRow[], [applications]);

  const byStage = useMemo(() => {
    const map = new Map<ApplicationStatus, PipelineRow[]>();
    for (const stage of PIPELINE_STAGES) map.set(stage, []);
    for (const row of rows) {
      if (map.has(row.status)) map.get(row.status)!.push(row);
    }
    return map;
  }, [rows]);

  const handleMove = async (applicationId: string, status: ApplicationStatus) => {
    setMovingId(applicationId);
    try {
      await updateStatus.mutateAsync({ applicationId, status });
      toast.success(`Moved to ${STATUS_LABELS[status]}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That move isn't allowed.");
    } finally {
      setMovingId(null);
    }
  };

  return (
    <>
      <DashboardHeader
        title={job ? `Pipeline — ${job.title}` : "Pipeline"}
        description="Move candidates through your hiring stages."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/employer/jobs/$jobId/matches" params={{ jobId }}>
                <Users className="size-4" /> Find Matching Candidates
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/employer/applications" search={{ jobId }}>
                List view
              </Link>
            </Button>
          </div>
        }
      />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <EmptyState
          title="We couldn't load the pipeline"
          description="Please refresh and try again."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No candidates are currently in this pipeline"
          description="Once candidates apply, they'll show up here."
        />
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageRows = byStage.get(stage) ?? [];
            return (
              <div key={stage} className="w-72 shrink-0 snap-start">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-foreground">{STATUS_LABELS[stage]}</p>
                  <span className="text-xs text-muted-foreground">{stageRows.length}</span>
                </div>
                <div className="min-h-[80px] space-y-2 rounded-xl bg-secondary/50 p-2">
                  {stageRows.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No candidates in this stage.
                    </p>
                  ) : (
                    stageRows.map((row) => {
                      const name =
                        `${row.profiles?.first_name ?? ""} ${row.profiles?.last_name ?? ""}`.trim() ||
                        "Applicant";
                      const transitions = EMPLOYER_ALLOWED_TRANSITIONS[row.status];
                      return (
                        <div
                          key={row.id}
                          className="rounded-lg border border-border bg-card p-3 shadow-sm"
                        >
                          <Link
                            to="/employer/applications/$applicationId"
                            params={{ applicationId: row.id }}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {name}
                          </Link>
                          {row.profiles?.headline && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {row.profiles.headline}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Applied {new Date(row.applied_at).toLocaleDateString()}
                          </p>
                          {row.resumes && <Tag className="mt-2">Resume attached</Tag>}
                          {transitions.length > 0 && (
                            <Select
                              value=""
                              onValueChange={(v) => handleMove(row.id, v as ApplicationStatus)}
                              disabled={movingId === row.id}
                            >
                              <SelectTrigger
                                className="mt-2 h-8 text-xs"
                                aria-label={`Move ${name} to a new stage`}
                              >
                                <SelectValue placeholder="Move to…" />
                              </SelectTrigger>
                              <SelectContent>
                                {transitions.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {STATUS_LABELS[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
