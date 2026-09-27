# BizLinko

A modern full-stack job marketplace connecting job seekers and employers.

## Overview

BizLinko lets job seekers discover and apply to roles, and lets employers post
jobs, manage applications, and build out a company profile. It's a
server-rendered React application with authenticated dashboards for both job
seekers and employers, plus an admin area.

## Technology stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via TanStack Router)
- **Styling:** Tailwind CSS 4
- **UI components:** shadcn/ui (Radix UI primitives), lucide-react icons
- **Data & forms:** TanStack Query, React Hook Form, Zod
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Build tooling:** Vite, Nitro
- **Language:** TypeScript

## Features

- Job search and listings with category browsing
- Company profiles and directory
- Job seeker dashboard: applications, saved jobs, profile settings
- Employer dashboard: post jobs, manage applications, company settings
- Admin area
- Email/password authentication with session persistence
- Career resources section

## Project structure

```
src/
  components/       UI components, grouped by feature (jobs, companies, dashboard, layout, ui, ...)
  data/             Static/reference data (categories, sample jobs, companies, resources)
  hooks/            Shared React hooks (auth, mobile detection)
  integrations/
    supabase/       Supabase client (browser + server), auth middleware, generated DB types
  lib/               Shared utilities, error handling
  routes/            File-based routes (TanStack Router)
  server.ts          Custom server entry / SSR error wrapper
  start.ts           TanStack Start instance: global middleware (auth, CSRF, error handling)
supabase/
  migrations/        SQL schema migrations
  config.toml         Supabase project config
```

## Local installation

Requires Node.js 20+ and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase project's values:

| Variable                                                     | Scope                | Description                                                                    |
| ------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------ |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`                         | Server / Browser-safe | Your Supabase project URL                                                      |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Server / Browser-safe | Supabase anon/publishable API key                                              |
| `SUPABASE_SERVICE_ROLE_KEY`                                  | **Server-only**       | Service role key — bypasses RLS, never exposed to the client                   |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID`           | Server / Browser-safe | Your Supabase project reference ID                                             |
| `CRON_SECRET`                                                | **Server-only**       | Required in production. Authenticates `POST /api/cron/*` worker requests (see `cron-auth.ts`) |
| `CRON_SECRET_PREVIOUS`                                       | **Server-only**       | Optional — set only transiently while rotating `CRON_SECRET`, so in-flight schedulers using the old value keep working |
| `RESEND_API_KEY`                                              | **Server-only**       | Required in production. Resend API key for transactional email                |
| `EMAIL_FROM`                                                  | **Server-only**       | Required in production. Sender address; must be on a domain verified in Resend |
| `APP_URL`                                                     | **Server-only**       | Required in production. Absolute production URL (no trailing slash) used to build email links |
| `EMAIL_DEV_REDIRECT_TO`                                       | **Server-only, dev**  | Optional. Redirects all outbound email to this address in development only — always ignored when `NODE_ENV=production`, even if set. Leave unset in production. |

Browser-safe variables are the ones already prefixed `VITE_` above — Vite inlines those into the client bundle by design. Every other variable in this table is server-only and must never be prefixed `VITE_` or referenced from client code.

`.env` is gitignored — never commit real credentials. `.env.example` contains placeholders only.

## Database setup

The schema lives in `supabase/migrations/`. With the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project:

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies the existing migrations (companies, profiles, employer profiles, user roles, user settings, and related RLS policies) to your database.

## Development commands

```sh
npm run dev        # start the dev server
npm run build      # production build
npm run build:dev  # development-mode build
npm run start      # run the production build (after `npm run build`)
npm run preview    # preview a production build locally via Vite
npm run lint        # run ESLint
npm run format      # run Prettier
```

## Production build

```sh
npm run build
```

This produces `.output/server/index.mjs` (a self-contained Node entry point —
see Deployment below) and `.output/public/` (static client assets), via the
custom server entry in `src/server.ts`.

## Pushing to GitHub

