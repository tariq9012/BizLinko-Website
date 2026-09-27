import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, ExternalLink, Github, Globe, MapPin } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/common/Tag";
import { initials, formatDate } from "@/lib/format";
import { candidateFullName, useCandidateDetail } from "@/features/candidates/queries";
import { useSaveCandidate, useUnsaveCandidate } from "@/features/candidates/mutations";
import { useSavedCandidates } from "@/features/candidates/queries";

export const Route = createFileRoute("/_authenticated/employer/candidates_/$candidateId")({
  head: () => ({ meta: [{ title: "Candidate — BizLinko" }] }),
  component: CandidateDetailPage,
});

function CandidateDetailPage() {
  const { candidateId } = Route.useParams();
  const { data: candidate, isPending, isError } = useCandidateDetail(candidateId);
  const { data: savedList } = useSavedCandidates(1);
  const saveCandidate = useSaveCandidate();
  const unsaveCandidate = useUnsaveCandidate();

  if (isPending) {
    return <LoadingSkeleton className="h-64 w-full rounded-2xl" />;
  }

  if (isError || !candidate) {
    return (
      <EmptyState
        title="This profile isn't available"
        description="The candidate may have turned off employer discovery, or no longer exists."
      />
    );
  }

  const name = candidateFullName(candidate.firstName, candidate.lastName);
  const isSaved = savedList?.rows.some((r) => r.candidateId === candidateId) ?? false;

  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        await unsaveCandidate.mutateAsync(candidateId);
        toast.success("Removed from saved candidates");
      } else {
        await saveCandidate.mutateAsync(candidateId);
        toast.success("Candidate saved");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update saved candidates.");
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" asChild>
        <Link to="/employer/candidates">
          <ArrowLeft className="size-4" /> Back to candidates
        </Link>
      </Button>

      <DashboardHeader
        title={name}
        description={candidate.headline ?? candidate.currentJobTitle ?? ""}
        action={
          <Button
            variant="outline"
            disabled={saveCandidate.isPending || unsaveCandidate.isPending}
            onClick={() => void handleToggleSave()}
          >
            <Bookmark className={isSaved ? "size-4 fill-primary text-primary" : "size-4"} />
            {isSaved ? "Saved" : "Save candidate"}
          </Button>
        }
      />

      <div className="mb-6 flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Avatar className="size-16">
          <AvatarImage src={candidate.avatar ?? undefined} alt={name} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {candidate.yearsOfExperience != null && (
              <Tag>{candidate.yearsOfExperience} yrs experience</Tag>
            )}
            {candidate.location && (
              <Tag>
                <MapPin className="size-3.5" /> {candidate.location}
              </Tag>
            )}
            {candidate.openToWork && <Tag>Open to work</Tag>}
          </div>
          {candidate.bio && <p className="mt-3 text-sm text-muted-foreground">{candidate.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-3">
            {candidate.githubUrl && (
              <a
                href={candidate.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Github className="size-4" /> GitHub <ExternalLink className="size-3" />
              </a>
            )}
            {candidate.portfolioUrl && (
              <a
                href={candidate.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Globe className="size-4" /> Portfolio <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {candidate.skills.length > 0 && (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-base font-semibold text-foreground">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm text-foreground">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {candidate.experience.length > 0 && (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-base font-semibold text-foreground">Experience</h2>
          <ul className="mt-3 space-y-4">
            {candidate.experience.map((e, i) => (
              <li key={i}>
                <p className="font-medium text-foreground">{e.jobTitle}</p>
                <p className="text-sm text-muted-foreground">{e.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.startDate)} –{" "}
                  {e.isCurrent ? "Present" : e.endDate ? formatDate(e.endDate) : "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {candidate.education.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-base font-semibold text-foreground">Education</h2>
          <ul className="mt-3 space-y-4">
            {candidate.education.map((e, i) => (
              <li key={i}>
                <p className="font-medium text-foreground">{e.institution}</p>
                <p className="text-sm text-muted-foreground">
                  {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                </p>
                {e.startDate && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.startDate)} – {e.endDate ? formatDate(e.endDate) : "Present"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
