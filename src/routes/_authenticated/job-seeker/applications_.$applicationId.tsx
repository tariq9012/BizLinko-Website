import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
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
import { useMyApplication, useApplicationStatusHistory } from "@/features/applications/queries";
import { useWithdrawApplication } from "@/features/applications/mutations";
import { STATUS_LABELS, STATUS_TONE, canSeekerWithdraw } from "@/features/applications/status";
import { getResumeSignedUrl } from "@/features/resumes/storage";
import { useResume } from "@/features/resumes/queries";
import { useApplicationInterviews } from "@/features/interviews/queries";
import { useFindOrCreateConversation } from "@/features/messaging/mutations";
import { isConversationMessageable } from "@/features/messaging/types";

export const Route = createFileRoute("/_authenticated/job-seeker/applications_/$applicationId")({
  head: () => ({ meta: [{ title: "Application Details — BizLinko" }] }),
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: application, isPending, isError } = useMyApplication(applicationId);
  const { data: history = [] } = useApplicationStatusHistory(applicationId);
  const { data: resume } = useResume(application?.resumeId);
  const { data: interviews = [] } = useApplicationInterviews(applicationId);
  const withdraw = useWithdrawApplication();
  const findOrCreateConversation = useFindOrCreateConversation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const handleMessage = async () => {
    if (!application) return;
    setMessaging(true);
    try {
      const conversationId = await findOrCreateConversation.mutateAsync(application.id);
      void navigate({ to: "/job-seeker/messages", search: { conversation: conversationId } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't open messages for this application.",
      );
    } finally {
      setMessaging(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;
    try {
      await withdraw.mutateAsync(application.id);
      toast.success("Application withdrawn.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't withdraw this application.");
    } finally {
      setConfirmOpen(false);
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
        title="Application not found"
        description="This application doesn't exist or doesn't belong to you."
        action={
          <Button variant="outline" asChild>
            <Link to="/job-seeker/applications">Back to applications</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DashboardHeader
        title={application.jobTitle}
        description={`${application.companyName} · ${application.location}`}
        action={
          <div className="flex flex-wrap gap-2">
            {isConversationMessageable(application.status) ? (
              <Button variant="outline" disabled={messaging} onClick={() => void handleMessage()}>
                {messaging ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageSquare className="size-4" />
                )}
                Message Employer
              </Button>
            ) : null}
            {canSeekerWithdraw(application.status) ? (
              <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                Withdraw application
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Status timeline</h2>
            <ol className="mt-4 space-y-4">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {STATUS_LABELS[entry.newStatus]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {interviews.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Interviews</h2>
              <div className="mt-3 space-y-3">
                {interviews.map((i) => (
                  <div key={i.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{i.title}</p>
                      <Tag
                        tone={
                          i.status === "completed"
                            ? "success"
                            : i.status === "cancelled"
                              ? "neutral"
                              : "primary"
                        }
                      >
                        {i.status}
                      </Tag>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(i.scheduledAt).toLocaleString()} ({i.timezone}) ·{" "}
                      {i.durationMinutes} min
                    </p>
                    {i.status === "cancelled" && i.cancellationReason && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Reason: {i.cancellationReason}
                      </p>
                    )}
                    {i.status === "scheduled" && new Date(i.scheduledAt) >= new Date() && (
                      <div className="mt-2">
                        {i.interviewMethod === "video" && i.meetingUrl && (
                          <Button size="sm" asChild>
                            <a href={i.meetingUrl} target="_blank" rel="noreferrer noopener">
                              Join Interview
                            </a>
                          </Button>
                        )}
                        {i.interviewMethod === "onsite" && i.location && (
                          <p className="text-sm text-muted-foreground">Location: {i.location}</p>
                        )}
                        {i.interviewMethod === "phone" && (
                          <p className="text-sm text-muted-foreground">
                            The employer will call you at your scheduled time.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {application.coverLetter && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">Cover letter</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {application.coverLetter}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <LogoPlaceholder name={application.companyName} />
              <div>
                <p className="font-medium text-foreground">{application.companyName}</p>
                <Tag tone={STATUS_TONE[application.status]} className="mt-1">
                  {STATUS_LABELS[application.status]}
                </Tag>
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Applied</dt>
                <dd className="font-medium text-foreground">
                  {new Date(application.appliedAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Resume</dt>
                <dd className="font-medium text-foreground">{application.resumeName}</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={handleViewResume}
              disabled={!resume || downloading}
            >
              {downloading && <Loader2 className="size-3.5 animate-spin" />}
              View resume
            </Button>
            {application.jobStatus === "published" && (
              <Button variant="outline" className="mt-2 w-full" asChild>
                <Link to="/jobs/$jobId" params={{ jobId: application.jobId }}>
                  View job posting
                </Link>
              </Button>
            )}
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The employer will see this application as withdrawn. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw}>Withdraw</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
