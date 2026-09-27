import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Clock, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchSuggestions, type SearchSuggestion } from "@/features/jobs/queries";
import { useRecentSearches, type RecentSearch } from "@/features/search/queries";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<SearchSuggestion["kind"], string> = {
  title: "Job title",
  company: "Company",
  skill: "Skill",
  location: "Location",
};

export function JobSearchBar({
  keyword,
  location,
  onKeywordChange,
  onLocationChange,
  onSubmit,
  onRerunRecent,
  userId,
  className,
}: {
  keyword: string;
  location: string;
  onKeywordChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onSubmit: () => void;
  onRerunRecent?: (search: RecentSearch) => void;
  userId?: string | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const { data: suggestions = [] } = useSearchSuggestions(debouncedKeyword);
  const { data: recentSearches = [] } = useRecentSearches(userId);

  const showRecent = keyword.trim().length === 0 && recentSearches.length > 0;
  const items: { label: string; onSelect: () => void; icon: "recent" | "search"; meta?: string }[] =
    showRecent
      ? recentSearches.slice(0, 6).map((r) => ({
          label: r.query || "Saved filters",
          icon: "recent",
          onSelect: () => onRerunRecent?.(r),
        }))
      : suggestions.map((s) => ({
          label: s.suggestion,
          icon: "search",
          meta: KIND_LABEL[s.kind],
          onSelect: () => {
            onKeywordChange(s.suggestion);
            setOpen(false);
            onSubmit();
          },
        }));

  useEffect(() => {
    setHighlighted(-1);
  }, [keyword, showRecent]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    onSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      items[highlighted]?.onSelect();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              role="combobox"
              aria-expanded={open}
              aria-controls="job-search-suggestions"
              aria-autocomplete="list"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
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
            Search Jobs
          </Button>
        </div>
      </form>

      {open && items.length > 0 && (
        <ul
          id="job-search-suggestions"
          role="listbox"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          {showRecent && (
            <li className="border-b border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Recent searches
            </li>
          )}
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} role="option" aria-selected={highlighted === i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={item.onSelect}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-secondary",
                  highlighted === i && "bg-secondary",
                )}
              >
                {item.icon === "recent" ? (
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-foreground">{item.label}</span>
                {item.meta && (
                  <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground hover:border-destructive/40 hover:text-destructive"
    >
      {label}
      <X className="size-3" />
    </button>
  );
}
