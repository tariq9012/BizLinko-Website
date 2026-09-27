import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { withSecurityHeaders } from "./lib/security-headers";
import { handleProcessEmailOutbox } from "./server/process-email-outbox";
import { handleSavedSearchAlerts } from "./server/saved-search-alerts";
import { handleRobotsTxt, handleSitemap } from "./server/seo-routes";

// Phase 10 cron workers, dispatched here rather than as TanStack Start file
// routes — see the comment atop process-email-outbox.ts for why. Checked
// before anything else so these never go through SSR/RSC rendering.
// POST-only: authenticated by CRON_SECRET (see cron-auth.ts).
const CRON_ROUTES: Record<string, (request: Request) => Promise<Response>> = {
  "/api/cron/process-email-outbox": handleProcessEmailOutbox,
  "/api/cron/saved-search-alerts": handleSavedSearchAlerts,
};

// GET-only, unauthenticated, public SEO endpoints (Phase 11).
const PUBLIC_GET_ROUTES: Record<string, (request: Request) => Promise<Response> | Response> = {
  "/robots.txt": handleRobotsTxt,
  "/sitemap.xml": handleSitemap,
};

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleRequest(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  const cronHandler = CRON_ROUTES[pathname];
  if (cronHandler) {
    // Phase 11 hardening: these are POST-only cron webhooks. Any other
    // method is rejected before even checking CRON_SECRET, so a stray
    // GET (e.g. a browser preview, a health-check bot) never reaches
    // the auth check or the handler at all.
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
    }
    try {
      return await cronHandler(request);
    } catch (error) {
      console.error(error);
      return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
    }
  }

  const publicGetHandler = PUBLIC_GET_ROUTES[pathname];
  if (publicGetHandler) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    try {
      return await publicGetHandler(request);
    } catch (error) {
      console.error(error);
      return new Response("Internal error", { status: 500 });
    }
  }

  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

export default {
  // Phase 12: every response — SSR pages, cron endpoints, robots.txt/
  // sitemap.xml, and error pages alike — gets the same baseline security
  // headers applied last, in one place, rather than each branch above
  // having to remember to set them individually. See security-headers.ts
  // for what's set and why.
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const response = await handleRequest(request, env, ctx);
    return withSecurityHeaders(response);
  },
};
