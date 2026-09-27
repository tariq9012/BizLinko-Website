import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminApplications } from "@/features/admin/queries";
import type { Database } from "@/integrations/supabase/types";
import { formatDate } from "@/lib/format";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];
const PAGE_SIZE = 20;

const STATUSES: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];

export const Route = createFileRoute("/_authenticated/admin/applications")({
  head: () => ({ meta: [{ title: "Applications — Admin — BizLinko" }] }),
  component: AdminApplicationsPage,
});

function AdminApplicationsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useAdminApplications({
    search,
    status: status === "all" ? null : status,
    page,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <>
      <DashboardHeader
        title="Applications"
        description="Platform-wide view of applications, for oversight only — hiring decisions stay with employers."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search by candidate or job title…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ApplicationStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load applications" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No applications match these filters"
          description="Try a different search or filter."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.application_id}>
                    <TableCell>{a.candidate_name || "—"}</TableCell>
                    <TableCell>{a.job_title}</TableCell>
                    <TableCell>{a.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(a.applied_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </>
  );
}
