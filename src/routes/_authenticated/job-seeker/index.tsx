import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Bookmark, Calendar, FileText, MessageSquare, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { displayName, profileCompletion } from "@/lib/auth-utils";
import { useMyApplications } from "@/features/applications/queries";
import { useSavedJobsCount } from "@/features/saved-jobs/queries";
import { useNextUpcomingInterview } from "@/features/interviews/queries";
import {
  useUnreadMessageCount,
  useUnreadNotificationCount,
} from "@/features/notifications/queries";
import { useTopRecommendedJobs } from "@/features/recommendations/queries";
import { RecommendationCard } from "@/components/jobs/RecommendationCard";

const title = "Job Seeker Dashboard — BizLinko";
const description = "Track your applications, saved jobs and profile completeness in one place.";

export const Route = createFileRoute("/_authenticated/job-seeker/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: JobSeekerDashboard,
});

function JobSeekerDashboard() {
  const { profile, currentUser } = useAuth();
  const name = displayName(profile ?? { email: currentUser?.email ?? null });
  const completion = profileCompletion(profile);
  const { data: applications = [] } = useMyApplications();
  const activeApplications = applications.filter((a) => a.status !== "withdrawn").length;
  const { data: savedCount = 0 } = useSavedJobsCount();
  const { data: nextInterview } = useNextUpcomingInterview(currentUser?.id);
  const { data: unreadMessages = 0 } = useUnreadMessageCount(currentUser?.id);
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount(currentUser?.id);
  const { data: recommended = [] } = useTopRecommendedJobs(currentUser?.id, 4);

  return (
    <>
      <DashboardHeader
        title={`Welcome back, ${name.split(" ")[0]}`}
        description="Here's a snapshot of your job search."
        action={
          <Button asChild>
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        }
      />

      {(unreadMessages > 0 || unreadNotifications > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {unreadMessages > 0 && (
            <Link
              to="/job-seeker/messages"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)] hover:bg-secondary"
            >
              <MessageSquare className="size-4 text-primary" />
              {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}
            </Link>
          )}
          {unreadNotifications > 0 && (
            <Link
              to="/job-seeker/notifications"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)] hover:bg-secondary"
            >
              <Bell className="size-4 text-primary" />
              {unreadNotifications} unread notification{unreadNotifications === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={activeApplications}
          icon={FileText}
          hint={`${applications.length} total`}
        />
        <StatCard
          label="Saved jobs"
          value={savedCount}
          icon={Bookmark}
          hint="Save roles you want to revisit"
        />
        <StatCard label="Job alerts" value={0} icon={Bell} hint="Manage alerts in settings" />
        <StatCard
          label="Profile views"
          value={0}
          icon={Search}
          hint="Visible once your profile is public"
        />
      </div>

      {nextInterview && (
        <section className="mt-6 rounded-2xl border border-primary/30 bg-primary-soft p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Upcoming interview
              </h2>
              <p className="mt-1 text-sm text-foreground">
                {nextInterview.title} with {nextInterview.companyName} — {nextInterview.jobTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(nextInterview.scheduledAt).toLocaleString()} ({nextInterview.timezone}) ·{" "}
                {nextInterview.interviewMethod}
              </p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link to="/job-seeker/interviews">View details</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Recommended for you
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/job-seeker/recommended-jobs">View all</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recommended.map((job) => (
              <RecommendationCard key={job.jobId} job={job} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Profile completion
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A complete profile gets you noticed by more employers.
            </p>
          </div>
          <span className="font-display text-2xl font-bold text-primary">{completion}%</span>
        </div>
        <Progress value={completion} className="mt-4" />
        <Button variant="outline" asChild className="mt-5">
          <Link to="/job-seeker/profile">Complete your profile</Link>
        </Button>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Recent activity</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing here yet. Once you start applying and saving jobs, your activity will show up
          here.
        </p>
      </section>
    </>
  );
}
