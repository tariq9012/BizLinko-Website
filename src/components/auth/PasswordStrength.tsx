import { Check, X } from "lucide-react";
import { passwordChecks, passwordStrength } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const checks = passwordChecks(password);

  const barTone =
    score >= 4
      ? "bg-success"
      : score === 3
        ? "bg-primary"
        : score === 2
          ? "bg-warning"
          : "bg-destructive";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn("h-full flex-1 rounded-full", i < score ? barTone : "bg-secondary")}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              c.passed ? "text-success" : "text-muted-foreground",
            )}
          >
            {c.passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
