import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** The signed-in employer's own company (by companies.owner_id), or null if
 * they haven't created one yet. Every job mutation needs this id — never
 * trust a company id that came from the browser alone. */
export function useEmployerCompany() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["employer-company", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", currentUser?.id as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
