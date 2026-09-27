import { z } from "zod";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;

export const experienceFormSchema = z
  .object({
    jobTitle: z.string().trim().min(1, "Job title is required").max(150),
    companyName: z.string().trim().min(1, "Company name is required").max(150),
    location: z.string().trim().max(150).optional().or(z.literal("")),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().or(z.literal("")),
    isCurrent: z.boolean(),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.isCurrent && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an end date, or mark this as your current role",
        path: ["endDate"],
      });
    }
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date can't be before the start date",
        path: ["endDate"],
      });
    }
  });

export type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

export const experienceFormDefaults: ExperienceFormValues = {
  jobTitle: "",
  companyName: "",
  location: "",
  employmentType: "Full-time",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
};

export const educationFormSchema = z
  .object({
    institution: z.string().trim().min(1, "Institution is required").max(150),
    degree: z.string().trim().max(150).optional().or(z.literal("")),
    fieldOfStudy: z.string().trim().max(150).optional().or(z.literal("")),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),
    grade: z.string().trim().max(50).optional().or(z.literal("")),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date can't be before the start date",
        path: ["endDate"],
      });
    }
  });

export type EducationFormValues = z.infer<typeof educationFormSchema>;

export const educationFormDefaults: EducationFormValues = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  grade: "",
  description: "",
};
