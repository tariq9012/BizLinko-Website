import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Phone, MapPinned, Video } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Tag } from "@/components/common/Tag";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import { useEmployerInterviews } from "@/features/interviews/queries";
import type { InterviewWithContext } from "@/features/interviews/types";

const title = "Interviews — BizLinko";

export const Route = createFileRoute("/_authenticated/employer/interviews")({
  head: () => ({ meta: [{ title }] }),
  component: EmployerInterviewsPage,
});

const METHOD_ICON = { video: Video, phone: Phone, onsite: MapPinned };

type Tab = "upcoming" | "completed" | "cancelled";

function InterviewRow({ interview }: { interview: InterviewWithContext }) {
  const Icon = METHOD_ICON[interview.interviewMethod];
  return (
    <Link
      to="/employer/applications/$applicationId"
      params={{ applicationId: interview.applicationId }}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="break-words font-medium text-foreground">
            {interview.title} — {interview.candidateName}
          </p>
          <p className="break-words text-xs text-muted-foreground">
            {interview.jobTitle} · {interview.companyName}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(interview.scheduledAt).toLocaleString()} ({interview.timezone}) ·{" "}
            {interview.durationMinutes} min
          </p>
        </div>
      </div>
      <Tag
        tone={
          interview.status === "completed"
            ? "success"
            : interview.status === "cancelled"
              ? "neutral"
              : "primary"
        }
      >
        {interview.status}
      </Tag>
    </Link>
  );
}

function EmployerInterviewsPage() {
  const { data: company } = useEmployerCompany();
  const { data: interviews = [], isPending, isError } = useEmployerInterviews(company?.id);
  const [tab, setTab] = useState<Tab>("upcoming");

  const now = Date.now();
  const grouped = useMemo(
    () => ({
      upcoming: interviews.filter(
        (i) => i.status === "scheduled" && new Date(i.scheduledAt).getTime() >= now,
      ),
      completed: interviews.filter(
        (i) =>
          i.status === "completed" ||
          (i.status === "scheduled" && new Date(i.scheduledAt).getTime() < now),
      ),
      cancelled: interviews.filter((i) => i.status === "cancelled"),
    }),
    [interviews, now],
  );

  const shown = grouped[tab];

  return (
    <>
      <DashboardHeader
        title="Interviews"
        description="Every interview scheduled across your jobs."
      />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <EmptyState
          title="We couldn't load interviews"
          description="Please refresh and try again."
        />
      ) : interviews.length === 0 ? (
        <EmptyState
          title="No interviews scheduled yet"
          description="Schedule one from an applicant's detail page."
          action={
            <Button variant="outline" asChild>
              <Link to="/employer/applications">Go to applicants</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({grouped.upcoming.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({grouped.completed.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({grouped.cancelled.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6 space-y-3">
            {shown.length === 0 ? (
              <EmptyState title={`No ${tab} interviews`} description="Nothing to show here yet." />
            ) : (
              shown.map((i) => <InterviewRow key={i.id} interview={i} />)
            )}
          </div>
        </>
      )}
    </>
  );
}
