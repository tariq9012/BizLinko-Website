import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CandidateCard } from "@/components/candidates/CandidateCard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDiscoverableCandidates, type CandidateFilters } from "@/features/candidates/queries";

const PAGE_SIZE = 20;
const emptyFilters: CandidateFilters = {
  search: "",
  skills: [],
  minYears: null,
  maxYears: null,
  location: "",
  openToWorkOnly: false,
};

export const Route = createFileRoute("/_authenticated/employer/candidates")({
  head: () => ({ meta: [{ title: "Find Candidates — BizLinko" }] }),
  component: EmployerCandidatesPage,
});

function EmployerCandidatesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [openToWorkOnly, setOpenToWorkOnly] = useState(false);
  const [minYears, setMinYears] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput);
  const debouncedLocation = useDebouncedValue(locationInput);

  const filters: CandidateFilters = {
    ...emptyFilters,
    search: debouncedSearch,
    location: debouncedLocation,
    openToWorkOnly,
    minYears: minYears ? Number(minYears) : null,
  };

  const { data, isPending, isError } = useDiscoverableCandidates(filters, page);
  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <>
      <DashboardHeader
        title="Find Candidates"
        description="Search job seekers who've chosen to be discoverable by employers."
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, headline, or role…"
            className="pl-9"
          />
        </div>
        <Input
          value={locationInput}
          onChange={(e) => {
            setLocationInput(e.target.value);
            setPage(1);
          }}
          placeholder="Location"
          className="w-[180px]"
        />
        <Input
          type="number"
          min={0}
          value={minYears}
          onChange={(e) => {
            setMinYears(e.target.value);
            setPage(1);
          }}
          placeholder="Min years exp."
          className="w-[140px]"
        />
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground">
          <Checkbox
            checked={openToWorkOnly}
            onCheckedChange={(v) => {
              setOpenToWorkOnly(v === true);
              setPage(1);
            }}
          />
          Open to work
        </label>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load candidates" description="Please try again." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No discoverable candidates match these filters"
          description="Try broadening your search — most job seekers keep discovery off by default, so results depend on who has opted in."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <CandidateCard
                key={c.candidateId}
                candidate={c}
                detailHref={`/employer/candidates/${c.candidateId}`}
              />
            ))}
          </div>
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </>
  );
}
