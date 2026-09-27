import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/button";
import { useRecentJobs } from "@/features/jobs/queries";

export function RecentJobs() {
  const { data: jobs = [], isPending } = useRecentJobs(6);

  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <SectionHeader
          eyebrow="Fresh this week"
          title="Latest Opportunities"
          description="The newest roles added to BizLinko."
          action={
            <Button variant="outline" asChild>
              <Link to="/jobs">
                Browse All Jobs
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
