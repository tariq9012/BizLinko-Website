import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="container-page section-y">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Construction className="size-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
        <p className="mt-4 text-sm font-medium text-primary">Coming in the next phase.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
