import { Link } from "@tanstack/react-router";
import { Bookmark, MapPin, Sparkles } from "lucide-react";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import { formatPostedDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useIsJobSaved } from "@/features/saved-jobs/queries";
import { useSaveJob, useUnsaveJob } from "@/features/saved-jobs/mutations";
import { explainRecommendation, type RecommendedJob } from "@/features/recommendations/queries";

function formatSalaryRange(min: number | null, max: number | null, period: string) {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
  const range = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt((min ?? max)!);
  return `${range} / ${period}`;
}

export function RecommendationCard({ job }: { job: RecommendedJob }) {
  const { currentUser, isAuthenticated } = useAuth();
  const { data: saved = false } = useIsJobSaved(job.jobId);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const reasons = explainRecommendation(job);
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryPeriod);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !currentUser) return;
    if (saved || job.alreadySaved) {
      unsaveJob.mutate({ jobId: job.jobId, userId: currentUser.id });
    } else {
      saveJob.mutate({ jobId: job.jobId, userId: currentUser.id });
    }
  };

  return (
    <article className="group relative rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start gap-4">
        <LogoPlaceholder name={job.companyName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="pr-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
              <Link to="/jobs/$jobId" params={{ jobId: job.jobId }} className="hover:text-primary">
                {job.title}
              </Link>
            </h3>
            <button
              type="button"
              onClick={toggleSave}
              aria-label={saved || job.alreadySaved ? "Unsave job" : "Save job"}
              className="shrink-0 text-muted-foreground hover:text-primary"
            >
              <Bookmark
                className={
                  saved || job.alreadySaved ? "size-5 fill-primary text-primary" : "size-5"
                }
              />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{job.companyName}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.city && (
              <Tag>
                <MapPin className="size-3.5" /> {job.city}
              </Tag>
            )}
            <Tag>{job.workplaceType}</Tag>
            <Tag>{job.employmentType}</Tag>
            {salary && <Tag>{salary}</Tag>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {reasons.slice(0, 3).map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
              >
                <Sparkles className="size-3" /> {r}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {job.publishedAt ? formatPostedDate(job.publishedAt) : ""}
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link to="/jobs/$jobId" params={{ jobId: job.jobId }}>
                View job
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
