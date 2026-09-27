import { z } from "zod";

const METHODS = ["video", "phone", "onsite"] as const;

export const interviewFormSchema = z
  .object({
    title: z.string().trim().min(1, "Give this interview a title").max(150),
    interviewMethod: z.enum(METHODS),
    date: z.string().min(1, "Pick a date"),
    time: z.string().min(1, "Pick a start time"),
    durationMinutes: z.coerce
      .number()
      .int()
      .min(15, "At least 15 minutes")
      .max(480, "Under 8 hours"),
    timezone: z.string().min(1),
    location: z.string().trim().max(300).optional().or(z.literal("")),
    meetingUrl: z.string().trim().max(500).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const when = new Date(`${data.date}T${data.time}`);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interview must be scheduled in the future",
        path: ["time"],
      });
    }
    if (data.interviewMethod === "video" && !data.meetingUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A meeting link is required for a video interview",
        path: ["meetingUrl"],
      });
    }
    if (data.interviewMethod === "onsite" && !data.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A location is required for an onsite interview",
        path: ["location"],
      });
    }
  });

export type InterviewFormValues = z.infer<typeof interviewFormSchema>;

export function defaultInterviewFormValues(): InterviewFormValues {
  return {
    title: "",
    interviewMethod: "video",
    date: "",
    time: "",
    durationMinutes: 30,
    // Never hardcode a timezone — use the scheduler's own, they can change it.
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: "",
    meetingUrl: "",
    notes: "",
  };
}

/** Combines the form's separate date/time fields into a single UTC instant
 * for storage — scheduled_at is always timestamptz; `timezone` is stored
 * only for display context. */
export function formValuesToScheduledAt(values: InterviewFormValues): string {
  return new Date(`${values.date}T${values.time}`).toISOString();
}
