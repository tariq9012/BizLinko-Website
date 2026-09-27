import { Link } from "@tanstack/react-router";
import { Bookmark, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import { candidateFullName } from "@/features/candidates/queries";

export function CandidateCard({
  candidate,
  matchReasons,
  saved,
  onToggleSave,
  toggling,
  detailHref,
}: {
  candidate: {
    candidateId: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    headline: string | null;
    yearsOfExperience: number | null;
    skills: string[];
    openToWork?: boolean;
    location?: string | null;
  };
  matchReasons?: string[];
  saved?: boolean;
  onToggleSave?: () => void;
  toggling?: boolean;
  detailHref: string;
}) {
  const name = candidateFullName(candidate.firstName, candidate.lastName);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start gap-3">
        <Avatar className="size-11">
          <AvatarImage src={candidate.avatar ?? undefined} alt={name} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              <Link to={detailHref} className="hover:text-primary">
                {name}
              </Link>
            </h3>
            {onToggleSave && (
              <button
                type="button"
                onClick={onToggleSave}
                disabled={toggling}
                aria-label={saved ? "Unsave candidate" : "Save candidate"}
                className="shrink-0 text-muted-foreground hover:text-primary"
              >
                <Bookmark className={saved ? "size-5 fill-primary text-primary" : "size-5"} />
              </button>
            )}
          </div>
          {candidate.headline && (
            <p className="truncate text-sm text-muted-foreground">{candidate.headline}</p>
          )}
        </div>
      </div>

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

      {candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 6).map((s) => (
            <span
              key={s}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {matchReasons && matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matchReasons.map((r) => (
            <span
              key={r}
              className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="mt-auto w-fit" asChild>
        <Link to={detailHref}>View profile</Link>
      </Button>
    </article>
  );
}
