import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { JobCard } from "@/components/jobs/JobCard";
import { FilterSidebar } from "@/components/jobs/FilterSidebar";
import { FilterDrawer } from "@/components/jobs/FilterDrawer";
import { JobSearchBar, FilterChip } from "@/components/jobs/JobSearchBar";
import { SaveSearchButton, SavedSearchesMenu } from "@/components/jobs/SavedSearchesMenu";
import { useJobCategories } from "@/features/jobs/queries";
import { usePublicJobs, type SortKey } from "@/features/jobs/queries";
import {
  useSaveRecentSearch,
  type RecentSearch,
  type SavedSearch,
} from "@/features/search/queries";
import { useAuth } from "@/hooks/useAuth";
import { emptyFilters, countActiveFilters } from "@/lib/job-filters";
import type { ExperienceLevel, JobFilters, JobType, SalaryPeriod, WorkMode } from "@/types";

const title = "Find Your Next Opportunity — BizLinko Jobs";
const description =
  "Search live roles by keyword, location, category, work mode, salary and experience level on BizLinko.";

type JobSearch = {
  q?: string | undefined;
  location?: string | undefined;
  category?: string | undefined;
  types?: string | undefined;
  workModes?: string | undefined;
  experience?: string | undefined;
  minSalary?: number | undefined;
  maxSalary?: number | undefined;
  salaryPeriod?: string | undefined;
  skills?: string | undefined;
  datePosted?: string | undefined;
  verified?: boolean | undefined;
  page?: number | undefined;
  sort?: SortKey | undefined;
};

const SORT_VALUES: SortKey[] = [
  "relevance",
  "recent",
  "oldest",
  "salary-high",
  "salary-low",
  "title",
];
const csv = (v: unknown) => (typeof v === "string" && v ? v.split(",").filter(Boolean) : []);

export const Route = createFileRoute("/jobs/")({
  validateSearch: (search: Record<string, unknown>): JobSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? (search["q"] as string) : undefined,
    location:
      typeof search["location"] === "string" && search["location"]
        ? (search["location"] as string)
        : undefined,
    category:
      typeof search["category"] === "string" && search["category"]
        ? (search["category"] as string)
        : undefined,
    types:
      typeof search["types"] === "string" && search["types"]
        ? (search["types"] as string)
        : undefined,
    workModes:
      typeof search["workModes"] === "string" && search["workModes"]
        ? (search["workModes"] as string)
        : undefined,
    experience:
      typeof search["experience"] === "string" && search["experience"]
        ? (search["experience"] as string)
        : undefined,
    minSalary: Number(search["minSalary"]) > 0 ? Number(search["minSalary"]) : undefined,
    maxSalary: Number(search["maxSalary"]) > 0 ? Number(search["maxSalary"]) : undefined,
    salaryPeriod:
      typeof search["salaryPeriod"] === "string" && search["salaryPeriod"]
        ? (search["salaryPeriod"] as string)
        : undefined,
    skills:
      typeof search["skills"] === "string" && search["skills"]
        ? (search["skills"] as string)
        : undefined,
    datePosted:
      typeof search["datePosted"] === "string" && search["datePosted"]
        ? (search["datePosted"] as string)
        : undefined,
    verified: search["verified"] === true || search["verified"] === "true" ? true : undefined,
    page:
      typeof search["page"] === "number" || (typeof search["page"] === "string" && search["page"])
        ? Number(search["page"])
        : undefined,
    sort: SORT_VALUES.includes(search["sort"] as SortKey) ? (search["sort"] as SortKey) : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: JobsPage,
});

const PAGE_SIZE = 6;

function filtersFromSearch(search: JobSearch): JobFilters {
  return {
    ...emptyFilters,
    keyword: search.q ?? "",
    location: search.location ?? "",
    category: search.category ?? "",
    types: csv(search.types) as JobType[],
    workModes: csv(search.workModes) as WorkMode[],
    experience: csv(search.experience) as ExperienceLevel[],
    minSalary: search.minSalary ?? 0,
    maxSalary: search.maxSalary ?? 0,
    salaryPeriod: (search.salaryPeriod as SalaryPeriod | undefined) ?? "",
    verifiedOnly: search.verified ?? false,
    datePosted: search.datePosted ?? "any",
    skills: csv(search.skills),
  };
}

function JobsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { currentUser } = useAuth();

  const [filters, setFilters] = useState<JobFilters>(() => filtersFromSearch(search));
  const sort = search.sort ?? "recent";
  const page = search.page ?? 1;

  const { data: categories = [] } = useJobCategories();
  const categoryIdBySlug = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c.id])),
    [categories],
  );

  const { data, isPending, isError, isPlaceholderData } = usePublicJobs({
    filters,
    categoryIdBySlug,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const results = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const saveRecentSearch = useSaveRecentSearch();
  const lastSavedRef = useRef<string>("");

  const applyToUrl = (f: JobFilters, extra?: Partial<JobSearch>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        q: f.keyword || undefined,
        location: f.location || undefined,
        category: f.category || undefined,
        types: f.types.length ? f.types.join(",") : undefined,
        workModes: f.workModes.length ? f.workModes.join(",") : undefined,
        experience: f.experience.length ? f.experience.join(",") : undefined,
        minSalary: f.minSalary || undefined,
        maxSalary: f.maxSalary || undefined,
        salaryPeriod: f.salaryPeriod || undefined,
        skills: f.skills.length ? f.skills.join(",") : undefined,
        datePosted: f.datePosted !== "any" ? f.datePosted : undefined,
        verified: f.verifiedOnly || undefined,
        page: undefined,
        ...extra,
      }),
    });
  };

  const updateFilters = (f: JobFilters) => {
    setFilters(f);
    applyToUrl(f);
  };

  // Record a meaningful search to "recent searches" once the results for it
  // have actually loaded — not on every keystroke, and never a blank search.
  useEffect(() => {
    if (!currentUser || isPending) return;
    const meaningful = filters.keyword.trim() || countActiveFilters(filters) > 0;
    if (!meaningful) return;
    const signature = JSON.stringify(filters);
    if (signature === lastSavedRef.current) return;
    lastSavedRef.current = signature;
    saveRecentSearch.mutate({ query: filters.keyword.trim(), filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isPending, filters]);

  const setPage = (p: number) => {
    void navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) });
  };

  const setSort = (s: SortKey) => {
    void navigate({
      search: (prev) => ({ ...prev, sort: s === "recent" ? undefined : s, page: undefined }),
    });
  };

  const runSaved = (s: RecentSearch | SavedSearch) => {
    const f: JobFilters = {
      ...emptyFilters,
      ...(s.filters as Partial<JobFilters>),
      keyword: s.query ?? "",
    };
    setFilters(f);
    applyToUrl(f);
  };

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.location)
    chips.push({
      key: "location",
      label: filters.location,
      onRemove: () => updateFilters({ ...filters, location: "" }),
    });
  if (filters.category) {
    const cat = categories.find((c) => c.slug === filters.category);
    chips.push({
      key: "category",
      label: cat?.name ?? filters.category,
      onRemove: () => updateFilters({ ...filters, category: "" }),
    });
  }
  filters.types.forEach((t) =>
    chips.push({
      key: `type-${t}`,
      label: t,
      onRemove: () => updateFilters({ ...filters, types: filters.types.filter((x) => x !== t) }),
    }),
  );
  filters.workModes.forEach((m) =>
    chips.push({
      key: `mode-${m}`,
      label: m,
      onRemove: () =>
        updateFilters({ ...filters, workModes: filters.workModes.filter((x) => x !== m) }),
    }),
  );
  filters.experience.forEach((l) =>
    chips.push({
      key: `exp-${l}`,
      label: l,
      onRemove: () =>
        updateFilters({ ...filters, experience: filters.experience.filter((x) => x !== l) }),
    }),
  );
  filters.skills.forEach((s) =>
    chips.push({
      key: `skill-${s}`,
      label: s,
      onRemove: () => updateFilters({ ...filters, skills: filters.skills.filter((x) => x !== s) }),
    }),
  );
  if (filters.minSalary || filters.maxSalary) {
    const label = `${filters.minSalary ? filters.minSalary.toLocaleString() : "0"}–${filters.maxSalary ? filters.maxSalary.toLocaleString() : "∞"}${filters.salaryPeriod ? `/${filters.salaryPeriod}` : ""}`;
    chips.push({
      key: "salary",
      label,
      onRemove: () => updateFilters({ ...filters, minSalary: 0, maxSalary: 0, salaryPeriod: "" }),
    });
  }
  if (filters.verifiedOnly)
    chips.push({
      key: "verified",
      label: "Verified companies",
      onRemove: () => updateFilters({ ...filters, verifiedOnly: false }),
    });
  if (filters.datePosted !== "any") {
    const dateLabel =
      { "24h": "Past 24 hours", "7d": "Past 7 days", "30d": "Past 30 days" }[filters.datePosted] ??
      filters.datePosted;
    chips.push({
      key: "date",
      label: dateLabel,
      onRemove: () => updateFilters({ ...filters, datePosted: "any" }),
    });
  }

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10 md:py-14">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Find Your Next Opportunity
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Search live roles from companies hiring across every experience level.
          </p>
          <JobSearchBar
            className="mt-6"
            keyword={filters.keyword}
            location={filters.location}
            onKeywordChange={(v) => setFilters({ ...filters, keyword: v })}
            onLocationChange={(v) => setFilters({ ...filters, location: v })}
            onSubmit={() => updateFilters(filters)}
            onRerunRecent={runSaved}
            userId={currentUser?.id}
          />
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5">
              <FilterSidebar
                filters={filters}
                onChange={updateFilters}
                onReset={() => updateFilters({ ...emptyFilters })}
                allSkills={[]}
                categories={categories}
              />
            </div>
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <FilterDrawer
                  filters={filters}
                  onChange={updateFilters}
                  onReset={() => updateFilters({ ...emptyFilters })}
                  allSkills={[]}
                  categories={categories}
                  activeCount={countActiveFilters(filters)}
                />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{total}</span> jobs found
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SaveSearchButton
                  userId={currentUser?.id}
                  keyword={filters.keyword}
                  filters={filters}
                />
                <SavedSearchesMenu userId={currentUser?.id} onRun={runSaved} />
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-[190px]" aria-label="Sort jobs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="salary-high">Salary: high to low</SelectItem>
                    <SelectItem value="salary-low">Salary: low to high</SelectItem>
                    <SelectItem value="title">Title: A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {chips.map((c) => (
                  <FilterChip key={c.key} label={c.label} onRemove={c.onRemove} />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => updateFilters({ ...emptyFilters })}
                >
                  Clear all
                </Button>
              </div>
            )}

            {isPending ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <EmptyState
                title="We couldn't load jobs"
                description="Something went wrong fetching results. Please try again."
                action={
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <TriangleAlert className="size-4" /> Please refresh the page
                  </div>
                }
              />
            ) : results.length === 0 ? (
              <EmptyState
                title="No jobs match your filters"
                description="Try removing a filter, broadening your location, or browsing recent jobs instead."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => updateFilters({ ...emptyFilters })}>
                      Clear all filters
                    </Button>
                    {filters.location && (
                      <Button
                        variant="outline"
                        onClick={() => updateFilters({ ...filters, location: "" })}
                      >
                        Remove location
                      </Button>
                    )}
                  </div>
                }
              />
            ) : (
              <div
                className={
                  isPlaceholderData
                    ? "grid gap-5 opacity-60 transition-opacity md:grid-cols-2 xl:grid-cols-1"
                    : "grid gap-5 md:grid-cols-2 xl:grid-cols-1"
                }
              >
                {results.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-10">
                <Pagination
                  page={Math.min(page, totalPages)}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
