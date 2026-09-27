import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type { ExperienceFormValues, EducationFormValues } from "./schemas";

function experienceInsert(values: ExperienceFormValues, userId: string) {
  return {
    user_id: userId,
    job_title: values.jobTitle,
    company_name: values.companyName,
    location: values.location || null,
    employment_type: values.employmentType,
    start_date: values.startDate,
    end_date: values.isCurrent ? null : values.endDate || null,
    is_current: values.isCurrent,
    description: values.description || null,
  };
}

function educationInsert(values: EducationFormValues, userId: string) {
  return {
    user_id: userId,
    institution: values.institution,
    degree: values.degree || null,
    field_of_study: values.fieldOfStudy || null,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
    grade: values.grade || null,
    description: values.description || null,
  };
}

function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return (userId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["profile-experience", userId] });
    void queryClient.invalidateQueries({ queryKey: ["profile-education", userId] });
  };
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ userId, patch }: { userId: string; patch: TablesUpdate<"profiles"> }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    },
  });
}

export function useAddExperience() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({ values, userId }: { values: ExperienceFormValues; userId: string }) => {
      const { error } = await supabase
        .from("profile_experience")
        .insert(experienceInsert(values, userId));
      if (error) throw error;
    },
    onSuccess: (_d, { userId }) => invalidate(userId),
  });
}

export function useUpdateExperience() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      userId,
    }: {
      id: string;
      values: ExperienceFormValues;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("profile_experience")
        .update(experienceInsert(values, userId))
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { userId }) => invalidate(userId),
  });
}

export function useDeleteExperience() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase.from("profile_experience").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { userId }) => invalidate(userId),
  });
}

export function useAddEducation() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({ values, userId }: { values: EducationFormValues; userId: string }) => {
      const { error } = await supabase
        .from("profile_education")
        .insert(educationInsert(values, userId));
      if (error) throw error;
    },
    onSuccess: (_d, { userId }) => invalidate(userId),
  });
}

export function useUpdateEducation() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      userId,
    }: {
      id: string;
      values: EducationFormValues;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("profile_education")
        .update(educationInsert(values, userId))
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { userId }) => invalidate(userId),
  });
}

export function useDeleteEducation() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase.from("profile_education").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { userId }) => invalidate(userId),
  });
}
