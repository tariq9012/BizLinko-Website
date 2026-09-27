import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
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
import { useAdminUsers } from "@/features/admin/queries";
import { fullName, type AccountStatus, type AppRole } from "@/features/admin/types";
import { initials } from "@/lib/format";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin — BizLinko" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [role, setRole] = useState<AppRole | "all">("all");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useAdminUsers({
    search,
    role: role === "all" ? null : role,
    status: status === "all" ? null : status,
    page,
  });

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <>
      <DashboardHeader
        title="Users"
        description="Everyone on the platform — job seekers, employers and admins."
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
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v as AppRole | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="job_seeker">Job seeker</SelectItem>
            <SelectItem value="employer">Employer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
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
            <SelectItem value="pending">Pending</SelectItem>
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
        <EmptyState title="Couldn't load users" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No users match these filters"
          description="Try a different search or filter."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => {
                  const name = fullName(u.first_name, u.last_name);
                  return (
                    <TableRow key={`${u.user_id}-${u.role}`} className="cursor-pointer">
                      <TableCell>
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: u.user_id }}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="size-8">
                            <AvatarImage src={u.avatar ?? undefined} alt={name} />
                            <AvatarFallback>{initials(name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize">{u.role.replace("_", " ")}</TableCell>
                      <TableCell>
                        <AccountStatusBadge status={u.status} />
                      </TableCell>
                      <TableCell>{u.company_name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
