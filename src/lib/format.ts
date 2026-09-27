import type { Job } from "@/types";

export function formatSalary(job: Pick<Job, "salaryMin" | "salaryMax" | "currency">) {
  const fmt = (n: number) => `${Math.round(n / 1000)}k`;
  return `${job.currency} ${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`;
}

export function formatPostedDate(iso: string) {
  const posted = new Date(iso).getTime();
  const diffDays = Math.floor((Date.now() - posted) / 86_400_000);
  if (diffDays <= 0) return "Posted today";
  if (diffDays === 1) return "Posted yesterday";
  if (diffDays < 7) return `Posted ${diffDays} days ago`;
  if (diffDays < 14) return "Posted 1 week ago";
  if (diffDays < 31) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
  return `Posted ${Math.floor(diffDays / 30)} months ago`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Short timestamp for message bubbles / conversation previews — clock
 * time for today, weekday for the last week, short date otherwise. */
export function formatChatTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Relative "time ago" for notifications. */
export function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
