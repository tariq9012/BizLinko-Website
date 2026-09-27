import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Briefcase,
  Building2,
  CalendarClock,
  FileText,
  Flag,
  Handshake,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminDailyCounts,
  useAdminDashboardStats,
  type GrowthMetric,
} from "@/features/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — BizLinko" }] }),
  component: AdminOverviewPage,
});

const METRIC_LABEL: Record<GrowthMetric, string> = {
  users: "New users",
  jobs: "Jobs posted",
  applications: "Applications",
  hires: "Hires",
};

const chartConfig: ChartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
};

function AdminOverviewPage() {
  const { data: stats, isPending, isError } = useAdminDashboardStats();
  const [metric, setMetric] = useState<GrowthMetric>("applications");
  const [days, setDays] = useState(30);
  const { data: series = [], isPending: seriesPending } = useAdminDailyCounts(metric, days);

  return (
    <>
      <DashboardHeader title="Admin Overview" description="How the platform is doing right now." />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError || !stats ? (
        <EmptyState title="Couldn't load platform stats" description="Please try again." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Users"
              value={stats.total_users}
              icon={Users}
              hint={`${stats.job_seekers} job seekers · ${stats.employers} employers`}
            />
            <StatCard
              label="Companies"
              value={stats.total_companies}
              icon={Building2}
              hint={`${stats.verified_companies} verified`}
            />
            <StatCard label="Published jobs" value={stats.published_jobs} icon={Briefcase} />
            <StatCard
              label="Applications"
              value={stats.total_applications}
              icon={FileText}
              hint={`${stats.applications_this_month} this month`}
            />
            <StatCard
              label="Interviews scheduled"
              value={stats.interviews_scheduled}
              icon={CalendarClock}
            />
            <StatCard label="Offers extended" value={stats.offers} icon={Handshake} />
            <StatCard label="Hires" value={stats.hires} icon={Trophy} />
            <StatCard
              label="Open reports"
              value={stats.open_reports}
              icon={Flag}
              hint={`${stats.unresolved_reports} unresolved total`}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-foreground">Growth</h2>
              <div className="flex flex-wrap gap-2">
                <Select value={metric} onValueChange={(v) => setMetric(v as GrowthMetric)}>
                  <SelectTrigger className="w-[160px]" aria-label="Metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METRIC_LABEL) as GrowthMetric[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {METRIC_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                  <SelectTrigger className="w-[140px]" aria-label="Date range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {seriesPending ? (
              <LoadingSkeleton className="mt-4 h-64 w-full rounded-xl" />
            ) : (
              <ChartContainer config={chartConfig} className="mt-4 h-64 w-full">
                <LineChart data={series} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    minTickGap={24}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Line
                    dataKey="count"
                    type="monotone"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            All figures are live from the database — nothing on this page is placeholder data.
          </div>
        </>
      )}
    </>
  );
}
