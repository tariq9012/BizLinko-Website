// Server-only. Never import this from a route/component file that ships to
// the client bundle — import it only from other *.server.ts-adjacent
// modules (client.ts, send-email.ts) and from server routes / cron
// handlers, the same convention client.server.ts already uses.

export interface EmailConfig {
  resendApiKey: string;
  emailFrom: string;
  appUrl: string;
  /** true outside production — see shouldActuallySend() below. */
  isDevelopment: boolean;
}

let cached: EmailConfig | undefined;

/**
 * Reads and validates the server-only email environment variables.
 * Throws with a clear, specific message if something required is missing —
 * callers (the outbox worker, the test-send route) turn that into a
 * `failed` outbox row / 500 response rather than silently no-op-ing.
 */
export function getEmailConfig(): EmailConfig {
  if (cached) return cached;

  const resendApiKey = process.env["RESEND_API_KEY"];
  const emailFrom = process.env["EMAIL_FROM"];
  const appUrl = process.env["APP_URL"];

  const missing = [
    ...(!resendApiKey ? ["RESEND_API_KEY"] : []),
    ...(!emailFrom ? ["EMAIL_FROM"] : []),
    ...(!appUrl ? ["APP_URL"] : []),
  ];
  if (missing.length > 0) {
    throw new Error(
      `[email] Missing required environment variable(s): ${missing.join(", ")}. ` +
        `See .env.example.`,
    );
  }

  cached = {
    resendApiKey: resendApiKey!,
    emailFrom: emailFrom!,
    appUrl: appUrl!.replace(/\/+$/, ""),
    isDevelopment: process.env["NODE_ENV"] !== "production",
  };
  return cached;
}

/** Build an absolute BizLinko link from a trusted APP_URL — never from a
 *  client-supplied host, and never hardcoded localhost. */
export function appLink(path: string): string {
  const { appUrl } = getEmailConfig();
  return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Development safety valve. In development, if EMAIL_DEV_REDIRECT_TO is
 * set, every outbound email is redirected there instead of the real
 * recipient — this is opt-in and explicit (never automatic), so a
 * developer who hasn't set it will simply hit Resend's own test-mode
 * behavior (or their own verified test domain) rather than accidentally
 * emailing a real user's address pulled from a copied-down prod database.
 * In production this is always ignored, even if the variable is set.
 */
export function resolveDevSafeRecipient(realRecipient: string): string {
  const { isDevelopment } = getEmailConfig();
  const devRedirect = process.env["EMAIL_DEV_REDIRECT_TO"];
  if (isDevelopment && devRedirect) return devRedirect;
  return realRecipient;
}
