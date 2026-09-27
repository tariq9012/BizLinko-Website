import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import type { CareerResource } from "@/types";
import { Tag } from "@/components/common/Tag";

export function ResourceCard({ resource }: { resource: CareerResource }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
      <Tag tone="primary" className="self-start">
        {resource.category}
      </Tag>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-foreground">
        <Link
          to="/career-resources"
          hash={resource.id}
          className="before:absolute before:inset-0 hover:text-primary"
        >
          {resource.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {resource.description}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> {resource.readingTime}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Read article
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
