import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyApplications } from "@/features/applications/queries";
import { ALL_STATUSES, STATUS_LABELS, STATUS_TONE } from "@/features/applications/status";
import type { ApplicationStatus } from "@/features/applications/types";

const title = "My Applications — BizLinko";

export const Route = createFileRoute("/_authenticated/job-seeker/applications")({
  head: () => ({ meta: [{ title }] }),
  component: ApplicationsPage,
});

type Tab = "all" | ApplicationStatus;

function ApplicationsPage() {
  const { data: applications = [], isPending } = useMyApplications();
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: applications.length } as Record<Tab, number>;
    for (const s of ALL_STATUSES) c[s] = applications.filter((a) => a.status === s).length;
    return c;
  }, [applications]);

  const filtered = tab === "all" ? applications : applications.filter((a) => a.status === tab);

  return (
    <>
      <DashboardHeader
        title="My Applications"
        description="Track the status of every job you've applied to."
      />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="When you apply to a job, it'll show up here."
          action={
            <Button asChild>
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              {ALL_STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {STATUS_LABELS[s]} ({counts[s]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={`No ${tab === "all" ? "" : STATUS_LABELS[tab as ApplicationStatus].toLowerCase()} applications`}
                description="Try a different tab."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filtered.map((app) => (
                <Link
                  key={app.id}
                  to="/job-seeker/applications/$applicationId"
                  params={{ applicationId: app.id }}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <LogoPlaceholder name={app.companyName} size="sm" />
                    <div>
                      <p className="font-medium text-foreground">{app.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.companyName} · {app.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <Tag tone={STATUS_TONE[app.status]}>{STATUS_LABELS[app.status]}</Tag>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
