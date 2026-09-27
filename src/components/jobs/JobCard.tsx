import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Briefcase, Clock, Loader2, MapPin, TrendingUp, Wallet } from "lucide-react";
import type { Job } from "@/types";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Tag } from "@/components/common/Tag";
import { formatPostedDate, formatSalary } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsJobSaved } from "@/features/saved-jobs/queries";
import { useSaveJob, useUnsaveJob } from "@/features/saved-jobs/mutations";

export function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { currentUser, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: saved = false, isPending: savedPending } = useIsJobSaved(job.id);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const isToggling = saveJob.isPending || unsaveJob.isPending;

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      void navigate({ to: "/login", search: { redirect: `/jobs/${job.id}` } });
      return;
    }
    if (role !== "job_seeker" || !currentUser) return;
    if (saved) {
      unsaveJob.mutate({ jobId: job.id, userId: currentUser.id });
    } else {
      saveJob.mutate({ jobId: job.id, userId: currentUser.id });
    }
  };

  return (
    <article className="group relative rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start gap-4">
        <LogoPlaceholder name={job.companyName} />
        <div className="min-w-0 flex-1">
          <h3 className="pr-8 text-base font-semibold leading-snug text-foreground sm:text-lg">
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="before:absolute before:inset-0 hover:text-primary"
            >
              {job.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.companyName} · {job.location}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Tag tone="primary">
              <Briefcase className="size-3.5" /> {job.type}
            </Tag>
            <Tag>
              <MapPin className="size-3.5" /> {job.workMode}
            </Tag>
            <Tag>
              <TrendingUp className="size-3.5" /> {job.experience}
            </Tag>
            {!compact && !job.hideSalary && (
              <Tag tone="success">
                <Wallet className="size-3.5" /> {formatSalary(job)}
              </Tag>
            )}
          </div>

          {compact && !job.hideSalary && (
            <p className="mt-3 text-sm font-medium text-foreground">{formatSalary(job)}</p>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {formatPostedDate(job.postedAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggleSave}
        disabled={(isAuthenticated && role !== "job_seeker") || isToggling || savedPending}
        aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
        aria-pressed={saved}
        title={
          isAuthenticated && role !== "job_seeker" ? "Only job seekers can save jobs" : undefined
        }
        className="absolute right-4 top-4 z-10 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isToggling ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
        )}
      </button>
    </article>
  );
}
