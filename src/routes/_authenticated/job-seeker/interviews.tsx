import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Phone, MapPinned, Video } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCandidateInterviews } from "@/features/interviews/queries";
import type { InterviewWithContext } from "@/features/interviews/types";

const title = "My Interviews — BizLinko";

export const Route = createFileRoute("/_authenticated/job-seeker/interviews")({
  head: () => ({ meta: [{ title }] }),
  component: JobSeekerInterviewsPage,
});

const METHOD_ICON = { video: Video, phone: Phone, onsite: MapPinned };

type Tab = "upcoming" | "past" | "cancelled";

function InterviewCard({ interview }: { interview: InterviewWithContext }) {
  const Icon = METHOD_ICON[interview.interviewMethod];
  const isUpcoming =
    interview.status === "scheduled" && new Date(interview.scheduledAt) >= new Date();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="break-words font-medium text-foreground">{interview.title}</p>
            <p className="break-words text-xs text-muted-foreground">
              {interview.jobTitle} · {interview.companyName}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(interview.scheduledAt).toLocaleString()} ({interview.timezone}) ·{" "}
              {interview.durationMinutes} min
            </p>
            {interview.status === "cancelled" && interview.cancellationReason && (
              <p className="mt-1 text-xs text-muted-foreground">
                Reason: {interview.cancellationReason}
              </p>
            )}
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
      </div>

      {isUpcoming && (
        <div className="mt-3 border-t border-border pt-3">
          {interview.interviewMethod === "video" && interview.meetingUrl && (
            <Button size="sm" asChild>
              <a href={interview.meetingUrl} target="_blank" rel="noreferrer noopener">
                Join Interview
              </a>
            </Button>
          )}
          {interview.interviewMethod === "onsite" && interview.location && (
            <p className="text-sm text-muted-foreground">Location: {interview.location}</p>
          )}
          {interview.interviewMethod === "phone" && (
            <p className="text-sm text-muted-foreground">
              The employer will call you at your scheduled time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function JobSeekerInterviewsPage() {
  const { currentUser } = useAuth();
  const { data: interviews = [], isPending, isError } = useCandidateInterviews(currentUser?.id);
  const [tab, setTab] = useState<Tab>("upcoming");

  const grouped = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: interviews.filter(
        (i) => i.status === "scheduled" && new Date(i.scheduledAt).getTime() >= now,
      ),
      past: interviews.filter(
        (i) =>
          i.status === "completed" ||
          (i.status === "scheduled" && new Date(i.scheduledAt).getTime() < now),
      ),
      cancelled: interviews.filter((i) => i.status === "cancelled"),
    };
  }, [interviews]);

  const shown = grouped[tab];

  return (
    <>
      <DashboardHeader
        title="My Interviews"
        description="Interviews scheduled by employers you applied to."
      />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <EmptyState
          title="We couldn't load your interviews"
          description="Please refresh and try again."
        />
      ) : interviews.length === 0 ? (
        <EmptyState
          title="No interviews scheduled yet"
          description="When an employer schedules an interview, it'll show up here."
          action={
            <Button variant="outline" asChild>
              <Link to="/job-seeker/applications">View my applications</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({grouped.upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({grouped.past.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({grouped.cancelled.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6 space-y-3">
            {shown.length === 0 ? (
              <EmptyState title={`No ${tab} interviews`} description="Nothing to show here yet." />
            ) : (
              shown.map((i) => <InterviewCard key={i.id} interview={i} />)
            )}
          </div>
        </>
      )}
    </>
  );
}
