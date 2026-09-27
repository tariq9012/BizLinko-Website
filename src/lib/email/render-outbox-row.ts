// Server-only. Turns a claimed email_outbox row into a recipient address
// + rendered email, by re-reading the current state of the related
// entities (application, interview, conversation, saved search, profile)
// with the service-role client — never trusting anything snapshotted into
// the row's payload beyond IDs, and never trusting a caller-supplied
// address. This is the "resolve recipient securely at processing time"
// requirement from the brief.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { EmailOutboxRow, RenderedEmail } from "./types";
import { appLink } from "./config";
import {
  renderApplicationStatusEmail,
  renderInterviewEmail,
  renderModerationEmail,
  renderNewApplicationEmail,
  renderNewMessageEmail,
  renderSavedSearchDigestEmail,
} from "./templates";

type AdminClient = SupabaseClient<Database>;

export interface ResolvedEmail {
  recipientEmail: string;
  email: RenderedEmail;
}

async function resolveRecipient(
  admin: AdminClient,
  userId: string,
): Promise<{ email: string; name: string } | null> {
  const { data } = await admin
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.email) return null;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return { email: data.email, name: name || "there" };
}

export async function renderEmailForRow(
  admin: AdminClient,
  row: EmailOutboxRow,
): Promise<ResolvedEmail | null> {
  const recipient = await resolveRecipient(admin, row.user_id);
  if (!recipient) return null;

  switch (row.email_type) {
    case "application_status_changed": {
      const applicationId = row.payload["application_id"] as string;
      const { data } = await admin
        .from("job_applications")
        .select("status, jobs(title, companies(name))")
        .eq("id", applicationId)
        .maybeSingle();
      if (!data) return null;
      const job = data.jobs as unknown as {
        title: string;
        companies: { name: string } | null;
      } | null;
      return {
        recipientEmail: recipient.email,
        email: renderApplicationStatusEmail({
          candidateName: recipient.name,
          jobTitle: job?.title ?? "your role",
          companyName: job?.companies?.name ?? "the company",
          status: data.status,
          applicationId,
        }),
      };
    }

    case "new_application": {
      const applicationId = row.payload["application_id"] as string;
      const { data } = await admin
        .from("job_applications")
        .select("jobs(title)")
        .eq("id", applicationId)
        .maybeSingle();
      const job = data?.jobs as unknown as { title: string } | null;
      return {
        recipientEmail: recipient.email,
        email: renderNewApplicationEmail({
          employerName: recipient.name,
          jobTitle: job?.title ?? "your job posting",
          applicationId,
        }),
      };
    }

    case "interview_scheduled":
    case "interview_rescheduled":
    case "interview_cancelled": {
      const interviewId = row.payload["interview_id"] as string;
      const { data } = await admin
        .from("interviews")
        .select(
          "application_id, scheduled_at, timezone, interview_method, meeting_url, location, duration_minutes, job_applications(jobs(title, companies(name)))",
        )
        .eq("id", interviewId)
        .maybeSingle();
      if (!data) return null;
      const application = data.job_applications as unknown as {
        jobs: { title: string; companies: { name: string } | null } | null;
      } | null;
      return {
        recipientEmail: recipient.email,
        email: renderInterviewEmail({
          candidateName: recipient.name,
          jobTitle: application?.jobs?.title ?? "your role",
          companyName: application?.jobs?.companies?.name ?? "the company",
          eventType: row.email_type,
          applicationId: data.application_id,
          scheduledAtIso: data.scheduled_at,
          timezone: data.timezone ?? "UTC",
          method: (data.interview_method ?? "video") as "video" | "phone" | "onsite",
          meetingUrl: data.meeting_url,
          location: data.location,
          durationMinutes: data.duration_minutes ?? 30,
        }),
      };
    }

    case "new_message": {
      const conversationId = row.payload["conversation_id"] as string;
      const { data: participants } = await admin
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);
      const counterpartId = participants?.map((p) => p.user_id).find((id) => id !== row.user_id);
      const { data: conversation } = await admin
        .from("conversations")
        .select("job_applications(jobs(title))")
        .eq("id", conversationId)
        .maybeSingle();
      const application = conversation?.job_applications as unknown as {
        jobs: { title: string } | null;
      } | null;
      const counterpart = counterpartId ? await resolveRecipient(admin, counterpartId) : null;
      // Same URL convention as the in-app Phase 7 notification trigger
      // (messages_after_insert): a role-based inbox link, not a deep link
      // to a specific conversation (the messages UI has no per-conversation
      // route today).
      const { data: recipientRoles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", row.user_id)
        .eq("role", "employer")
        .maybeSingle();
      const inboxPath = recipientRoles ? "/employer/messages" : "/job-seeker/messages";
      return {
        recipientEmail: recipient.email,
        email: renderNewMessageEmail({
          recipientName: recipient.name,
          counterpartName: counterpart?.name ?? "the other participant",
          jobTitle: application?.jobs?.title ?? "a job",
          conversationUrl: appLink(inboxPath),
        }),
      };
    }

    case "saved_search_alert": {
      const rawJobs =
        (row.payload["jobs"] as {
          title: string;
          company: string;
          location: string;
          url: string;
        }[]) ?? [];
      const jobs = rawJobs.map((j) => ({ ...j, url: appLink(j.url) }));
      const searchName = (row.payload["search_name"] as string) ?? "your saved search";
      const totalMatches = (row.payload["total_matches"] as number) ?? jobs.length;
      return {
        recipientEmail: recipient.email,
        email: renderSavedSearchDigestEmail({
          recipientName: recipient.name,
          searchName,
          jobs,
          totalMatches,
          viewAllUrl: appLink("/jobs"),
        }),
      };
    }

    case "account_moderation": {
      const status = row.payload["status"] as "suspended" | "banned";
      const companyId = row.payload["company_id"] as string | undefined;
      let name = recipient.name;
      if (companyId) {
        const { data: company } = await admin
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .maybeSingle();
        name = company?.name ?? recipient.name;
      }
      return {
        recipientEmail: recipient.email,
        email: renderModerationEmail({ name, status, isCompany: Boolean(companyId) }),
      };
    }

    default:
      return null;
  }
}
