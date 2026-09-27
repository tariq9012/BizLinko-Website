import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { useCompanies, type CompanyFilters } from "@/features/companies/queries";

const title = "Companies Hiring — BizLinko";
const description = "Browse companies actively hiring on BizLinko.";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const [filters, setFilters] = useState<CompanyFilters>({});
  const [page, setPage] = useState(1);
  const { data, isPending } = useCompanies(filters, page);
  const companies = data?.companies ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 9));

  const updateFilters = (patch: Partial<CompanyFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10 md:py-14">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Companies Hiring
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Discover companies actively building their teams on BizLinko.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Input
              placeholder="Search company name..."
              value={filters.keyword ?? ""}
              onChange={(e) => updateFilters({ keyword: e.target.value || undefined })}
              className="max-w-xs"
            />
            <Input
              placeholder="Location..."
              value={filters.location ?? ""}
              onChange={(e) => updateFilters({ location: e.target.value || undefined })}
              className="max-w-xs"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        {isPending ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            title="No companies match your search"
            description="Try a different keyword or location."
            action={
              <Button
                variant="outline"
                onClick={() => updateFilters({ keyword: undefined, location: undefined })}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
            <div className="mt-10">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </section>
    </>
  );
}
