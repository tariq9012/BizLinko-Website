import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/common/Tag";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { featuredResource, resourceCategories, resources } from "@/data/resources";
import { formatDate } from "@/lib/format";

const title = "Career Resources — Resume, Interview and Job Search Guides | BizLinko";
const description =
  "Practical career guides from BizLinko: resume writing, interview preparation, job search strategy and negotiating offers.";

export const Route = createFileRoute("/career-resources")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CareerResourcesPage,
});

const tips = [
  "Tailor the top third of your resume to each role you apply for.",
  "Track every application with the date, contact and current stage.",
  "Prepare three project stories you can adapt to most interview questions.",
  "Follow up once, politely, about a week after applying.",
];

function CareerResourcesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const results = useMemo(
    () =>
      resources.filter((r) => {
        const q = query.trim().toLowerCase();
        if (q && !`${r.title} ${r.description} ${r.category}`.toLowerCase().includes(q))
          return false;
        if (category !== "All" && r.category !== category) return false;
        return true;
      }),
    [query, category],
  );

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10 md:py-14">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Career Resources
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Guides and practical advice to help you apply with confidence and grow your career.
          </p>

          <div className="mt-6 flex max-w-xl items-center gap-2.5 rounded-xl border border-border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources"
              aria-label="Search resources"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {["All", ...resourceCategories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={
                  category === c
                    ? "rounded-lg border border-transparent bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <article
          id={featuredResource.id}
          className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:grid-cols-[1.2fr_1fr] md:p-8"
        >
          <div>
            <Tag tone="primary">Featured · {featuredResource.category}</Tag>
            <h2 className="mt-4 text-xl font-bold text-foreground sm:text-2xl">
              {featuredResource.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {featuredResource.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> {featuredResource.readingTime}
              </span>
              <span>{formatDate(featuredResource.publishedAt)}</span>
            </div>
            <Button className="mt-6" asChild>
              <a href={`#${featuredResource.id}-body`}>Read Article</a>
            </Button>
          </div>
          <div
            id={`${featuredResource.id}-body`}
            className="space-y-3 rounded-2xl bg-surface p-5 text-sm leading-relaxed text-muted-foreground"
          >
            {featuredResource.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </article>

        <div className="mt-14">
          <SectionHeader
            title="All Resources"
            description="Resume guides, interview preparation and job search strategy."
          />
          {results.length === 0 ? (
            <EmptyState
              title="No resources match your search"
              description="Try another keyword or choose a different category."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                >
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-14 rounded-3xl border border-border bg-surface p-6 md:p-10">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Quick career tips</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {tips.map((t, i) => (
              <li
                key={t}
                className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
