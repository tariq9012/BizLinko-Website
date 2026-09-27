// Phase 12 — production security headers, applied to every response the
// server returns (SSR pages, cron endpoints, robots.txt/sitemap.xml).
//
// This is deliberately a conservative CSP rather than a maximal one:
// TanStack Start's SSR renderer emits its own inline hydration and
// scroll-restoration <script> tags with a fresh, per-request payload
// (there's no static content to hash, and no nonce plumbed through the
// framework's renderer to attach to those tags), so script-src has to
// allow 'unsafe-inline' — that's a real, documented tradeoff of streaming
// SSR frameworks without nonce support wired up, not an oversight. What
// this policy still buys: no framing (clickjacking) at all, no plugins/
// objects, no form submissions or fetches to third-party origins beyond
// Supabase and Google Fonts, and no scripts loaded from any external host.
//
// SUPABASE_URL is read at request time (not baked in at build time) so
// this reflects whatever Supabase project the server is actually
// configured against in this environment.
function supabaseOrigins(): { https: string; wss: string } | null {
  const url = process.env["SUPABASE_URL"];
  if (!url) return null;
  try {
    const origin = new URL(url).origin;
    return { https: origin, wss: origin.replace(/^https:/, "wss:") };
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(): string {
  const supabase = supabaseOrigins();
  const connectSrc = ["'self'", supabase?.https, supabase?.wss].filter(Boolean).join(" ");
  const imgSrc = ["'self'", "data:", supabase?.https].filter(Boolean).join(" ");

  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");
}

/** Recomputed per call (cheap string building) so it always reflects the
 *  current SUPABASE_URL rather than a value cached from first request. */
function securityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": buildContentSecurityPolicy(),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Belt-and-suspenders with frame-ancestors above — X-Frame-Options is
    // ignored by browsers that support frame-ancestors, but costs nothing
    // and still protects any older browser that doesn't.
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

/** Wraps a Response, adding the headers above without disturbing its
 *  status, existing headers (e.g. content-type, Allow), or body stream. */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
