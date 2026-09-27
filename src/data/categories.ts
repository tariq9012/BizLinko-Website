// NOTE (Phase 5 update): `job_categories` in the database is the source of
// truth everywhere now — including the homepage's PopularCategories widget,
// which was converted in Phase 5 (see
// `src/features/jobs/queries.ts#useJobCategoriesWithCounts`). This static
// list only remains as: (1) FilterSidebar's default prop value if no live
// categories are passed in, and (2) a display-name fallback on the job
// detail page if a job's category was ever removed from the database.
import type { Category } from "@/types";

export const categories: Category[] = [
  { slug: "software-development", name: "Software Development", icon: "Code2", jobCount: 1284 },
  { slug: "design", name: "Design", icon: "PenTool", jobCount: 412 },
  { slug: "marketing", name: "Marketing", icon: "Megaphone", jobCount: 356 },
  { slug: "finance", name: "Finance", icon: "LineChart", jobCount: 298 },
  { slug: "sales", name: "Sales", icon: "Handshake", jobCount: 341 },
  { slug: "data-analytics", name: "Data & Analytics", icon: "BarChart3", jobCount: 267 },
  { slug: "human-resources", name: "Human Resources", icon: "Users", jobCount: 174 },
  { slug: "customer-support", name: "Customer Support", icon: "Headphones", jobCount: 209 },
  { slug: "product", name: "Product", icon: "Boxes", jobCount: 188 },
];

export const getCategoryName = (slug: string) =>
  categories.find((c) => c.slug === slug)?.name ?? slug;
