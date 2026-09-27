// Trusted server worker: processes due saved_job_searches with
// email_alert_enabled = true, finds jobs newly matching since the last
// alert window, and queues one digest email per search via email_outbox
// (never sends directly — process-email-outbox.ts delivers it).
//
// Reuses public.search_job_ids — the exact same ranked/moderated/
// visibility-filtered query the jobs page itself uses — rather than
// re-implementing matching, per the brief's "do not build a second
// matching implementation".
//
// See process-email-outbox.ts for why this is a plain fetch handler
// dispatched from src/server.ts rather than a TanStack Start file route.
//
// Schedule this hourly at most (not faster). It self-paces daily/weekly
// searches by only treating a search as due once its own frequency window
// has elapsed since last_alerted_at.
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

interface JobFiltersShape {
  keyword?: string;
  location?: string;
  category?: string;
  types?: string[];
  workModes?: string[];
  experience?: string[];
  skills?: string[];
  minSalary?: number;
  maxSalary?: number;
  salaryPeriod?: string;
  verifiedOnly?: boolean;
}

export async function handleSavedSearchAlerts(request: Request): Promise<Response> {
  const authError = await authenticateCronRequest(request);
  if (authError) return authError;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: searches, error: searchError } = await supabaseAdmin
    .from("saved_job_searches")
    .select("id, user_id, name, filters, alert_frequency, last_alerted_at, created_at")
    .eq("email_alert_enabled", true);

  if (searchError) {
    return Response.json({ ok: false, error: searchError.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (searches ?? []).filter((s) => {
    const windowMs = FREQUENCY_MS[s.alert_frequency] ?? FREQUENCY_MS["weekly"] ?? 0;
    const last = s.last_alerted_at
      ? new Date(s.last_alerted_at).getTime()
      : new Date(s.created_at).getTime();
    return now - last >= windowMs;
  });

  if (due.length === 0) {
    return Response.json({ ok: true, checked: searches?.length ?? 0, due: 0, queued: 0 });
  }

  const { data: categories } = await supabaseAdmin.from("job_categories").select("id, slug");
  const categoryIdBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  let queued = 0;

  for (const search of due) {
    const baseline = search.last_alerted_at ?? search.created_at;

    // Never alert a banned/suspended user with normal engagement email.
    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("status")
      .eq("id", search.user_id)
      .maybeSingle();
    if (!owner || owner.status === "banned") {
      continue;
    }

    const filters = (search.filters ?? {}) as JobFiltersShape;
    const categoryId = filters.category ? (categoryIdBySlug.get(filters.category) ?? null) : null;

    const { data: ranked, error: rankError } = await supabaseAdmin.rpc("search_job_ids", {
      p_keyword: filters.keyword?.trim() || null,
      p_location: filters.location?.trim() || null,
      p_category_id: categoryId,
      p_employment_types: (filters.types?.length ? filters.types : null) as
        ("Full-time" | "Part-time" | "Contract" | "Internship")[] | null,
      p_workplace_types: (filters.workModes?.length ? filters.workModes : null) as
        ("Remote" | "Hybrid" | "On-site")[] | null,
      p_experience_levels: (filters.experience?.length ? filters.experience : null) as
        ("Entry" | "Mid" | "Senior" | "Lead")[] | null,
      p_min_salary: filters.minSalary || null,
      p_max_salary: filters.maxSalary || null,
      p_salary_period: (filters.salaryPeriod || null) as "year" | "month" | "hour" | null,
      p_skills: filters.skills?.length ? filters.skills : null,
      p_date_posted: null,
      p_verified_only: filters.verifiedOnly ?? false,
      p_sort: "recent",
      p_page: 1,
      p_page_size: 50,
    });

    // A malformed/stale filter set must never take down the whole batch —
    // skip this search, keep processing the rest, and leave last_alerted_at
    // untouched so it's retried next run.
    if (rankError || !ranked) continue;

    const ids = ranked.map((r) => r.job_id);
    let newJobs: { title: string; company: string; location: string; url: string }[] = [];
    let totalMatches = 0;

    if (ids.length > 0) {
      const { data: jobRows } = await supabaseAdmin
        .from("jobs")
        .select(
          "id, title, city, country, workplace_type, published_at, created_at, companies(name)",
        )
        .in("id", ids);

      const baselineTime = new Date(baseline).getTime();
      const fresh = (jobRows ?? []).filter((j) => {
        const postedAt = j.published_at ?? j.created_at;
        return new Date(postedAt).getTime() > baselineTime;
      });
      totalMatches = fresh.length;
      newJobs = fresh.slice(0, 5).map((j) => ({
        title: j.title,
        company: (j.companies as unknown as { name: string } | null)?.name ?? "A company",
        location: j.workplace_type === "Remote" ? "Remote" : `${j.city}, ${j.country}`,
        url: `/jobs/${j.id}`,
      }));
    }

    // "Do not send empty digests" — but still advance last_alerted_at so
    // the window properly closes and the next run starts a fresh one,
    // rather than re-scanning the same growing range forever.
    await supabaseAdmin
      .from("saved_job_searches")
      .update({ last_alerted_at: new Date().toISOString() })
      .eq("id", search.id);

    if (totalMatches === 0) continue;

    const hourBucket = new Date().toISOString().slice(0, 13);
    const { error: insertError } = await supabaseAdmin.from("email_outbox").upsert(
      {
        user_id: search.user_id,
        email_type: "saved_search_alert",
        dedupe_key: `${search.id}:${hourBucket}`,
        payload: { search_name: search.name, total_matches: totalMatches, jobs: newJobs },
      },
      { onConflict: "user_id,email_type,dedupe_key", ignoreDuplicates: true },
    );
    if (!insertError) queued += 1;
  }

  return Response.json({ ok: true, checked: searches?.length ?? 0, due: due.length, queued });
}
