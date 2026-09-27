import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  primary: "bg-primary-soft text-primary border-transparent",
  success: "bg-success/10 text-success border-transparent",
  warning: "bg-warning/15 text-warning-foreground border-transparent",
};

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
