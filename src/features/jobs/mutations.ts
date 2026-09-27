import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { linesToArray, skillsToArray, type JobFormValues } from "./validation";
import { slugify } from "./types";

export function jobInsertFromForm(
  values: JobFormValues,
  companyId: string,
  createdBy: string,
  status: "draft" | "published",
): TablesInsert<"jobs"> {
  return {
    company_id: companyId,
    created_by: createdBy,
    category_id: values.categoryId,
    title: values.title,
    slug: `${slugify(values.title)}-${Date.now().toString(36)}`,
    description: values.description,
    responsibilities: linesToArray(values.responsibilities),
    requirements: linesToArray(values.requirements),
    qualifications: linesToArray(values.qualifications),
    benefits: linesToArray(values.benefits),
    employment_type: values.employmentType,
    workplace_type: values.workplaceType,
    experience_level: values.experienceLevel,
    city: values.city,
    country: values.country,
    salary_min: values.salaryMin ? Number(values.salaryMin) : null,
    salary_max: values.salaryMax ? Number(values.salaryMax) : null,
    salary_currency: values.salaryCurrency || "USD",
    salary_period: values.salaryPeriod,
    hide_salary: values.hideSalary,
    skills: skillsToArray(values.skills),
    status,
    application_deadline: values.applicationDeadline || null,
  };
}

export function jobUpdateFromForm(
  values: JobFormValues,
  status?: "draft" | "published",
): TablesUpdate<"jobs"> {
  return {
    category_id: values.categoryId,
    title: values.title,
    description: values.description,
    responsibilities: linesToArray(values.responsibilities),
    requirements: linesToArray(values.requirements),
    qualifications: linesToArray(values.qualifications),
    benefits: linesToArray(values.benefits),
    employment_type: values.employmentType,
    workplace_type: values.workplaceType,
    experience_level: values.experienceLevel,
    city: values.city,
    country: values.country,
    salary_min: values.salaryMin ? Number(values.salaryMin) : null,
    salary_max: values.salaryMax ? Number(values.salaryMax) : null,
    salary_currency: values.salaryCurrency || "USD",
    salary_period: values.salaryPeriod,
    hide_salary: values.hideSalary,
    skills: skillsToArray(values.skills),
    application_deadline: values.applicationDeadline || null,
    ...(status ? { status } : {}),
  };
}

function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return (companyId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["employer-jobs", companyId] });
    void queryClient.invalidateQueries({ queryKey: ["public-jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["job"] });
  };
}

export function useCreateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (input: TablesInsert<"jobs">) => {
      const { data, error } = await supabase.from("jobs").insert(input).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => invalidate(input.company_id),
  });
}

export function useUpdateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async ({
      id,
      companyId,
      patch,
    }: {
      id: string;
      companyId: string;
      patch: TablesUpdate<"jobs">;
    }) => {
      const { error } = await supabase.from("jobs").update(patch).eq("id", id);
      if (error) throw error;
      return { id, companyId };
    },
    onSuccess: ({ companyId }) => invalidate(companyId),
  });
}

export function useSetJobStatus() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async ({
      id,
      companyId,
      status,
    }: {
      id: string;
      companyId: string;
      status: "draft" | "published" | "closed" | "archived";
    }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
      return { id, companyId };
    },
    onSuccess: ({ companyId }) => invalidate(companyId),
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async ({ id }: { id: string; companyId: string }) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { companyId }) => invalidate(companyId),
  });
}

/** Duplicates a job as a new draft (new id/slug, status reset to draft, no
 * publish/close timestamps carried over). */
export function useDuplicateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { data: original, error: fetchError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        published_at: _publishedAt,
        closed_at: _closedAt,
        search_vector: _searchVector,
        slug,
        title,
        ...rest
      } = original as Record<string, unknown> & { slug: string; title: string };

      const insert = {
        ...rest,
        title: `${title} (Copy)`,
        slug: `${slugify(title)}-copy-${Date.now().toString(36)}`,
        status: "draft" as const,
      };

      const { error } = await supabase.from("jobs").insert(insert as TablesInsert<"jobs">);
      if (error) throw error;
      return { companyId };
    },
    onSuccess: ({ companyId }) => invalidate(companyId),
  });
}
