import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, RotateCcw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { AccountStatusBadge } from "@/components/admin/StatusBadges";
import { ModerationDialog } from "@/components/admin/ModerationDialog";
import { useAdminUserDetail } from "@/features/admin/queries";
import { useAdminSetAccountStatus } from "@/features/admin/mutations";
import { fullName } from "@/features/admin/types";
import { initials, formatDate } from "@/lib/format";
import { Briefcase, Bookmark, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users_/$userId")({
  head: () => ({ meta: [{ title: "User — Admin — BizLinko" }] }),
  component: AdminUserDetailPage,
});

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user, isPending, isError } = useAdminUserDetail(userId);
  const setStatus = useAdminSetAccountStatus();

  if (isPending) {
    return <LoadingSkeleton className="h-64 w-full rounded-2xl" />;
  }

  if (isError || !user) {
    return (
      <EmptyState
        title="Couldn't load this user"
        description="They may not exist, or something went wrong."
      />
    );
  }

  const name = fullName(user.first_name, user.last_name);

  const handleStatus = async (status: "active" | "suspended" | "banned", reason: string) => {
    try {
      await setStatus.mutateAsync({ userId, status, reason });
      toast.success(
        status === "active"
          ? "Account restored"
          : status === "suspended"
            ? "Account suspended"
            : "Account banned",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this account.");
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link to="/admin/users">
          <ArrowLeft className="size-4" /> Back to users
        </Link>
      </Button>

      <DashboardHeader
        title={name}
        description={user.email ?? ""}
        action={
          <div className="flex flex-wrap gap-2">
            {user.status === "active" ? (
              <>
                <ModerationDialog
                  trigger={
                    <Button variant="outline">
                      <ShieldOff className="size-4" /> Suspend
                    </Button>
                  }
                  title={`Suspend ${name}?`}
                  description="They'll keep read access to historical data, but important actions (posting, applying, messaging, scheduling) will be blocked."
                  confirmLabel="Suspend account"
                  onConfirm={(reason) => handleStatus("suspended", reason)}
                />
                <ModerationDialog
                  trigger={
                    <Button variant="destructive">
                      <Ban className="size-4" /> Ban
                    </Button>
                  }
                  title={`Ban ${name}?`}
                  description="This is a stronger, longer-term restriction than a suspension."
                  confirmLabel="Ban account"
                  destructive
                  onConfirm={(reason) => handleStatus("banned", reason)}
                />
              </>
            ) : (
              <ModerationDialog
                trigger={
                  <Button>
                    <RotateCcw className="size-4" /> Restore account
                  </Button>
                }
                title={`Restore ${name}'s account?`}
                description="This clears the current suspension/ban and returns the account to active."
                confirmLabel="Restore account"
                onConfirm={(reason) => handleStatus("active", reason)}
              />
            )}
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Avatar className="size-14">
          <AvatarImage src={user.avatar ?? undefined} alt={name} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold text-foreground">{name}</p>
            <AccountStatusBadge status={user.status} />
          </div>
          <p className="text-sm capitalize text-muted-foreground">{user.role.replace("_", " ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</p>
        </div>
      </div>

      {user.role === "job_seeker" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Applications" value={user.applications_count} icon={Briefcase} />
          <StatCard label="Saved jobs" value={user.saved_jobs_count} icon={Bookmark} />
          <StatCard label="Interviews" value={user.interviews_count} icon={CalendarClock} />
        </div>
      ) : user.role === "employer" && user.company_id ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold text-foreground">
                {user.company_name}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {user.company_verified ? "Verified" : "Not verified"} ·{" "}
                {user.company_status ? <AccountStatusBadge status={user.company_status} /> : null}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/companies/$companyId" params={{ companyId: user.company_id }}>
                View company
              </Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard label="Jobs posted" value={user.company_jobs_count} icon={Briefcase} />
            <StatCard
              label="Applications received"
              value={user.company_applications_count}
              icon={CalendarClock}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
