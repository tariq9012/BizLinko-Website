import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobFilters } from "@/types";

export interface RecentSearch {
  id: string;
  query: string | null;
  filters: JobFilters | Record<string, never>;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: JobFilters | Record<string, never>;
  createdAt: string;
  updatedAt: string;
  emailAlertEnabled: boolean;
  alertFrequency: "daily" | "weekly";
}

export function useRecentSearches(userId: string | undefined) {
  return useQuery({
    queryKey: ["recent-searches", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recent_job_searches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data.map((r): RecentSearch => ({
        id: r.id,
        query: r.query,
        filters: (r.filters as unknown as JobFilters) ?? {},
        createdAt: r.created_at,
      }));
    },
  });
}

export function useSaveRecentSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ query, filters }: { query: string; filters: Partial<JobFilters> }) => {
      const { error } = await supabase
        .from("recent_job_searches")
        .insert({ query: query || null, filters });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recent-searches"] }),
  });
}

export function useDeleteRecentSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recent_job_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recent-searches"] }),
  });
}

export function useClearRecentSearches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("recent_job_searches").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recent-searches"] }),
  });
}

export function useSavedSearches(userId: string | undefined) {
  return useQuery({
    queryKey: ["saved-searches", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_job_searches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((r): SavedSearch => ({
        id: r.id,
        name: r.name,
        query: r.query,
        filters: (r.filters as unknown as JobFilters) ?? {},
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        emailAlertEnabled: r.email_alert_enabled,
        alertFrequency: r.alert_frequency as "daily" | "weekly",
      }));
    },
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      query,
      filters,
    }: {
      name: string;
      query: string;
      filters: Partial<JobFilters>;
    }) => {
      const { error } = await supabase
        .from("saved_job_searches")
        .insert({ name, query: query || null, filters });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}

export function useRenameSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("saved_job_searches").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}

export function useUpdateSavedSearchAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      emailAlertEnabled,
      alertFrequency,
    }: {
      id: string;
      emailAlertEnabled?: boolean;
      alertFrequency?: "daily" | "weekly";
    }) => {
      const { error } = await supabase
        .from("saved_job_searches")
        .update({
          ...(emailAlertEnabled !== undefined ? { email_alert_enabled: emailAlertEnabled } : {}),
          ...(alertFrequency !== undefined ? { alert_frequency: alertFrequency } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_job_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}
