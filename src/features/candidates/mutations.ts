import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSaveCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from("saved_candidates")
        .insert({ candidate_user_id: candidateId });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-candidates"] }),
  });
}

export function useUnsaveCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from("saved_candidates")
        .delete()
        .eq("candidate_user_id", candidateId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-candidates"] }),
  });
}
