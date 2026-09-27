import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/button";
import { useFeaturedJobs } from "@/features/jobs/queries";

export function FeaturedJobs() {
  const { data: jobs = [], isPending } = useFeaturedJobs(6);

  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeader
          eyebrow="Hand-picked"
          title="Featured Jobs"
          description="Explore opportunities from companies hiring now."
          action={
            <Button variant="outline" asChild>
              <Link to="/jobs">
                View All Jobs
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
