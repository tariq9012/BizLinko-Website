import { z } from "zod";

export const applicationFormSchema = z.object({
  resumeId: z.string().min(1, "Please select a resume"),
  coverLetter: z.string().trim().max(4000, "Cover letter is too long").optional().or(z.literal("")),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
