// Dynamic robots.txt + sitemap.xml, served from src/server.ts the same way
// as the Phase 10 cron handlers. Dynamic (rather than the static
// public/robots.txt this replaces) only so the Sitemap: line can carry the
// correct absolute origin for wherever the app is actually deployed,
// rather than a hardcoded domain that would be wrong on every environment
// but production.
//
// Private/authenticated routes are intentionally NOT listed with
// `Disallow` here — they already declare `noindex` via their own route
// head (see _authenticated/route.tsx), and `noindex` is the correct tool:
// a `Disallow` would stop crawlers from ever fetching the page, which
// means they'd never see the noindex tag either — a well-known SEO
// anti-pattern. Blocking crawling and blocking indexing are different
// things; this only needs to do the latter.

export function handleRobotsTxt(request: Request): Response {
  const origin = new URL(request.url).origin;
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function handleSitemap(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${origin}/` },
    { loc: `${origin}/jobs` },
    { loc: `${origin}/companies` },
  ];

  // Only ever public, already-visible listings — the same rows an
  // anonymous visitor could already browse to on /jobs and /companies.
  // Capped to keep the sitemap small and fast; large catalogs would
  // paginate this into a sitemap index instead.
  const { data: jobs } = await supabaseAdmin
    .from("jobs")
    .select("id, published_at, created_at")
    .eq("status", "published")
    .neq("moderation_status", "removed")
    .order("published_at", { ascending: false })
    .limit(2000);

  for (const job of jobs ?? []) {
    urls.push({
      loc: `${origin}/jobs/${job.id}`,
      lastmod: (job.published_at ?? job.created_at).slice(0, 10),
    });
  }

  const { data: companies } = await supabaseAdmin
    .from("companies")
    .select("slug, updated_at")
    .eq("status", "active")
    .limit(2000);

  for (const company of companies ?? []) {
    urls.push({
      loc: `${origin}/companies/${company.slug}`,
      lastmod: company.updated_at?.slice(0, 10),
    });
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
