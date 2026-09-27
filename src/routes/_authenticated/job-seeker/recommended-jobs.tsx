import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Search, Sparkles, UserCog } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/jobs/RecommendationCard";
import { useAuth } from "@/hooks/useAuth";
import {
  useRecommendedJobs,
  useRecommendationProfileSufficient,
} from "@/features/recommendations/queries";

const title = "Recommended for you — BizLinko";

export const Route = createFileRoute("/_authenticated/job-seeker/recommended-jobs")({
  head: () => ({ meta: [{ title }] }),
  component: RecommendedJobsPage,
});

function RecommendedJobsPage() {
  const { currentUser } = useAuth();
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useRecommendedJobs(currentUser?.id);
  const { data: profileSufficient = true, isPending: sufficiencyPending } =
    useRecommendationProfileSufficient(currentUser?.id);

  const jobs = data?.pages.flatMap((p) => p.jobs) ?? [];

  return (
    <>
      <DashboardHeader
        title="Recommended for you"
        description="Ranked using your skills, experience, saved jobs and applications — never AI, always explainable."
      />

      {isPending || sufficiencyPending ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load recommendations" description="Please try again." />
      ) : jobs.length === 0 && !profileSufficient ? (
        <EmptyState
          title="Add a bit more to your profile to see recommendations"
          description="We use your skills, headline and experience to find roles worth showing you — none of that is filled in yet."
          action={
            <Button asChild>
              <Link to="/job-seeker/profile">
                <UserCog className="size-4" /> Complete your profile
              </Link>
            </Button>
          }
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No new job recommendations right now"
          description="Your profile looks good — we just don't have a fresh match for you at the moment. Check back soon, or browse everything that's open."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/jobs">
                  <Search className="size-4" /> Browse jobs
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            {jobs.map((job) => (
              <RecommendationCard key={job.jobId} job={job} />
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
