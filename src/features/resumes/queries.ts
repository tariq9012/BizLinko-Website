import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapResumeRow } from "./types";

export function useResumes() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["resumes", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", currentUser?.id as string)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapResumeRow);
    },
  });
}

/** A single resume by id. RLS decides visibility (own resume, or an
 * employer viewing it through a legitimate application), so this works
 * unmodified for both the job seeker's own resume manager and an
 * employer's applicant-detail view. */
export function useResume(resumeId: string | undefined) {
  return useQuery({
    queryKey: ["resume", resumeId],
    enabled: !!resumeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", resumeId as string)
        .maybeSingle();
      if (error) throw error;
      return data ? mapResumeRow(data) : null;
    },
  });
}
