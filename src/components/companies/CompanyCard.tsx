import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin, Users } from "lucide-react";
import type { Company } from "@/types";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";

export function CompanyCard({ company }: { company: Company }) {
  const openJobs = company.openJobCount ?? 0;
  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center gap-4">
        <LogoPlaceholder name={company.name} size="lg" />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">
            <Link
              to="/companies/$companySlug"
              params={{ companySlug: company.slug ?? company.id }}
              className="before:absolute before:inset-0 hover:text-primary"
            >
              {company.name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{company.industry}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          <dd>{company.location}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 shrink-0" />
          <dd>{company.employees} employees</dd>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="size-4 shrink-0" />
          <dd>
            {openJobs} open {openJobs === 1 ? "position" : "positions"}
          </dd>
        </div>
      </dl>

      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        View company
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </article>
  );
}
