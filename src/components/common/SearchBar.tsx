import { type FormEvent, type ReactNode } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchBar({
  keyword,
  location,
  onKeywordChange,
  onLocationChange,
  onSubmit,
  submitLabel = "Search Jobs",
  extra,
  className,
}: {
  keyword: string;
  location: string;
  onKeywordChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  extra?: ReactNode;
  className?: string;
}) {
  const handle = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handle}
      className={cn(
        "rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Job title, skills, or keywords"
            aria-label="Job title, skills, or keywords"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="hidden h-8 w-px bg-border md:block" />
        <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="City, country or remote"
            aria-label="Location"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button type="submit" size="lg" className="md:w-auto">
          {submitLabel}
        </Button>
      </div>
      {extra && <div className="px-3 pb-2 pt-1">{extra}</div>}
    </form>
  );
}
