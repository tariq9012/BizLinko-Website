import type { Tables } from "@/integrations/supabase/types";
import type { Company } from "@/types";

export type CompanyRow = Tables<"companies">;

export function mapCompanyRow(row: CompanyRow, openJobCount?: number): Company {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry ?? "",
    location: row.location ?? "",
    employees: row.employee_count ?? "",
    website: row.website ?? "",
    founded: row.founded_year ? String(row.founded_year) : "",
    about: row.description ?? "",
    overview: [],
    slug: row.slug,
    logoUrl: row.logo,
    coverImageUrl: row.cover_image_url,
    linkedinUrl: row.linkedin_url,
    verified: row.verified,
    ...(openJobCount !== undefined ? { openJobCount } : {}),
  };
}
