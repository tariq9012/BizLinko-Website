import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface DiscoverableCandidate {
  candidateId: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  headline: string | null;
  currentJobTitle: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  openToWork: boolean;
  location: string | null;
}

export function candidateFullName(first: string | null, last: string | null) {
  return `${first ?? ""} ${last ?? ""}`.trim() || "Candidate";
}

export interface CandidateFilters {
  search: string;
  skills: string[];
  minYears: number | null;
  maxYears: number | null;
  location: string;
  openToWorkOnly: boolean;
}

const PAGE_SIZE = 20;

export function useDiscoverableCandidates(filters: CandidateFilters, page: number) {
  return useQuery({
    queryKey: ["discoverable-candidates", filters, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_discoverable_candidates", {
        p_search: filters.search || null,
        p_skills: filters.skills.length ? filters.skills : null,
        p_min_years: filters.minYears,
        p_max_years: filters.maxYears,
        p_location: filters.location || null,
        p_open_to_work: filters.openToWorkOnly ? true : null,
        p_page: page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      const rows: DiscoverableCandidate[] = data.map((r) => ({
        candidateId: r.candidate_id,
        firstName: r.first_name,
        lastName: r.last_name,
        avatar: r.avatar,
        headline: r.headline,
        currentJobTitle: r.current_job_title,
        yearsOfExperience: r.years_of_experience,
        skills: r.skills ?? [],
        openToWork: r.open_to_work,
        location: r.location,
      }));
      return { rows, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export interface CandidateDetail extends DiscoverableCandidate {
  bio: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  experience: {
    jobTitle: string;
    companyName: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
  }[];
  education: {
    institution: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];
}

export function useCandidateDetail(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-detail", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_candidate_detail_for_employer", {
        p_candidate_id: candidateId as string,
      });
      if (error) throw error;
      const r = data[0];
      if (!r) return null;
      const detail: CandidateDetail = {
        candidateId: r.candidate_id,
        firstName: r.first_name,
        lastName: r.last_name,
        avatar: r.avatar,
        headline: r.headline,
        currentJobTitle: r.current_job_title,
        yearsOfExperience: r.years_of_experience,
        skills: r.skills ?? [],
        openToWork: r.open_to_work,
        location: r.location,
        bio: r.bio,
        githubUrl: r.github_url,
        portfolioUrl: r.portfolio_url,
        experience: (r.experience as CandidateDetail["experience"]) ?? [],
        education: (r.education as CandidateDetail["education"]) ?? [],
      };
      return detail;
    },
  });
}

export function useSavedCandidates(page: number) {
  return useQuery({
    queryKey: ["saved-candidates", page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_saved_candidates", {
        p_page: page,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      const rows = data.map((r) => ({
        candidateId: r.candidate_id,
        firstName: r.first_name,
        lastName: r.last_name,
        avatar: r.avatar,
        headline: r.headline,
        yearsOfExperience: r.years_of_experience,
        skills: r.skills ?? [],
        openToWork: r.open_to_work,
        location: r.location,
        savedAt: r.saved_at,
      }));
      return { rows, totalCount: data[0]?.total_count ?? 0 };
    },
  });
}

export interface MatchingCandidate {
  candidateId: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  headline: string | null;
  yearsOfExperience: number | null;
  matchedSkills: string[];
  skills: string[];
  experienceMatch: "exact" | "adjacent" | "none" | "unknown";
  locationMatch: boolean;
  score: number;
}

type MatchingRow =
  Database["public"]["Functions"]["get_matching_candidates_for_job"]["Returns"][number];

function mapMatching(r: MatchingRow): MatchingCandidate {
  return {
    candidateId: r.candidate_id,
    firstName: r.first_name,
    lastName: r.last_name,
    avatar: r.avatar,
    headline: r.headline,
    yearsOfExperience: r.years_of_experience,
    matchedSkills: r.matched_skills ?? [],
    skills: r.skills ?? [],
    experienceMatch: (r.experience_match as MatchingCandidate["experienceMatch"]) ?? "unknown",
    locationMatch: r.location_match,
    score: r.score,
  };
}

export function useMatchingCandidates(jobId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["matching-candidates", jobId],
    enabled: !!jobId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_matching_candidates_for_job", {
        p_job_id: jobId as string,
        p_page: pageParam,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      const rows = data.map(mapMatching);
      return { rows, page: pageParam, totalCount: data[0]?.total_count ?? 0 };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * PAGE_SIZE < lastPage.totalCount ? lastPage.page + 1 : undefined,
  });
}

export function explainMatch(c: MatchingCandidate): string[] {
  const reasons: string[] = [];
  if (c.matchedSkills.length > 0) reasons.push(`${c.matchedSkills.length} matching skills`);
  if (c.experienceMatch === "exact") reasons.push("Matches the role's experience level");
  else if (c.experienceMatch === "adjacent") reasons.push("Close to the role's experience level");
  if (c.locationMatch) reasons.push("Location/workplace compatible");
  if (reasons.length === 0) reasons.push("Open to work in this field");
  return reasons;
}
