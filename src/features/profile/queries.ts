import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapEducationRow, mapExperienceRow } from "./types";

export function useExperiences(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-experience", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_experience")
        .select("*")
        .eq("user_id", userId as string)
        .order("is_current", { ascending: false })
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data.map(mapExperienceRow);
    },
  });
}

export function useEducations(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-education", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_education")
        .select("*")
        .eq("user_id", userId as string)
        .order("start_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data.map(mapEducationRow);
    },
  });
}
