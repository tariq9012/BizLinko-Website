import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { useFeaturedCompanies } from "@/features/companies/queries";

export function TopCompanies() {
  const { data: companies = [], isPending } = useFeaturedCompanies(6);

  if (!isPending && companies.length === 0) return null;

  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeader
          eyebrow="Trusted employers"
          title="Top Companies"
          description="Growing teams and established organizations hiring on BizLinko."
          action={
            <Button variant="outline" asChild>
              <Link to="/companies">
                Explore Companies
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map((c) => (
              <CompanyCard key={c.id} company={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
