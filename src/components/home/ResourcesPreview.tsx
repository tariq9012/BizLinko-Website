import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { Button } from "@/components/ui/button";
import { resources } from "@/data/resources";

export function ResourcesPreview() {
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeader
          eyebrow="Career resources"
          title="Level Up Your Career"
          description="Practical guides on resumes, interviews and finding the right role."
          action={
            <Button variant="outline" asChild>
              <Link to="/career-resources">
                All Resources
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {resources.slice(0, 3).map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      </div>
    </section>
  );
}
