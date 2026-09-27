import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Tag } from "@/components/common/Tag";
import { useFeaturedJobs } from "@/features/jobs/queries";
import { formatSalary } from "@/lib/format";

const popular = ["React", "Product", "Data", "Design", "Remote"];

export function Hero() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const { data: featuredJobs = [] } = useFeaturedJobs(3);

  const search = () =>
    navigate({
      to: "/jobs",
      search: {
        ...(keyword ? { q: keyword } : {}),
        ...(location ? { location } : {}),
      },
    });

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 size-[32rem] rounded-full bg-primary-soft blur-3xl"
      />
      <div className="container-page relative grid gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Connect Talent With Opportunity
          </span>

          <h1 className="mt-5 text-3xl font-bold leading-[1.1] text-foreground sm:text-4xl lg:text-5xl">
            Find the Right Job.
            <span className="block text-primary">Build Your Future.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Discover opportunities from trusted companies and connect your skills with careers that
            move you forward.
          </p>

          <SearchBar
            className="mt-8"
            keyword={keyword}
            location={location}
            onKeywordChange={setKeyword}
            onLocationChange={setLocation}
            onSubmit={search}
            extra={
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                <SlidersHorizontal className="size-3.5" />
                Advanced search and filters
              </Link>
            }
          />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Popular:</span>
            {popular.map((p) => (
              <Link
                key={p}
                to="/jobs"
                search={{ q: p }}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {p}
              </Link>
            ))}
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              { icon: BadgeCheck, value: "3,500+", label: "Open roles" },
              { icon: Building2, value: "820+", label: "Hiring companies" },
              { icon: Users, value: "64k", label: "Professionals" },
            ].map((s) => (
              <div key={s.label}>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className="size-3.5 text-primary" />
                  {s.label}
                </dt>
                <dd className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card-hover)] sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Recommended for you</p>
              <Tag tone="success">Live</Tag>
            </div>
            <div className="mt-4 space-y-3">
              {featuredJobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <LogoPlaceholder name={job.companyName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.companyName} · {job.workMode}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs font-medium text-foreground sm:block">
                    {formatSalary(job)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Profile strength</p>
                <p className="mt-1 text-lg font-bold text-foreground">86%</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 w-[86%] rounded-full bg-primary" />
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Applications</p>
                <p className="mt-1 text-lg font-bold text-foreground">12</p>
                <p className="mt-2 text-xs text-success">4 in review</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
