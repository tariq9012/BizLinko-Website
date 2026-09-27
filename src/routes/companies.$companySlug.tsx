import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Globe,
  Linkedin,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/common/Tag";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";
import { JobCard } from "@/components/jobs/JobCard";
import {
  useCompanyBySlug,
  useCompanyOpenJobs,
  companyBySlugQueryOptions,
} from "@/features/companies/queries";
import { useAuth } from "@/hooks/useAuth";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ENTITY_REPORT_REASONS } from "@/features/admin/types";
import type { Company } from "@/types";

export const Route = createFileRoute("/companies/$companySlug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(companyBySlugQueryOptions(params.companySlug)),
  head: ({ loaderData }) => {
    const company = loaderData as Company | null;
    if (!company) {
      return {
        meta: [{ title: "Company not found — BizLinko" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${company.name} — Careers & Jobs — BizLinko`;
    const description = (
      company.about || `Open roles and company profile for ${company.name} on BizLinko.`
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CompanyDetailPage,
});

function CompanyDetailPage() {
  const { companySlug } = Route.useParams();
  const { data: company, isPending, isError } = useCompanyBySlug(companySlug);
  const { data: openJobs = [] } = useCompanyOpenJobs(company?.id);
  const { isAuthenticated } = useAuth();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Company not found"
          description="This company may have been removed, or the link is incorrect."
          action={
            <Button variant="outline" asChild>
              <Link to="/companies">Browse all companies</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      {company.coverImageUrl && (
        <div className="h-40 w-full overflow-hidden bg-secondary sm:h-56">
          <img src={company.coverImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <section className="border-b border-border bg-surface">
        <div className="container-page py-8 md:py-12">
          <nav className="mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/companies" className="hover:text-primary">
              Companies
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{company.name}</span>
          </nav>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt=""
                className="size-16 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <LogoPlaceholder name={company.name} size="lg" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{company.name}</h1>
                {company.verified && (
                  <Tag tone="primary">
                    <BadgeCheck className="size-3.5" /> Verified
                  </Tag>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {company.industry && (
                  <Tag>
                    <Building2 className="size-3.5" /> {company.industry}
                  </Tag>
                )}
                {company.location && (
                  <Tag>
                    <MapPin className="size-3.5" /> {company.location}
                  </Tag>
                )}
                {company.employees && (
                  <Tag>
                    <Users className="size-3.5" /> {company.employees} employees
                  </Tag>
                )}
                {company.founded && (
                  <Tag>
                    <Calendar className="size-3.5" /> Founded {company.founded}
                  </Tag>
                )}
              </div>
            </div>
            {isAuthenticated && (
              <ReportDialog
                entityType="company"
                entityId={company.id}
                targetLabel={company.name}
                reasons={ENTITY_REPORT_REASONS}
              />
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {company.about && (
              <section>
                <h2 className="text-lg font-semibold text-foreground">About {company.name}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {company.about}
                </p>
              </section>
            )}

            <section className="border-t border-border pt-6">
              <SectionHeader
                title="Open positions"
                description={
                  openJobs.length === 0
                    ? "This company currently has no open positions."
                    : `${openJobs.length} open ${openJobs.length === 1 ? "role" : "roles"}`
                }
              />
              {openJobs.length > 0 && (
                <div className="mt-5 grid gap-4">
                  {openJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Briefcase className="size-4 text-primary" /> Quick facts
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                {company.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
                {company.linkedinUrl && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="size-4 shrink-0 text-muted-foreground" />
                    <a
                      href={company.linkedinUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-primary hover:underline"
                    >
                      LinkedIn
                    </a>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
