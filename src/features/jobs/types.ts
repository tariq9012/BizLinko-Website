import type { Tables } from "@/integrations/supabase/types";
import type { Job } from "@/types";

export type JobRow = Tables<"jobs">;
export type JobCategoryRow = Tables<"job_categories">;

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconKey: string | null;
}

export function mapCategoryRow(row: JobCategoryRow): JobCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    iconKey: row.icon_key,
  };
}

/** Shape returned when a job is selected with its related company/category joined in. */
export type JobRowWithRelations = JobRow & {
  companies: {
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    location: string | null;
  } | null;
  job_categories: { slug: string; name: string } | null;
};

const composeLocation = (city: string, country: string) =>
  [city, country].filter(Boolean).join(", ");

/**
 * Maps a database job row (with its company/category joined in) onto the
 * existing frontend `Job` shape, so JobCard/FilterSidebar/job detail pages
 * can keep working unmodified against real data.
 */
export function mapJobRow(row: JobRowWithRelations): Job {
  return {
    id: row.id,
    title: row.title,
    companyId: row.company_id,
    companyName: row.companies?.name ?? "Unknown company",
    location: composeLocation(row.city, row.country),
    type: row.employment_type,
    workMode: row.workplace_type,
    salaryMin: row.salary_min ?? 0,
    salaryMax: row.salary_max ?? 0,
    currency: row.salary_currency,
    experience: row.experience_level,
    category: row.job_categories?.slug ?? "",
    ...(row.job_categories?.name ? { categoryName: row.job_categories.name } : {}),
    ...(row.companies?.slug ? { companySlug: row.companies.slug } : {}),
    skills: row.skills,
    postedAt: row.published_at ?? row.created_at,
    featured: row.featured,
    summary: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    qualifications: row.qualifications,
    benefits: row.benefits,
    slug: row.slug,
    status: row.status,
    hideSalary: row.hide_salary,
    salaryPeriod: row.salary_period,
    applicationDeadline: row.application_deadline,
  };
}

export const JOB_SELECT_WITH_RELATIONS =
  "*, companies(id, name, slug, industry, location), job_categories(slug, name)";

/** Slugify a job title into a URL-safe, lowercase, hyphenated string. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
