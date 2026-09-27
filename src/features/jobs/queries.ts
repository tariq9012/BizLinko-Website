import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Job, JobFilters } from "@/types";
import {
  JOB_SELECT_WITH_RELATIONS,
  mapCategoryRow,
  mapJobRow,
  type JobRowWithRelations,
} from "./types";

export function useJobCategories() {
  return useQuery({
    queryKey: ["job-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_categories")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data.map(mapCategoryRow);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useJobCategoriesWithCounts() {
  return useQuery({
    queryKey: ["job-categories-with-counts"],
    queryFn: async () => {
      const [{ data: categories, error: catError }, { data: counts, error: countError }] =
        await Promise.all([
          supabase.from("job_categories").select("*").eq("active", true).order("name"),
          supabase.from("job_category_counts").select("*"),
        ]);
      if (catError) throw catError;
      if (countError) throw countError;
      const countBySlug = new Map(counts.map((c) => [c.slug, c.published_count]));
      return categories.map((c) => ({
        ...mapCategoryRow(c),
        jobCount: countBySlug.get(c.slug) ?? 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type SortKey = "relevance" | "recent" | "oldest" | "salary-high" | "salary-low" | "title";

export interface PublicJobsParams {
  filters: JobFilters;
  categoryIdBySlug: Record<string, string>;
  sort: SortKey;
  page: number;
  pageSize: number;
}

export interface PublicJobsResult {
  jobs: Job[];
  total: number;
}

/**
 * Fetches a page of published jobs. `search_job_ids` (a Postgres function)
 * is the single source of truth for which jobs match, in what order, and
 * on which page — it combines full-text search with a `pg_trgm` typo-
 * tolerant fallback and enforces Phase 8 moderation (published, not
 * removed, company not suspended). This function only turns that ranked
 * id list into full job rows, reusing the existing join/mapping code
 * rather than re-deriving it in SQL.
 */
async function fetchPublicJobs({
  filters,
  categoryIdBySlug,
  sort,
  page,
  pageSize,
}: PublicJobsParams): Promise<PublicJobsResult> {
  const categoryId = filters.category ? (categoryIdBySlug[filters.category] ?? null) : null;

  const { data: ranked, error: rankError } = await supabase.rpc("search_job_ids", {
    p_keyword: filters.keyword.trim() || null,
    p_location: filters.location.trim() || null,
    p_category_id: categoryId,
    p_employment_types: filters.types.length ? filters.types : null,
    p_workplace_types: filters.workModes.length ? filters.workModes : null,
    p_experience_levels: filters.experience.length ? filters.experience : null,
    p_min_salary: filters.minSalary || null,
    p_max_salary: filters.maxSalary || null,
    p_salary_period: filters.salaryPeriod || null,
    p_skills: filters.skills.length ? filters.skills : null,
    p_date_posted: filters.datePosted !== "any" ? filters.datePosted : null,
    p_verified_only: filters.verifiedOnly,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  });
  if (rankError) throw rankError;

  const ids = ranked.map((r) => r.job_id);
  const total = ranked[0]?.total_count ?? 0;
  if (ids.length === 0) return { jobs: [], total };

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT_WITH_RELATIONS)
    .in("id", ids);
  if (error) throw error;

  const byId = new Map(
    (data as unknown as JobRowWithRelations[]).map((row) => [row.id, mapJobRow(row)]),
  );
  const jobs = ids.map((id) => byId.get(id)).filter((j): j is Job => !!j);
  return { jobs, total };
}

export function usePublicJobs(params: PublicJobsParams) {
  return useQuery({
    queryKey: ["public-jobs", params],
    queryFn: () => fetchPublicJobs(params),
    placeholderData: (prev) => prev,
  });
}

/** A single job by id. RLS alone decides visibility: published jobs are open
 * to everyone; a draft/closed job is only returned when the caller is the
 * owning employer or an admin — so this hook works unmodified for both the
 * public detail page and an employer's own draft preview. */
/** Shared with the /jobs/$jobId route loader, which pre-fetches this for
 * SEO metadata (see jobs.$jobId.tsx) — same queryKey means the component's
 * useJob() below reads the already-loaded cache, no duplicate fetch. */
export function jobQueryOptions(jobId: string) {
  return {
    queryKey: ["job", jobId] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT_WITH_RELATIONS)
        .eq("id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapJobRow(data as unknown as JobRowWithRelations) : null;
    },
  };
}

export function useJob(jobId: string | undefined) {
  return useQuery({
    ...jobQueryOptions(jobId as string),
    enabled: !!jobId,
  });
}

/** Every job belonging to the given company, any status — used on the
 * employer's own job-management page. RLS restricts this to jobs the
 * caller's company actually owns regardless of the company_id passed in. */
export function useEmployerJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["employer-jobs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT_WITH_RELATIONS)
        .eq("company_id", companyId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as JobRowWithRelations[]).map(mapJobRow);
    },
  });
}

export function useFeaturedJobs(limit = 6) {
  return useQuery({
    queryKey: ["featured-jobs", limit],
    queryFn: async () => {
      const query = supabase
        .from("jobs")
        .select(JOB_SELECT_WITH_RELATIONS)
        .eq("status", "published")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(limit);
      let { data, error } = await query;
      if (error) throw error;
      // Fall back to the most recent published jobs if nothing is
      // explicitly marked featured yet, so the homepage is never empty.
      if (!data || data.length === 0) {
        ({ data, error } = await supabase
          .from("jobs")
          .select(JOB_SELECT_WITH_RELATIONS)
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(limit));
        if (error) throw error;
      }
      return (data as unknown as JobRowWithRelations[]).map(mapJobRow);
    },
  });
}

export function useRecentJobs(limit = 6) {
  return useQuery({
    queryKey: ["recent-jobs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT_WITH_RELATIONS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as unknown as JobRowWithRelations[]).map(mapJobRow);
    },
  });
}
/** Deterministic similarity (category, skill overlap, city, workplace
 * type — see get_similar_jobs' SQL comment for the exact scoring), not a
 * personalized recommendation. Safe for anonymous visitors. */
export function useSimilarJobs(job: Job | null | undefined) {
  return useQuery({
    queryKey: ["similar-jobs", job?.id],
    enabled: !!job,
    queryFn: async () => {
      if (!job) return [];
      const { data: ranked, error: rankError } = await supabase.rpc("get_similar_jobs", {
        p_job_id: job.id,
        p_limit: 4,
      });
      if (rankError) throw rankError;
      const ids = ranked.map((r) => r.job_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT_WITH_RELATIONS)
        .in("id", ids);
      if (error) throw error;
      const byId = new Map(
        (data as unknown as JobRowWithRelations[]).map((row) => [row.id, mapJobRow(row)]),
      );
      return ids.map((id) => byId.get(id)).filter((j): j is Job => !!j);
    },
  });
}

export interface SearchSuggestion {
  suggestion: string;
  kind: "title" | "company" | "skill" | "location";
}

/** Autocomplete for the jobs search bar — debounced by the caller. */
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ["search-suggestions", query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_search_suggestions", {
        p_query: query.trim(),
        p_limit: 8,
      });
      if (error) throw error;
      return data as SearchSuggestion[];
    },
    staleTime: 60_000,
  });
}
