import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Code2,
  Handshake,
  Headphones,
  LineChart,
  Megaphone,
  PenTool,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types";

const icons: Record<string, LucideIcon> = {
  Code2,
  PenTool,
  Megaphone,
  LineChart,
  Handshake,
  BarChart3,
  Users,
  Headphones,
  Boxes,
};

export function CategoryCard({ category }: { category: Category }) {
  const Icon = icons[category.icon] ?? Boxes;

  return (
    <Link
      to="/jobs"
      search={{ category: category.slug }}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {category.name}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {category.jobCount.toLocaleString()} jobs available
        </span>
      </span>
    </Link>
  );
}
