import { Construction } from "lucide-react";

export function ComingSoonSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Construction className="size-5" />
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-sm font-medium text-primary">Coming in a later phase.</p>
    </div>
  );
}
