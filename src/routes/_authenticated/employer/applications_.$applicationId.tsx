import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Video,
  Phone,
  MapPinned,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useEmployerApplication,
  useApplicationStatusHistory,
} from "@/features/applications/queries";
import { useUpdateApplicationStatus } from "@/features/applications/mutations";
import {
  EMPLOYER_ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  STATUS_TONE,
  canScheduleInterview,
} from "@/features/applications/status";
import type { ApplicationStatus } from "@/features/applications/types";
import { useResume } from "@/features/resumes/queries";
import { getResumeSignedUrl } from "@/features/resumes/storage";
import { useApplicationInterviews } from "@/features/interviews/queries";
import {
  useCancelInterview,
  useCompleteInterview,
  useRescheduleInterview,
  useScheduleInterview,
} from "@/features/interviews/mutations";
import { InterviewDialog } from "@/features/interviews/InterviewDialog";
import type { Interview } from "@/features/interviews/types";
import type { InterviewFormValues } from "@/features/interviews/schemas";
import { useFindOrCreateConversation } from "@/features/messaging/mutations";

export const Route = createFileRoute("/_authenticated/employer/applications_/$applicationId")({
  head: () => ({ meta: [{ title: "Applicant — BizLinko" }] }),
  component: ApplicantDetailPage,
});

const METHOD_ICON = { video: Video, phone: Phone, onsite: MapPinned };

