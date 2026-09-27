// Branded, responsive, plain-HTML-table email templates (no build step, no
// external CSS — email clients need inline styles and table layouts).
// Every dynamic value that could contain user-generated text is escaped
// with escapeHtml() before interpolation — never interpolate raw strings.

import { appLink } from "./config";
import type { RenderedEmail } from "./types";

const BRAND_COLOR = "#0f766e"; // teal — matches the portfolio/brand theme
const BRAND_NAME = "BizLinko";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutOptions {
  preheader: string;
  heading: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/** The one shared HTML document every email renders through. */
function layout({ preheader, heading, bodyHtml, ctaLabel, ctaUrl }: LayoutOptions): string {
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:24px 32px 8px;">
           <a href="${escapeHtml(ctaUrl)}"
              style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;
                     text-decoration:none;font-weight:600;font-size:14px;
                     padding:12px 20px;border-radius:8px;">
             ${escapeHtml(ctaLabel)}
           </a>
         </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${BRAND_COLOR};padding:20px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">${BRAND_NAME}</span>
        </td></tr>
        <tr><td style="padding:28px 32px 4px;">
          <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">${escapeHtml(heading)}</h1>
        </td></tr>
        <tr><td style="padding:4px 32px 8px;font-size:14px;line-height:1.6;color:#374151;">
          ${bodyHtml}
        </td></tr>
        ${cta}
        <tr><td style="padding:28px 32px 24px;font-size:12px;color:#9ca3af;border-top:1px solid #f0f0f0;margin-top:16px;">
          You're receiving this because of activity on your ${BRAND_NAME} account.
          Manage which emails you get in your account settings.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function plainText(lines: string[], ctaLabel?: string, ctaUrl?: string): string {
  const cta = ctaLabel && ctaUrl ? [`\n${ctaLabel}: ${ctaUrl}`] : [];
  return [BRAND_NAME, "", ...lines, ...cta].join("\n");
}

// ── Application status changed ─────────────────────────────────────────
export function renderApplicationStatusEmail(input: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  status: string;
  applicationId: string;
}): RenderedEmail {
  const statusLabel = APPLICATION_STATUS_LABELS[input.status] ?? "updated";
  const heading = `Your application was ${statusLabel}`;
  const url = appLink(`/job-seeker/applications/${input.applicationId}`);
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.candidateName)},</p>
    <p style="margin:0 0 12px;">
      Your application for <strong>${escapeHtml(input.jobTitle)}</strong> at
      <strong>${escapeHtml(input.companyName)}</strong> was ${escapeHtml(statusLabel)}.
    </p>`;
  return {
    subject: `${heading} — ${input.jobTitle}`,
    html: layout({
      preheader: heading,
      heading,
      bodyHtml,
      bodyText: "",
      ctaLabel: "View application",
      ctaUrl: url,
    }),
    text: plainText(
      [
        `Hi ${input.candidateName},`,
        `Your application for ${input.jobTitle} at ${input.companyName} was ${statusLabel}.`,
      ],
      "View application",
      url,
    ),
  };
}

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  shortlisted: "shortlisted",
  interview: "moved to the interview stage",
  offer: "moved to offer",
  hired: "marked as hired — congratulations",
  rejected: "updated",
};

// ── New application (employer) ─────────────────────────────────────────
export function renderNewApplicationEmail(input: {
  employerName: string;
  jobTitle: string;
  applicationId: string;
}): RenderedEmail {
  const heading = "New application received";
  const url = appLink(`/employer/applications/${input.applicationId}`);
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.employerName)},</p>
    <p style="margin:0 0 12px;">
      A candidate applied for <strong>${escapeHtml(input.jobTitle)}</strong>.
    </p>`;
  return {
    subject: `New application — ${input.jobTitle}`,
    html: layout({
      preheader: heading,
      heading,
      bodyHtml,
      bodyText: "",
      ctaLabel: "Review application",
      ctaUrl: url,
    }),
    text: plainText(
      [`Hi ${input.employerName},`, `A candidate applied for ${input.jobTitle}.`],
      "Review application",
      url,
    ),
  };
}

