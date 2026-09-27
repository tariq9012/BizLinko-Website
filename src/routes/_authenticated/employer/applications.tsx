import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Input } from "@/components/ui/input";
import { Tag } from "@/components/common/Tag";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import { useEmployerJobs } from "@/features/jobs/queries";
import {
  useEmployerApplications,
  type EmployerApplicationsFilters,
} from "@/features/applications/queries";
import { ALL_STATUSES, STATUS_LABELS, STATUS_TONE } from "@/features/applications/status";
import type { ApplicationStatus } from "@/features/applications/types";

const title = "Applicants — BizLinko";

type ApplicationsSearch = { jobId?: string | undefined };

export const Route = createFileRoute("/_authenticated/employer/applications")({
  validateSearch: (search: Record<string, unknown>): ApplicationsSearch => ({
    jobId: typeof search["jobId"] === "string" ? (search["jobId"] as string) : undefined,
  }),
  head: () => ({ meta: [{ title }] }),
  component: EmployerApplicationsPage,
});

function EmployerApplicationsPage() {
  const { jobId: initialJobId } = Route.useSearch();
  const { data: company } = useEmployerCompany();
  const { data: jobs = [] } = useEmployerJobs(company?.id);
  const [filters, setFilters] = useState<EmployerApplicationsFilters>({ jobId: initialJobId });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const effectiveFilters: EmployerApplicationsFilters = { ...filters, search: search || undefined };
  const { data, isPending, isError } = useEmployerApplications(
    jobs.map((j) => j.id),
    effectiveFilters,
    page,
  );
  const applications = data?.applications ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 10));

  const updateFilters = (patch: Partial<EmployerApplicationsFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <DashboardHeader title="Applicants" description="Everyone who has applied to your jobs." />

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Search applicant name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={filters.jobId ?? "all"}
          onValueChange={(v) => updateFilters({ jobId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) =>
            updateFilters({ status: v === "all" ? undefined : (v as ApplicationStatus) })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <EmptyState
          title="We couldn't load applicants"
          description="Something went wrong. Please refresh and try again."
        />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applicants yet"
          description="Once candidates apply to your jobs, they'll show up here."
        />
      ) : (
        <>
          <div className="space-y-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                to="/employer/applications/$applicationId"
                params={{ applicationId: app.id }}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{app.applicantName}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied for {app.jobTitle} · {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <Tag tone={STATUS_TONE[app.status]}>{STATUS_LABELS[app.status]}</Tag>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </>
  );
}