function InterviewCard({ interview }: { interview: Interview }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const cancelInterview = useCancelInterview();
  const completeInterview = useCompleteInterview();
  const rescheduleInterview = useRescheduleInterview();
  const Icon = METHOD_ICON[interview.interviewMethod];

  const handleCancel = async () => {
    try {
      await cancelInterview.mutateAsync({
        interviewId: interview.id,
        applicationId: interview.applicationId,
        reason,
      });
      toast.success("Interview cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel this interview.");
    } finally {
      setCancelOpen(false);
      setReason("");
    }
  };

  const handleComplete = async () => {
    try {
      await completeInterview.mutateAsync({
        interviewId: interview.id,
        applicationId: interview.applicationId,
      });
      toast.success("Marked as completed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this interview.");
    }
  };

  const handleReschedule = async (values: InterviewFormValues) => {
    try {
      await rescheduleInterview.mutateAsync({
        interviewId: interview.id,
        applicationId: interview.applicationId,
        values,
      });
      toast.success("Interview rescheduled.");
      setRescheduleOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reschedule this interview.");
    }
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="break-words font-medium text-foreground">{interview.title}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(interview.scheduledAt).toLocaleString()} ({interview.timezone}) ·{" "}
              {interview.durationMinutes} min
            </p>
            {interview.meetingUrl && (
              <a
                href={interview.meetingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="break-all text-sm text-primary hover:underline"
              >
                {interview.meetingUrl}
              </a>
            )}
            {interview.location && (
              <p className="break-words text-sm text-muted-foreground">{interview.location}</p>
            )}
            {interview.status === "cancelled" && interview.cancellationReason && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
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

      {interview.status === "scheduled" && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
            Reschedule
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleComplete}
            disabled={completeInterview.isPending}
          >
            Mark Completed
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            Cancel
          </Button>
        </div>
      )}

      <InterviewDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        submitting={rescheduleInterview.isPending}
        onSubmit={handleReschedule}
        title="Reschedule interview"
        defaultValues={{
          title: interview.title,
          interviewMethod: interview.interviewMethod,
          date: interview.scheduledAt.slice(0, 10),
          time: new Date(interview.scheduledAt).toTimeString().slice(0, 5),
          durationMinutes: interview.durationMinutes,
          timezone: interview.timezone,
          location: interview.location ?? "",
          meetingUrl: interview.meetingUrl ?? "",
        }}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              The candidate will see it marked as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason (visible to candidate, optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Never mind</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancel interview</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ApplicantDetailPage() {
  const { applicationId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: application, isPending, isError } = useEmployerApplication(applicationId);
  const { data: history = [] } = useApplicationStatusHistory(applicationId);
  const { data: resume } = useResume(application?.resumeId);
  const { data: interviews = [] } = useApplicationInterviews(applicationId);
  const updateStatus = useUpdateApplicationStatus();
  const scheduleInterview = useScheduleInterview();
  const findOrCreateConversation = useFindOrCreateConversation();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const handleMessage = async () => {
    if (!application) return;
    setMessaging(true);
    try {
      const conversationId = await findOrCreateConversation.mutateAsync(application.id);
      void navigate({ to: "/employer/messages", search: { conversation: conversationId } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't open messages for this applicant.",
      );
    } finally {
      setMessaging(false);
    }
  };

  const handleStatusChange = async () => {
    if (!application || !pendingStatus) return;
    try {
      await updateStatus.mutateAsync({ applicationId: application.id, status: pendingStatus });
      toast.success(`Marked as ${STATUS_LABELS[pendingStatus]}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the status.");
    } finally {
      setPendingStatus(null);
    }
  };

  const handleSchedule = async (values: InterviewFormValues) => {
    if (!application) return;
    try {
      await scheduleInterview.mutateAsync({ applicationId: application.id, values });
      toast.success("Interview scheduled.");
      setScheduleOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't schedule this interview.");
    }
  };

  const handleViewResume = async () => {
    if (!resume) return;
    setDownloading(true);
    try {
      const url = await getResumeSignedUrl(resume.filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open this resume.");
    } finally {
      setDownloading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !application) {
    return (
      <EmptyState
        title="Applicant not found"
        description="This application doesn't exist or isn't for one of your jobs."
        action={
          <Button variant="outline" asChild>
            <Link to="/employer/applications">Back to applicants</Link>
          </Button>
        }
      />
    );
  }

  const availableTransitions = EMPLOYER_ALLOWED_TRANSITIONS[application.status];

  return (
    <>
      <DashboardHeader
        title={application.applicantName}
        description={`Applied for ${application.jobTitle} · ${new Date(application.appliedAt).toLocaleDateString()}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={messaging} onClick={() => void handleMessage()}>
              {messaging ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              Message Candidate
            </Button>
            {canScheduleInterview(application.status) ? (
              <Button onClick={() => setScheduleOpen(true)}>
                <Calendar className="size-4" /> Schedule Interview
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Applicant details</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {application.applicantEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4" /> {application.applicantEmail}
                </p>
              )}
              {application.applicantLocation && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" /> {application.applicantLocation}
                </p>
              )}
            </div>
            {application.applicantBio && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {application.applicantBio}
              </p>
            )}
          </section>

          {application.coverLetter && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Cover letter</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {application.coverLetter}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Interviews</h2>
            {interviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No interviews scheduled yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {interviews.map((i) => (
                  <InterviewCard key={i.id} interview={i} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">History</h2>
            <ol className="mt-3 space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {STATUS_LABELS[entry.newStatus]}
                  </span>{" "}
                  — {new Date(entry.createdAt).toLocaleString()}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Tag tone={STATUS_TONE[application.status]}>{STATUS_LABELS[application.status]}</Tag>

            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={handleViewResume}
              disabled={!resume || downloading}
            >
              {downloading && <Loader2 className="size-3.5 animate-spin" />}
              View resume ({application.resumeName})
            </Button>

            {availableTransitions.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Update status
                </p>
                {availableTransitions.map((next) => (
                  <Button
                    key={next}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setPendingStatus(next)}
                  >
                    Mark as {STATUS_LABELS[next]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <InterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        submitting={scheduleInterview.isPending}
        onSubmit={handleSchedule}
      />

      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark this application as {pendingStatus ? STATUS_LABELS[pendingStatus] : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The applicant will see this status change on their application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