```sh
git init                       # skip if already a git repo
git add .
git status                     # confirm .env is NOT listed — it's gitignored
git commit -m "BizLinko: Phase 12 production readiness"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

Before pushing for the first time, double-check `git status` doesn't list
`.env`, `.env.local`, or anything under `supabase/.temp/` — all three are
gitignored, but it's worth confirming once, especially given this project's
history of a real `.env` ending up in a shipped ZIP.

## Deployment

**Target**: `vite.config.ts` registers the [Nitro](https://nitro.build) Vite
plugin (`nitro/vite`) with `preset: "vercel"` when Vercel's own build
environment sets `VERCEL=1` (Vercel does this automatically — nothing to
configure on your end), and the **`node-server`** preset — a self-starting,
standalone Node.js HTTP server — everywhere else (local builds, any other
host). This was chosen deliberately (Phase 12) because the app needs
something that can run: SSR/server functions, the two authenticated cron
endpoints, server-side Resend calls, and Supabase service-role operations —
not a static export.

Verified: `npm run build && npm run start` (node-server path) responds `200`
on `/`, `200` on `/robots.txt`, `405` on `GET /api/cron/*`, `401` on a `POST`
with a bad `CRON_SECRET`, `404` on unknown routes, and shuts down cleanly on
`SIGTERM`. Separately, `VERCEL=1 npm run build` (Vercel path) produces a
valid Vercel Build Output API v3 directory (`.vercel/output/`) — one
serverless function (`nodejs22.x`, streaming enabled) handling everything
except `/assets/*`, which is served as static, long-cached files.

### Deploying to Vercel (GitHub-connected)

1. Push this repository to GitHub (see below — `.env` and `.vercel/` are
   already gitignored, so nothing secret goes up).
2. In the Vercel dashboard: **Add New… → Project**, import the GitHub repo.
   Vercel auto-detects the Nitro/Vercel build output — no custom build
   command is required (`npm run build` from `package.json` is used as-is;
   Vercel sets `VERCEL=1` itself during that build, which is what selects
   the `vercel` preset above).
3. Under **Settings → Environment Variables**, add every server-only and
   browser-safe variable from the table above (`SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_PROJECT_ID` and their `VITE_` counterparts, `CRON_SECRET`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`) for the Production
   environment. Leave `EMAIL_DEV_REDIRECT_TO` and `CRON_SECRET_PREVIOUS`
   unset unless you're actively rotating.
4. Deploy. Once live, set `APP_URL` to the actual assigned/custom domain
   and redeploy if it wasn't known yet at first deploy (email links and
   the sitemap/robots.txt both read `APP_URL`).
5. In Supabase's dashboard, add the Vercel production domain (and any
   preview-deployment domain pattern you use) to Auth → URL Configuration
   → Redirect URLs.
6. Point your cron scheduler (see the Cron production setup section below)
   at the same production domain.
7. **Function duration**: the two cron endpoints run inside the same
   serverless function as everything else. If your Vercel plan's function
   timeout is short and the outbox/alert workers process a large batch,
   consider Vercel's Cron Jobs feature (separate from this app's own
   scheduling) or a longer-running external scheduler instead of relying on
   the default limit.

**To deploy to a plain Node host instead** (a VPS, Docker, Railway, Render,
Fly.io, etc. — anywhere that isn't Vercel):

1. `npm run build` (locally or in the host's build step; do **not** set `VERCEL=1`).
2. Ship the whole repo (or at minimum `.output/`, `package.json`,
   `package-lock.json`, and `node_modules` or a fresh `npm ci --omit=dev`)
   to the host.
3. Set every environment variable from the table above in the host's
   environment/secrets configuration — never in a committed file.
4. Start the process with `npm run start` (i.e. `node .output/server/index.mjs`).
   The server reads `PORT` from the environment if the host sets it;
   otherwise it defaults to `3000`.
5. Point the host's HTTPS termination (its own load balancer/proxy, or a
   reverse proxy you run) at that process. The app itself does not terminate
   TLS.

**To deploy to yet another target** (Cloudflare Workers, Netlify, Bun), pass a
different `preset` (or swap in that platform's own Vite plugin, e.g.
`@cloudflare/vite-plugin`) to the `nitro()` call in `vite.config.ts` —
see [TanStack Start's hosting docs](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
for the current list of officially supported targets and their exact setup
steps. This wasn't done here since only Vercel and a generic Node host were
requested.

### Supabase production configuration

1. **Migrations**: `supabase link --project-ref <prod-ref>` against your
   production project, then `supabase migration list` to compare local vs.
   remote before assuming anything is applied, then `supabase db push`.
   Never hand-edit a migration file that's already applied remotely — add a
   new one instead (see the comments in the `phase11_*` migrations for a
   worked example of exactly this situation).
2. **Auth → URL Configuration** (Supabase dashboard): set **Site URL** to
   your production `APP_URL`, and add your production domain's callback
   paths (`/login`, `/register`, `/reset-password`, `/forgot-password`) to
   **Redirect URLs**. Remove or don't rely on `localhost` entries here in
   production.
3. **RLS**: every table Phase 1–11 introduced ships with RLS policies —
   verify RLS is still enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
   rather than disabled, on the production project specifically; a common
   mistake is toggling it off temporarily while debugging and forgetting to
   re-enable it.
4. **Storage buckets**: confirm resume/avatar/company-asset buckets exist on
   the production project with the same public/private split as local
   (resumes private + signed-URL access only; avatars/company assets per
   their existing policies) — buckets are not part of `db push` and must be
   created per-project.
5. **Realtime**: confirm Realtime is enabled for the tables messaging/
   notifications depend on (Supabase dashboard → Database → Replication).

### Resend production configuration

Email delivery uses Resend, a server-side outbox (`public.email_outbox`),
and two cron-protected worker endpoints.

1. Create a Resend account, verify a **sending domain**, and generate an API
   key. Set `RESEND_API_KEY`, `EMAIL_FROM` (must be an address on the
   verified domain), and `APP_URL` (see the environment variables table
   above) in the host's environment/secrets configuration.
2. Leave `EMAIL_DEV_REDIRECT_TO` **unset** in production — it's ignored
   there regardless (see the table above), but there's no reason to set it.
3. Verify delivery in development (Settings → "Send test email", dev-only —
   see Phase 12 hardening note below), and in production via the
   post-deployment smoke test.

### Cron production setup

1. Generate a long random value and set it as `CRON_SECRET`.
2. **Schedule the two workers.** They are plain HTTP endpoints
   (`POST /api/cron/process-email-outbox`, `POST /api/cron/saved-search-alerts`)
   requiring `Authorization: Bearer <CRON_SECRET>` — never pass the secret as
   a query parameter. Use whatever external scheduler you prefer, or
   Supabase's own `pg_cron` + `pg_net`:

   ```sql
   -- run once, as a superuser / via the SQL editor
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   select cron.schedule(
     'process-email-outbox', '*/2 * * * *',
     $$
     select net.http_post(
       url := 'https://your-production-domain.com/api/cron/process-email-outbox',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
     );
     $$
   );

   select cron.schedule(
     'saved-search-alerts', '0 * * * *', -- hourly; the worker self-paces daily/weekly digests
     $$
     select net.http_post(
       url := 'https://your-production-domain.com/api/cron/saved-search-alerts',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
     );
     $$
   );
   ```

3. **Rotating `CRON_SECRET`**: set the new value as `CRON_SECRET`, move the
   old value to `CRON_SECRET_PREVIOUS`, update your scheduler(s) to send the
   new value, then remove `CRON_SECRET_PREVIOUS` once you've confirmed no
   scheduler is still sending the old one. Verified: the auth check accepts
   either value via a constant-time comparison, and rejects both a missing
   secret (`500`, server misconfigured) and a wrong one (`401`).
4. Email preferences reuse the existing `user_settings` "Notifications"
   toggles on both settings pages — no separate preferences UI was added.
   Per-search email alerts (with daily/weekly frequency) are on the "Saved"
   dropdown on the jobs search page.

### Security headers

Every response (SSR pages, cron endpoints, robots.txt/sitemap.xml) gets a
baseline set of security headers applied in one place
(`src/lib/security-headers.ts`, wired into `src/server.ts`):
`Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
and a restrictive `Permissions-Policy`. The CSP's `connect-src`/`img-src`
are derived from `SUPABASE_URL` at request time, so they automatically
match whichever Supabase project the server is configured against.

