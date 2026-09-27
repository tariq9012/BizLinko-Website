import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/common/Tag";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { SectionHeader } from "@/components/common/SectionHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { JobCard } from "@/components/jobs/JobCard";
import { getCategoryName } from "@/data/categories";
import { formatPostedDate, formatSalary } from "@/lib/format";
import { useJob, useSimilarJobs, jobQueryOptions } from "@/features/jobs/queries";
import { useHasApplied } from "@/features/applications/queries";
import { useIsJobSaved } from "@/features/saved-jobs/queries";
import { useSaveJob, useUnsaveJob } from "@/features/saved-jobs/mutations";
import { useAuth } from "@/hooks/useAuth";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { JOB_REPORT_REASONS } from "@/features/admin/types";
import type { Job } from "@/types";

export const Route = createFileRoute("/jobs/$jobId")({
  // Pre-fetches with the exact same query the page uses (jobQueryOptions),
  // so this never causes a second/duplicate fetch — it's purely what lets
  // head() below build real title/description/JSON-LD before first paint,
  // instead of every job detail page sharing one generic title.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(jobQueryOptions(params.jobId)),
  head: ({ loaderData }) => buildJobHead(loaderData as Job | null),
  component: JobDetailsPage,
});

function buildJobHead(job: Job | null) {
  if (!job) {
    return {
      meta: [{ title: "Job not found — BizLinko" }, { name: "robots", content: "noindex" }],
    };
  }
  const title = `${job.title} at ${job.companyName} — BizLinko`;
  const description = (job.summary ?? `${job.title} at ${job.companyName}. ${job.location}.`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  // Only real, stored fields go into JSON-LD — never fabricated salary,
  // location, or employment type (Phase 11 item 33).
  const jobPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.summary ?? job.title,
    datePosted: job.postedAt,
    employmentType: mapEmploymentTypeToSchema(job.type),
    hiringOrganization: { "@type": "Organization", name: job.companyName },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    },
  };
  if (job.applicationDeadline) jobPosting["validThrough"] = job.applicationDeadline;
  if (job.workMode === "Remote") jobPosting["jobLocationType"] = "TELECOMMUTE";
  if (!job.hideSalary && (job.salaryMin || job.salaryMax)) {
    jobPosting["baseSalary"] = {
      "@type": "MonetaryAmount",
      currency: job.currency,
      value: {
        "@type": "QuantitativeValue",
        ...(job.salaryMin ? { minValue: job.salaryMin } : {}),
        ...(job.salaryMax ? { maxValue: job.salaryMax } : {}),
        unitText: mapSalaryPeriodToSchema(job.salaryPeriod),
      },
    };
  }

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
    scripts: [{ attrs: { type: "application/ld+json" }, children: JSON.stringify(jobPosting) }],
  };
}

function mapEmploymentTypeToSchema(type: Job["type"]): string {
  switch (type) {
    case "Full-time":
      return "FULL_TIME";
    case "Part-time":
      return "PART_TIME";
    case "Contract":
      return "CONTRACTOR";
    case "Internship":
      return "INTERN";
    default:
      return "OTHER";
  }
}