// ── Interview scheduled / rescheduled / cancelled ───────────────────────
export function renderInterviewEmail(input: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  eventType: "interview_scheduled" | "interview_rescheduled" | "interview_cancelled";
  applicationId: string;
  scheduledAtIso: string | null;
  timezone: string;
  method: "video" | "phone" | "onsite";
  meetingUrl: string | null;
  location: string | null;
  durationMinutes: number;
}): RenderedEmail {
  const heading =
    input.eventType === "interview_scheduled"
      ? "Interview scheduled"
      : input.eventType === "interview_rescheduled"
        ? "Interview rescheduled"
        : "Interview cancelled";
  const url = appLink(`/job-seeker/applications/${input.applicationId}`);

  const whenLine =
    input.eventType !== "interview_cancelled" && input.scheduledAtIso
      ? formatInTimezone(input.scheduledAtIso, input.timezone)
      : null;

  const detailLines: string[] = [];
  if (whenLine) detailLines.push(`<strong>When:</strong> ${escapeHtml(whenLine)}`);
  if (input.eventType !== "interview_cancelled") {
    if (input.method === "video" && input.meetingUrl) {
      detailLines.push(`<strong>Where:</strong> Video call — link on the application page`);
    } else if (input.method === "phone") {
      detailLines.push(`<strong>Where:</strong> Phone — details on the application page`);
    } else if (input.method === "onsite" && input.location) {
      detailLines.push(`<strong>Where:</strong> ${escapeHtml(input.location)}`);
    }
  }

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.candidateName)},</p>
    <p style="margin:0 0 12px;">
      Your interview for <strong>${escapeHtml(input.jobTitle)}</strong> at
      <strong>${escapeHtml(input.companyName)}</strong>
      ${input.eventType === "interview_cancelled" ? "has been cancelled." : "is confirmed."}
    </p>
    ${detailLines.length > 0 ? `<p style="margin:0 0 12px;">${detailLines.join("<br/>")}</p>` : ""}`;

  return {
    subject: `${heading} — ${input.jobTitle}`,
    html: layout({
      preheader: heading,
      heading,
      bodyHtml,
      bodyText: "",
      ctaLabel: "View details",
      ctaUrl: url,
    }),
    text: plainText(
      [
        `Hi ${input.candidateName},`,
        `${heading} — ${input.jobTitle} at ${input.companyName}.`,
        ...(whenLine ? [`When: ${whenLine}`] : []),
      ],
      "View details",
      url,
    ),
  };
}

function formatInTimezone(iso: string, timezone: string): string {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: timezone || "UTC",
    }).format(new Date(iso));
    return `${formatted} (${timezone || "UTC"})`;
  } catch {
    // Unknown/invalid IANA zone — fall back to UTC rather than throwing,
    // since a bad timezone string must never break delivery entirely.
    return `${new Date(iso).toISOString()} (UTC)`;
  }
}

// ── New message ──────────────────────────────────────────────────────
export function renderNewMessageEmail(input: {
  recipientName: string;
  counterpartName: string;
  jobTitle: string;
  conversationUrl: string;
}): RenderedEmail {
  const heading = "New message";
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.recipientName)},</p>
    <p style="margin:0 0 12px;">
      You have a new message from <strong>${escapeHtml(input.counterpartName)}</strong>
      regarding <strong>${escapeHtml(input.jobTitle)}</strong>.
    </p>`;
  return {
    subject: `New message from ${input.counterpartName}`,
    html: layout({
      preheader: heading,
      heading,
      bodyHtml,
      bodyText: "",
      ctaLabel: "Open message",
      ctaUrl: input.conversationUrl,
    }),
    text: plainText(
      [
        `Hi ${input.recipientName},`,
        `You have a new message from ${input.counterpartName} regarding ${input.jobTitle}.`,
      ],
      "Open message",
      input.conversationUrl,
    ),
  };
}

// ── Saved search digest ──────────────────────────────────────────────
export function renderSavedSearchDigestEmail(input: {
  recipientName: string;
  searchName: string;
  jobs: { title: string; company: string; location: string; url: string }[];
  totalMatches: number;
  viewAllUrl: string;
}): RenderedEmail {
  const heading = `${input.totalMatches} new job${input.totalMatches === 1 ? "" : "s"} match "${input.searchName}"`;
  const rows = input.jobs
    .map(
      (j) => `
      <tr><td style="padding:10px 0;border-top:1px solid #f0f0f0;">
        <a href="${escapeHtml(j.url)}" style="color:${BRAND_COLOR};text-decoration:none;font-weight:600;font-size:14px;">
          ${escapeHtml(j.title)}
        </a><br/>
        <span style="font-size:13px;color:#6b7280;">${escapeHtml(j.company)} · ${escapeHtml(j.location)}</span>
      </td></tr>`,
    )
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.recipientName)},</p>
    <p style="margin:0 0 12px;">${escapeHtml(heading)}:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

  return {
    subject: heading,
    html: layout({
      preheader: heading,
      heading: "New matches for your saved search",
      bodyHtml,
      bodyText: "",
      ctaLabel: "View all matching jobs",
      ctaUrl: input.viewAllUrl,
    }),
    text: plainText(
      [
        `Hi ${input.recipientName},`,
        heading,
        ...input.jobs.map((j) => `- ${j.title} at ${j.company} (${j.location}): ${j.url}`),
      ],
      "View all matching jobs",
      input.viewAllUrl,
    ),
  };
}

// ── Account / company moderation ────────────────────────────────────
export function renderModerationEmail(input: {
  name: string;
  status: "suspended" | "banned";
  isCompany: boolean;
}): RenderedEmail {
  const subject = input.isCompany
    ? `Your company account has been ${input.status}`
    : `Your account has been ${input.status}`;
  const bodyHtml = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.name)},</p>
    <p style="margin:0 0 12px;">
      ${input.isCompany ? "Your company account" : "Your account"} on ${BRAND_NAME}
      has been <strong>${escapeHtml(input.status)}</strong> for a violation of our platform policies.
    </p>
    <p style="margin:0 0 12px;">
      If you believe this is a mistake, please reply to this email or reach out through our contact page.
    </p>`;
  return {
    subject,
    html: layout({ preheader: subject, heading: subject, bodyHtml, bodyText: "" }),
    text: plainText([
      `Hi ${input.name},`,
      `${input.isCompany ? "Your company account" : "Your account"} has been ${input.status} for a violation of our platform policies.`,
      "If you believe this is a mistake, please reply to this email or reach out through our contact page.",
    ]),
  };
}
