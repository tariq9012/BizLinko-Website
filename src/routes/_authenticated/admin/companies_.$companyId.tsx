import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  FileText,
  Flag,
  RotateCcw,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { AccountStatusBadge } from "@/components/admin/StatusBadges";
import { ModerationDialog } from "@/components/admin/ModerationDialog";
import { useAdminCompanyDetail } from "@/features/admin/queries";
import {
  useAdminSetCompanyStatus,
  useAdminSetCompanyVerification,
} from "@/features/admin/mutations";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/companies_/$companyId")({
  head: () => ({ meta: [{ title: "Company — Admin — BizLinko" }] }),
  component: AdminCompanyDetailPage,
});

function AdminCompanyDetailPage() {
  const { companyId } = Route.useParams();
  const { data: company, isPending, isError } = useAdminCompanyDetail(companyId);
  const setVerification = useAdminSetCompanyVerification();
  const setStatus = useAdminSetCompanyStatus();

  if (isPending) {
    return <LoadingSkeleton className="h-64 w-full rounded-2xl" />;
  }

  if (isError || !company) {
    return (
      <EmptyState
        title="Couldn't load this company"
        description="It may not exist, or something went wrong."
      />
    );
  }

  const handleVerify = async (verified: boolean, reason: string) => {
    try {
      await setVerification.mutateAsync({ companyId, verified, reason });
      toast.success(verified ? "Company verified" : "Verification removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update verification.");
    }
  };

  const handleStatus = async (status: "active" | "suspended", reason: string) => {
    try {
      await setStatus.mutateAsync({ companyId, status, reason });
      toast.success(status === "active" ? "Company restored" : "Company suspended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update this company.");
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link to="/admin/companies">
          <ArrowLeft className="size-4" /> Back to companies
        </Link>
      </Button>

      <DashboardHeader
        title={company.name}
        description={company.industry ?? company.location ?? ""}
        action={
          <div className="flex flex-wrap gap-2">
            {company.verified ? (
              <ModerationDialog
                trigger={<Button variant="outline">Remove verification</Button>}
                title={`Remove verification from ${company.name}?`}
                description="The blue-check badge will no longer show on their public profile."
                confirmLabel="Remove verification"
                requireReason={false}
                onConfirm={(reason) => handleVerify(false, reason)}
              />
            ) : (
              <ModerationDialog
                trigger={
                  <Button>
                    <BadgeCheck className="size-4" /> Verify company
                  </Button>
                }
                title={`Verify ${company.name}?`}
                description="This adds a verified badge to their public company profile."
                confirmLabel="Verify"
                requireReason={false}
                onConfirm={(reason) => handleVerify(true, reason)}
              />
            )}
            {company.status === "active" ? (
              <ModerationDialog
                trigger={
                  <Button variant="destructive">
                    <ShieldOff className="size-4" /> Suspend
                  </Button>
                }
                title={`Suspend ${company.name}?`}
                description="Existing jobs and history stay visible, but they won't be able to publish new jobs while suspended."
                confirmLabel="Suspend company"
                destructive
                onConfirm={(reason) => handleStatus("suspended", reason)}
              />
            ) : (
              <ModerationDialog
                trigger={
                  <Button>
                    <RotateCcw className="size-4" /> Restore
                  </Button>
                }
                title={`Restore ${company.name}?`}
                description="This lifts the suspension and allows publishing jobs again."
                confirmLabel="Restore company"
                onConfirm={(reason) => handleStatus("active", reason)}
              />
            )}
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Avatar className="size-14 rounded-xl">
          <AvatarImage src={company.logo ?? undefined} alt={company.name} />
          <AvatarFallback className="rounded-xl">{initials(company.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold text-foreground">{company.name}</p>
            {company.verified && (
              <span className="inline-flex items-center gap-1 text-sm text-primary">
                <BadgeCheck className="size-4" /> Verified
              </span>
            )}
            <AccountStatusBadge status={company.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Owner: {company.owner_name || "—"}{" "}
            {company.owner_email ? `(${company.owner_email})` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jobs" value={company.jobs_count} icon={Briefcase} />
        <StatCard label="Published jobs" value={company.published_jobs_count} icon={Briefcase} />
        <StatCard
          label="Applications received"
          value={company.applications_count}
          icon={FileText}
        />
        <StatCard label="Open reports" value={company.open_reports_count} icon={Flag} />
      </div>
    </>
  );
}
