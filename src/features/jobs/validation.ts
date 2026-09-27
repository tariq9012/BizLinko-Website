import { z } from "zod";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
const WORKPLACE_TYPES = ["Remote", "Hybrid", "On-site"] as const;
const EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Lead"] as const;
const SALARY_PERIODS = ["year", "month", "hour"] as const;

/** Converts a textarea's newline-separated lines into a clean string[] for storage. */
export function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Converts a comma-or-newline separated skills field into a clean string[]. */
export function skillsToArray(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
    categoryId: z.string().min(1, "Please choose a category"),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    workplaceType: z.enum(WORKPLACE_TYPES),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
    city: z.string().trim().min(1, "City is required").max(100),
    country: z.string().trim().min(1, "Country is required").max(100),
    salaryMin: z.string().trim(),
    salaryMax: z.string().trim(),
    salaryCurrency: z.string().trim().min(1).max(8),
    salaryPeriod: z.enum(SALARY_PERIODS),
    hideSalary: z.boolean(),
    description: z.string().trim().min(50, "Please write at least 50 characters"),
    responsibilities: z.string().trim().min(1, "Add at least one responsibility"),
    requirements: z.string().trim().min(1, "Add at least one requirement"),
    qualifications: z.string().trim(),
    benefits: z.string().trim(),
    skills: z.string().trim(),
    applicationDeadline: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const min = data.salaryMin ? Number(data.salaryMin) : undefined;
    const max = data.salaryMax ? Number(data.salaryMax) : undefined;
    if (data.salaryMin && (Number.isNaN(min) || (min ?? 0) < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid amount",
        path: ["salaryMin"],
      });
    }
    if (data.salaryMax && (Number.isNaN(max) || (max ?? 0) < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid amount",
        path: ["salaryMax"],
      });
    }
    if (
      min !== undefined &&
      max !== undefined &&
      !Number.isNaN(min) &&
      !Number.isNaN(max) &&
      min > max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum salary can't be greater than maximum",
        path: ["salaryMax"],
      });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const jobFormDefaults: JobFormValues = {
  title: "",
  categoryId: "",
  employmentType: "Full-time",
  workplaceType: "On-site",
  experienceLevel: "Entry",
  city: "",
  country: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "USD",
  salaryPeriod: "year",
  hideSalary: false,
  description: "",
  responsibilities: "",
  requirements: "",
  qualifications: "",
  benefits: "",
  skills: "",
  applicationDeadline: "",
};