Verified live (built server, `curl -D -`): the CSP, and the other four
headers, are present on both a normal page response and a `401` cron
response.

Known, deliberate limitation: `script-src` includes `'unsafe-inline'`
because TanStack Start's SSR renderer emits its own inline hydration/
scroll-restoration `<script>` tags with a fresh per-request payload — there's
no static content to hash and no nonce plumbed through the framework's
renderer to attach to those tags. This is a real constraint of streaming SSR
frameworks without nonce support, not an oversight; the policy still blocks
framing entirely, disables objects/plugins, and restricts which origins
scripts, styles, fonts, images, and fetches can come from.

CORS: there are no custom cross-origin API routes in this app (the cron and
SEO endpoints are same-origin server routes, not a public API), so no CORS
headers are set — same-origin requests don't need them, and adding a
permissive `Access-Control-Allow-Origin: *` would only weaken things.

### Session/cookie security

Auth sessions are handled entirely by `@supabase/supabase-js` and verified
server-side against Supabase's own Auth API (`requireSupabaseAuth`
middleware) — there is no second, custom token or cookie-based session
system layered on top, so there's nothing here to independently secure
beyond keeping the Supabase client libraries up to date. The one app-defined
cookie (`sidebar_state`, in `src/components/ui/sidebar.tsx`) is a UI
preference only, holds no session or personal data, and isn't
security-sensitive.

