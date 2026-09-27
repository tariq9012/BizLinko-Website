import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountStatusBadge } from "@/components/admin/StatusBadges";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminCompanies } from "@/features/admin/queries";
import type { AccountStatus } from "@/features/admin/types";
import { initials } from "@/lib/format";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/admin/companies")({
  head: () => ({ meta: [{ title: "Companies — Admin — BizLinko" }] }),
  component: AdminCompaniesPage,
});

function AdminCompaniesPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [verified, setVerified] = useState<"all" | "yes" | "no">("all");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useAdminCompanies({
    search,
    verified: verified === "all" ? null : verified === "yes",
    status: status === "all" ? null : status,
    page,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <>
      <DashboardHeader title="Companies" description="Every employer company on the platform." />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search by company name…"
            className="pl-9"
          />
        </div>
        <Select
          value={verified}
          onValueChange={(v) => {
            setVerified(v as "all" | "yes" | "no");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Verification">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            <SelectItem value="yes">Verified</SelectItem>
            <SelectItem value="no">Unverified</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as AccountStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
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
        <EmptyState title="Couldn't load companies" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No companies match these filters"
          description="Try a different search or filter."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jobs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.company_id}>
                    <TableCell>
                      <Link
                        to="/admin/companies/$companyId"
                        params={{ companyId: c.company_id }}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="size-8 rounded-lg">
                          <AvatarImage src={c.logo ?? undefined} alt={c.name} />
                          <AvatarFallback className="rounded-lg">{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.industry ?? c.location ?? "—"}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{c.owner_name || "—"}</TableCell>
                    <TableCell>
                      {c.verified ? (
                        <span className="inline-flex items-center gap-1 text-sm text-primary">
                          <BadgeCheck className="size-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not verified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      {c.published_jobs_count} published / {c.jobs_count} total
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
