import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  JOB_SELECT_WITH_RELATIONS,
  mapJobRow,
  type JobRowWithRelations,
} from "@/features/jobs/types";
import { mapCompanyRow, type CompanyRow } from "./types";

export interface CompanyFilters {
  keyword?: string | undefined;
  industry?: string | undefined;
  location?: string | undefined;
}

const PAGE_SIZE = 9;

export function useCompanies(filters: CompanyFilters, page: number) {
  return useQuery({
    queryKey: ["companies", filters, page],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("*", { count: "exact" })
        .eq("status", "active")
        .order("name");

      const keyword = filters.keyword?.trim();
      if (keyword) query = query.ilike("name", `%${keyword}%`);
      if (filters.industry) query = query.eq("industry", filters.industry);
      const location = filters.location?.trim();
      if (location) query = query.ilike("location", `%${location}%`);

      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;

      const companyIds = data.map((c) => c.id);
      const counts = companyIds.length
        ? await supabase.from("company_open_job_counts").select("*").in("company_id", companyIds)
        : { data: [] as { company_id: string; open_job_count: number }[] };
      const countByCompany = new Map(counts.data?.map((c) => [c.company_id, c.open_job_count]));

      return {
        companies: (data as CompanyRow[]).map((row) =>
          mapCompanyRow(row, countByCompany.get(row.id) ?? 0),
        ),
        total: count ?? 0,
      };
    },
  });
}

/** Shared with the /companies/$companySlug route loader (SEO head) — see
 * companies.$companySlug.tsx. Same queryKey, so no duplicate fetch. */
export function companyBySlugQueryOptions(slug: string) {
  return {
    queryKey: ["company", slug] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: countRow } = await supabase
        .from("company_open_job_counts")
        .select("open_job_count")
        .eq("company_id", data.id)
        .maybeSingle();

      return mapCompanyRow(data as CompanyRow, countRow?.open_job_count ?? 0);
    },
  };
}

export function useCompanyBySlug(slug: string | undefined) {
  return useQuery({
    ...companyBySlugQueryOptions(slug as string),
    enabled: !!slug,
  });
}

export function useCompanyOpenJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-open-jobs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT_WITH_RELATIONS)
        .eq("company_id", companyId as string)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as JobRowWithRelations[]).map(mapJobRow);
    },
  });
}

/** Companies with at least one open job, most active hiring first — used
 * for the homepage's "Top Companies" widget. */
export function useFeaturedCompanies(limit = 6) {
  return useQuery({
    queryKey: ["featured-companies", limit],
    queryFn: async () => {
      const { data: counts, error: countsError } = await supabase
        .from("company_open_job_counts")
        .select("*")
        .gt("open_job_count", 0)
        .order("open_job_count", { ascending: false })
        .limit(limit);
      if (countsError) throw countsError;
      if (!counts.length) return [];

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .in(
          "id",
          counts.map((c) => c.company_id),
        )
        .eq("status", "active");
      if (error) throw error;

      const countByCompany = new Map(counts.map((c) => [c.company_id, c.open_job_count]));
      return (data as CompanyRow[])
        .map((row) => mapCompanyRow(row, countByCompany.get(row.id) ?? 0))
        .sort((a, b) => (b.openJobCount ?? 0) - (a.openJobCount ?? 0));
    },
  });
}
