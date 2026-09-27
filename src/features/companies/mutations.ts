import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { slugify } from "@/features/jobs/types";

/** Generates a unique company slug, appending a short random suffix only
 * if the plain slug is already taken (kept short: most names won't
 * collide, so most companies get a clean human-readable URL). */
export async function generateUniqueCompanySlug(name: string): Promise<string> {
  const base = slugify(name) || "company";
  const { data } = await supabase.from("companies").select("slug").eq("slug", base).maybeSingle();
  if (!data) return base;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"companies">) => {
      const { data, error } = await supabase.from("companies").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (company) => {
      void queryClient.invalidateQueries({ queryKey: ["employer-company", company.owner_id] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ownerId,
      patch,
    }: {
      id: string;
      ownerId: string;
      patch: TablesUpdate<"companies">;
    }) => {
      const { error } = await supabase.from("companies").update(patch).eq("id", id);
      if (error) throw error;
      return { ownerId };
    },
    onSuccess: ({ ownerId }) => {
      void queryClient.invalidateQueries({ queryKey: ["employer-company", ownerId] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}
