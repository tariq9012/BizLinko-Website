import { Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CategoryCard } from "@/components/jobs/CategoryCard";
import { useJobCategoriesWithCounts } from "@/features/jobs/queries";

export function PopularCategories() {
  const { data: categories = [], isPending } = useJobCategoriesWithCounts();

  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <SectionHeader
          align="center"
          eyebrow="Browse by field"
          title="Popular Categories"
          description="Jump straight into the areas where companies are hiring most."
        />
        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <CategoryCard
                key={c.slug}
                category={{
                  slug: c.slug,
                  name: c.name,
                  icon: c.iconKey ?? "Boxes",
                  jobCount: c.jobCount,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
