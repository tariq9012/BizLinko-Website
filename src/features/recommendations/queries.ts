import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface RecommendedJob {
  jobId: string;
  title: string;
  companyName: string;
  companyLogo: string | null;
  city: string | null;
  country: string | null;
  workplaceType: Database["public"]["Enums"]["workplace_type"];
  employmentType: Database["public"]["Enums"]["employment_type"];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: Database["public"]["Enums"]["salary_period"];
  publishedAt: string | null;
  score: number;
  matchedSkills: string[];
  categoryMatch: boolean;
  experienceMatch: "exact" | "adjacent" | "none" | "unknown";
  locationMatch: boolean;
  alreadySaved: boolean;
}

type RecommendedJobRow = Database["public"]["Functions"]["get_recommended_jobs"]["Returns"][number];

function mapRecommendedJob(row: RecommendedJobRow): RecommendedJob {
  return {
    jobId: row.job_id,
    title: row.title,
    companyName: row.company_name,
    companyLogo: row.company_logo,
    city: row.city,
    country: row.country,
    workplaceType: row.workplace_type,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryPeriod: row.salary_period,
    publishedAt: row.published_at,
    score: row.score,
    matchedSkills: row.matched_skills ?? [],
    categoryMatch: row.category_match,
    experienceMatch: (row.experience_match as RecommendedJob["experienceMatch"]) ?? "unknown",
    locationMatch: row.location_match,
    alreadySaved: row.already_saved,
  };
}

/** Explains a recommendation in plain language — the DB computes the
 * signals (matched skills, category/experience/location fit); this just
 * turns them into sentences, so there's one formula, not two. */
export function explainRecommendation(job: RecommendedJob): string[] {
  const reasons: string[] = [];
  if (job.matchedSkills.length > 0) {
    reasons.push(`${job.matchedSkills.length} of your skills match`);
  }
  if (job.categoryMatch) {
    reasons.push("Same category as jobs you've saved or applied to");
  }
  if (job.experienceMatch === "exact") {
    reasons.push("Matches your experience level");
  }
  if (job.workplaceType === "Remote") {
    reasons.push("Remote role");
  } else if (job.locationMatch && job.city) {
    reasons.push(`Located in ${job.city}`);
  }
  if (reasons.length === 0) reasons.push("Recently posted in your field");
  return reasons;
}

/** Distinguishes "profile too empty for recommendations" from "profile is
 * fine, there just aren't matches right now" — get_recommended_jobs
 * returns zero rows in both cases, so the empty state needs this signal
 * to know which message to show (Phase 11 fix for the Phase 9 issue). */
export function useRecommendationProfileSufficient(userId: string | undefined) {
  return useQuery({
    queryKey: ["recommendation-profile-sufficient", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("recommendation_profile_sufficient");
      if (error) throw error;
      return data ?? false;
    },
  });
}

const PAGE_SIZE = 10;

export function useRecommendedJobs(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["recommended-jobs", userId],
    enabled: !!userId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_recommended_jobs", {
        p_page: pageParam,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      const rows = data.map(mapRecommendedJob);
      return { jobs: rows, page: pageParam, totalCount: data[0]?.total_count ?? 0 };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * PAGE_SIZE < lastPage.totalCount ? lastPage.page + 1 : undefined,
  });
}

/** Compact version for the dashboard widget — first page only, small limit. */
export function useTopRecommendedJobs(userId: string | undefined, limit = 4) {
  return useQuery({
    queryKey: ["recommended-jobs-top", userId, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recommended_jobs", {
        p_page: 1,
        p_page_size: limit,
      });
      if (error) throw error;
      return data.map(mapRecommendedJob);
    },
  });
}
