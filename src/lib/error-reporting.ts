type AppErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type AppErrorReporter = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: AppErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __appErrorReporter?: AppErrorReporter;
  }
}

/**
 * Reports an error caught by a React error boundary.
 *
 * Production React does not rethrow boundary-caught errors to
 * `window.onerror`, so generic browser error monitoring never sees them.
 * This forwards them to an app-owned reporter (e.g. Sentry, Bugsnag, or a
 * custom logging endpoint) if one has been wired up on `window`.
 *
 * Loaders and server fns commonly throw a raw Response; String(it) is the
 * opaque "[object Response]", so pull out the status and URL instead.
 */
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  window.__appErrorReporter?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      message,
      ...(stack !== undefined && { stack }),
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
