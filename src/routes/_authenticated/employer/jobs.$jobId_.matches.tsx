import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { CandidateCard } from "@/components/candidates/CandidateCard";
import { useJob } from "@/features/jobs/queries";
import { explainMatch, useMatchingCandidates } from "@/features/candidates/queries";

export const Route = createFileRoute("/_authenticated/employer/jobs/$jobId_/matches")({
  head: () => ({ meta: [{ title: "Matching Candidates — BizLinko" }] }),
  component: MatchingCandidatesPage,
});

function MatchingCandidatesPage() {
  const { jobId } = Route.useParams();
  const { data: job } = useJob(jobId);
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMatchingCandidates(jobId);

  const rows = data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link to="/employer/jobs/$jobId/pipeline" params={{ jobId }}>
          <ArrowLeft className="size-4" /> Back to pipeline
        </Link>
      </Button>

      <DashboardHeader
        title={job ? `Matching candidates — ${job.title}` : "Matching candidates"}
        description="Discovery assistance only — this never changes application status, sends a message, or schedules anything. Only candidates who've chosen to be discoverable appear here."
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load matching candidates" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No discoverable candidates match this role yet"
          description="Most job seekers keep employer discovery off by default, so results depend on who has opted in."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <CandidateCard
                key={c.candidateId}
                candidate={c}
                matchReasons={explainMatch(c)}
                detailHref={`/employer/candidates/${c.candidateId}`}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
