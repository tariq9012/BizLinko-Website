import type { Tables } from "@/integrations/supabase/types";

export type ExperienceRow = Tables<"profile_experience">;
export type EducationRow = Tables<"profile_education">;

export interface Experience {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  location: string | null;
  employmentType: ExperienceRow["employment_type"];
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export function mapExperienceRow(row: ExperienceRow): Experience {
  return {
    id: row.id,
    userId: row.user_id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    location: row.location,
    employmentType: row.employment_type,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: row.is_current,
    description: row.description,
  };
}

export interface Education {
  id: string;
  userId: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  description: string | null;
}

export function mapEducationRow(row: EducationRow): Education {
  return {
    id: row.id,
    userId: row.user_id,
    institution: row.institution,
    degree: row.degree,
    fieldOfStudy: row.field_of_study,
    startDate: row.start_date,
    endDate: row.end_date,
    grade: row.grade,
    description: row.description,
  };
}
