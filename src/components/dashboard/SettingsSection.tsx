import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
  action,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "danger";
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6",
        tone === "danger" ? "border-destructive/40" : "border-border",
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <h2
              className={cn(
                "font-display text-lg font-semibold",
                tone === "danger" ? "text-destructive" : "text-foreground",
              )}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function ToggleRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
