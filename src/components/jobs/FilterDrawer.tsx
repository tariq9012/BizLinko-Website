import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterSidebar } from "./FilterSidebar";
import type { JobFilters } from "@/types";

export function FilterDrawer({
  filters,
  onChange,
  onReset,
  allSkills,
  activeCount,
  categories,
}: {
  filters: JobFilters;
  onChange: (f: JobFilters) => void;
  onReset: () => void;
  allSkills: string[];
  activeCount: number;
  categories?: { slug: string; name: string }[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 rounded-md bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>Filter jobs</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">
          <FilterSidebar
            filters={filters}
            onChange={onChange}
            onReset={onReset}
            allSkills={allSkills}
            {...(categories ? { categories } : {})}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
