import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function EmployerCTA() {
  return (
    <section className="section-y">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 text-navy-foreground sm:px-12 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-primary/40 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
              Looking for Great Talent?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-navy-foreground/75">
              Reach skilled professionals and find the right people for your team.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/employer">Post a Job</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/employer">Explore Talent</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
