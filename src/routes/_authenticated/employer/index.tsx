import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Briefcase, Calendar, Eye, FileText, MessageSquare, Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { displayName } from "@/lib/auth-utils";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import { useEmployerJobs } from "@/features/jobs/queries";
import { useJobApplicationCounts } from "@/features/applications/queries";
import { useEmployerInterviews } from "@/features/interviews/queries";
import {
  useUnreadMessageCount,
  useUnreadNotificationCount,
} from "@/features/notifications/queries";

const title = "Employer Dashboard — BizLinko";
const description = "Manage your company profile, job posts and candidate pipeline.";

export const Route = createFileRoute("/_authenticated/employer/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const { profile, currentUser } = useAuth();
  const name = displayName(profile ?? { email: currentUser?.email ?? null });
  const { data: company } = useEmployerCompany();
  const { data: jobs = [] } = useEmployerJobs(company?.id);
  const activeJobs = jobs.filter((j) => j.status === "published").length;
  const { data: applicationCounts } = useJobApplicationCounts(jobs.map((j) => j.id));
  const totals = Array.from(applicationCounts?.values() ?? []).reduce(
    (acc, c) => ({
      total: acc.total + c.total,
      submitted: acc.submitted + c.submitted,
      shortlisted: acc.shortlisted + c.shortlisted,
      hired: acc.hired + c.hired,
      offer: acc.offer + c.offer,
    }),
    { total: 0, submitted: 0, shortlisted: 0, hired: 0, offer: 0 },
  );
  const { data: interviews = [] } = useEmployerInterviews(company?.id);
  const upcomingInterviews = interviews.filter(
    (i) => i.status === "scheduled" && new Date(i.scheduledAt) >= new Date(),
  ).length;
  const { data: unreadMessages = 0 } = useUnreadMessageCount(currentUser?.id);
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount(currentUser?.id);

  return (
    <>
      <DashboardHeader
        title={`Welcome, ${name.split(" ")[0]}`}
        description="Your hiring at a glance."
        action={
          <Button asChild>
            <Link to="/employer/post-job">Post a job</Link>
          </Button>
        }
      />

      {(unreadMessages > 0 || unreadNotifications > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {unreadMessages > 0 && (
            <Link
              to="/employer/messages"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)] hover:bg-secondary"
            >
              <MessageSquare className="size-4 text-primary" />
              {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}
            </Link>
          )}
          {unreadNotifications > 0 && (
            <Link
              to="/employer/notifications"
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
          label="Active jobs"
          value={activeJobs}
          icon={Briefcase}
          hint={`${jobs.length} total job post${jobs.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Applications"
          value={totals.total}
          icon={FileText}
          hint={`${totals.submitted} awaiting review`}
        />
        <StatCard
          label="Shortlisted"
          value={totals.shortlisted}
          icon={Users}
          hint="Candidates shortlisted"
        />
        <StatCard
          label="Interviews"
          value={upcomingInterviews}
          icon={Calendar}
          hint="Upcoming, scheduled"
        />
        <StatCard label="Offers" value={totals.offer} icon={Eye} hint="Offers extended" />
        <StatCard label="Hired" value={totals.hired} icon={Eye} hint="Positions filled" />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Get set up</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete your company profile so candidates know who they&apos;re applying to, then post
          your first job. Track applicants through your hiring pipeline and schedule interviews from
          the Applications page.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/employer/company">Company profile</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/employer/jobs">My jobs</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/employer/settings">Notification settings</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