### Production seed/test data

`supabase/seed.sql` is already scoped to local development only — it's
applied by `supabase db reset`, **not** by `supabase db push`, and its own
header comment says so explicitly. It has no effect on a production
database via the normal migration path; no changes were needed here.

### Development-only controls

"Send test email" (Settings, both job-seeker and employer) is development-
only as of Phase 12: hidden from the production client bundle
(`import.meta.env.DEV` check — verified the production bundle reduces the
component to an empty stub with no button, no server-function reference,
and no Resend-related code) and refused server-side outside development
(`sendTestEmail` throws immediately if `NODE_ENV === "production"`), so it
fails closed even if called directly.

### Post-deployment smoke test

After deploying and pointing DNS/HTTPS at the running process:

- [ ] Homepage loads (`/`)
- [ ] `/robots.txt` and `/sitemap.xml` return `200` with production URLs, not `localhost`
- [ ] Login and signup/verification complete without a redirect loop
- [ ] Password reset email arrives and its link points at the production domain
- [ ] Job seeker: browse jobs, apply, see the application in "My applications"
- [ ] Employer: post a job, see the application arrive, move it through the ATS
- [ ] Messaging sends and a realtime notification arrives without a page refresh
- [ ] `POST /api/cron/process-email-outbox` and `POST /api/cron/saved-search-alerts`
      (with the real `CRON_SECRET`) each return `200`, and a `GET` to either
      returns `405`
- [ ] Admin login works and an audit-log entry is created for a moderation action
- [ ] A transactional email (e.g. application status change) actually arrives, from
      the verified sending domain, with production links

### Secret rotation

A real `.env` was found in project ZIPs on more than one occasion during
this project's history — treat any secret that has ever appeared in a ZIP,
screen share, or committed file as compromised and rotate it (Supabase
service-role key, `SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`,
`CRON_SECRET`) before relying on it in production, independent of anything
else in this document.