function mapSalaryPeriodToSchema(period: Job["salaryPeriod"]): string {
  switch (period) {
    case "hour":
      return "HOUR";
    case "month":
      return "MONTH";
    default:
      return "YEAR";
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function JobDetailsPage() {
  const { jobId } = Route.useParams();
  const { data: job, isPending, isError } = useJob(jobId);
  const { data: related = [] } = useSimilarJobs(job);
  const { isAuthenticated, role, currentUser } = useAuth();
  const { data: existingApplication, isPending: applyStatusPending } = useHasApplied(job?.id);
  const { data: isSaved = false } = useIsJobSaved(job?.id);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const handleToggleSave = () => {
    if (!isAuthenticated) {
      toast("Please sign in to save jobs.");
      return;
    }
    if (role !== "job_seeker" || !currentUser || !job) return;
    if (isSaved) {
      unsaveJob.mutate({ jobId: job.id, userId: currentUser.id });
    } else {
      saveJob.mutate({ jobId: job.id, userId: currentUser.id });
    }
  };

  const isPastDeadline =
    !!job?.applicationDeadline &&
    new Date(job.applicationDeadline) < new Date(new Date().toDateString());
  const jobIsOpen = job?.status === "published" && !isPastDeadline;

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Job not found"
          description="This job may have been closed, removed, or the link is incorrect."
          action={
            <Button variant="outline" asChild>
              <Link to="/jobs">Browse all jobs</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const applyButton = !jobIsOpen ? (
    <Button size="lg" className="w-full" disabled>
      {job.status === "closed" ? "Applications Closed" : "Not Accepting Applications"}
    </Button>
  ) : !isAuthenticated ? (
    <Button size="lg" className="w-full" asChild>
      <Link to="/login" search={{ redirect: `/jobs/${job.id}/apply` }}>
        Apply Now
      </Link>
    </Button>
  ) : role !== "job_seeker" ? (
    <Button size="lg" className="w-full" disabled title="Only job seekers can apply to jobs">
      Apply Now
    </Button>
  ) : applyStatusPending ? (
    <Button size="lg" className="w-full" disabled>
      <Loader2 className="size-4 animate-spin" />
    </Button>
  ) : existingApplication ? (
    <div className="space-y-2">
      <Button size="lg" className="w-full" disabled variant="secondary">
        <CheckCircle2 className="size-4" /> Already Applied
      </Button>
      <Button variant="outline" size="lg" className="w-full" asChild>
        <Link
          to="/job-seeker/applications/$applicationId"
          params={{ applicationId: existingApplication.id }}
        >
          View Application
        </Link>
      </Button>
    </div>
  ) : (
    <Button size="lg" className="w-full" asChild>
      <Link to="/jobs/$jobId/apply" params={{ jobId: job.id }}>
        Apply Now
      </Link>
    </Button>
  );

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8 md:py-12">
          <nav className="mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/jobs" className="hover:text-primary">
              Jobs
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{job.title}</span>
          </nav>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <LogoPlaceholder name={job.companyName} size="lg" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{job.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{job.companyName}</span> ·{" "}
                {job.location}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.status && job.status !== "published" && (
                  <Tag tone="warning">{job.status === "draft" ? "Draft" : job.status}</Tag>
                )}
                <Tag tone="primary">
                  <Briefcase className="size-3.5" /> {job.type}
                </Tag>
                <Tag>
                  <MapPin className="size-3.5" /> {job.workMode}
                </Tag>
                <Tag>
                  <TrendingUp className="size-3.5" /> {job.experience} level
                </Tag>
                {!job.hideSalary && (
                  <Tag tone="success">
                    <Wallet className="size-3.5" /> {formatSalary(job)}
                  </Tag>
                )}
                <Tag>
                  <Clock className="size-3.5" /> {formatPostedDate(job.postedAt)}
                </Tag>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-24 pt-8 md:py-12 lg:pb-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-foreground">About the Job</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{job.summary}</p>
            </section>
            {job.responsibilities.length > 0 && (
              <Section title="Responsibilities">
                <List items={job.responsibilities} />
              </Section>
            )}
            {job.requirements.length > 0 && (
              <Section title="Requirements">
                <List items={job.requirements} />
              </Section>
            )}
            {!!job.qualifications?.length && (
              <Section title="Qualifications">
                <List items={job.qualifications} />
              </Section>
            )}
            {job.skills.length > 0 && (
              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <Tag key={s} tone="primary">
                      {s}
                    </Tag>
                  ))}
                </div>
              </Section>
            )}
            {job.benefits.length > 0 && (
              <Section title="Benefits">
                <List items={job.benefits} />
              </Section>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              {applyButton}
              <Button
                variant="outline"
                size="lg"
                className="mt-3 w-full"
                onClick={handleToggleSave}
                disabled={
                  (isAuthenticated && role !== "job_seeker") ||
                  saveJob.isPending ||
                  unsaveJob.isPending
                }
              >
                <Bookmark className={isSaved ? "size-4 fill-primary text-primary" : "size-4"} />
                {isSaved ? "Saved" : "Save Job"}
              </Button>

              <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                {[
                  ["Job type", job.type],
                  ["Work mode", job.workMode],
                  ["Experience", job.experience],
                  ["Category", job.categoryName ?? getCategoryName(job.category)],
                  ["Salary", job.hideSalary ? "Not disclosed" : formatSalary(job)],
                  ["Location", job.location],
                  ...(job.applicationDeadline
                    ? [["Apply by", new Date(job.applicationDeadline).toLocaleDateString()]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {isAuthenticated && (
              <div className="flex justify-center">
                <ReportDialog
                  entityType="job"
                  entityId={job.id}
                  targetLabel="this job"
                  reasons={JOB_REPORT_REASONS}
                />
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="size-4 text-primary" /> Company
              </p>
              {job.companySlug ? (
                <Link
                  to="/companies/$companySlug"
                  params={{ companySlug: job.companySlug }}
                  className="mt-3 block text-sm font-medium text-primary hover:underline"
                >
                  View {job.companyName} profile
                </Link>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{job.companyName}</p>
              )}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-14">
            <SectionHeader title="Similar Jobs" description="Other roles you may be a fit for." />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {related.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Mobile-only sticky Apply bar (lg: sidebar Apply button is already
          visible without scrolling at that width). Public route — no
          authenticated bottom nav to collide with here, but still adds
          the same safe-area padding for phones with a home indicator. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {applyButton}
      </div>
    </>
  );
}
