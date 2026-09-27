import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories as staticCategories } from "@/data/categories";
import type { ExperienceLevel, JobFilters, JobType, SalaryPeriod, WorkMode } from "@/types";

const jobTypes: JobType[] = ["Full-time", "Part-time", "Contract", "Internship"];
const workModes: WorkMode[] = ["Remote", "Hybrid", "On-site"];
const levels: ExperienceLevel[] = ["Entry", "Mid", "Senior", "Lead"];
const datePostedOptions = [
  { value: "any", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  allSkills,
  categories = staticCategories,
}: {
  filters: JobFilters;
  onChange: (f: JobFilters) => void;
  onReset: () => void;
  allSkills: string[];
  categories?: { slug: string; name: string }[];
}) {
  const set = (patch: Partial<JobFilters>) => onChange({ ...filters, ...patch });

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      <Group title="Location">
        <Input
          value={filters.location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="City, country or remote"
          aria-label="Filter by location"
        />
      </Group>

      <Group title="Category">
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Checkbox
              checked={filters.category === ""}
              onCheckedChange={() => set({ category: "" })}
            />
            All categories
          </label>
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={filters.category === c.slug}
                onCheckedChange={() => set({ category: filters.category === c.slug ? "" : c.slug })}
              />
              {c.name}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Job Type">
        <div className="space-y-2.5">
          {jobTypes.map((t) => (
            <label key={t} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={filters.types.includes(t)}
                onCheckedChange={() => set({ types: toggle(filters.types, t) })}
              />
              {t}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Work Mode">
        <div className="space-y-2.5">
          {workModes.map((m) => (
            <label key={m} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={filters.workModes.includes(m)}
                onCheckedChange={() => set({ workModes: toggle(filters.workModes, m) })}
              />
              {m}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Experience Level">
        <div className="space-y-2.5">
          {levels.map((l) => (
            <label key={l} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox
                checked={filters.experience.includes(l)}
                onCheckedChange={() => set({ experience: toggle(filters.experience, l) })}
              />
              {l}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Salary">
        <div className="space-y-2.5">
          <Select
            value={filters.salaryPeriod || "any"}
            onValueChange={(v) => set({ salaryPeriod: v === "any" ? "" : (v as SalaryPeriod) })}
          >
            <SelectTrigger aria-label="Salary period">
              <SelectValue placeholder="Any period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any period</SelectItem>
              <SelectItem value="year">Per year</SelectItem>
              <SelectItem value="month">Per month</SelectItem>
              <SelectItem value="hour">Per hour</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={filters.minSalary || ""}
              onChange={(e) => set({ minSalary: Number(e.target.value) || 0 })}
              placeholder="Min"
              aria-label="Minimum salary"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={filters.maxSalary || ""}
              onChange={(e) => set({ maxSalary: Number(e.target.value) || 0 })}
              placeholder="Max"
              aria-label="Maximum salary"
            />
          </div>
          {(filters.minSalary > 0 || filters.maxSalary > 0) && !filters.salaryPeriod && (
            <p className="text-xs text-muted-foreground">
              Pick a salary period above to apply this filter.
            </p>
          )}
        </div>
      </Group>

      <Group title="Company">
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            checked={filters.verifiedOnly}
            onCheckedChange={(checked) => set({ verifiedOnly: checked === true })}
          />
          Verified companies only
        </label>
      </Group>

      <Group title="Skills">
        <div className="flex flex-wrap gap-2">
          {allSkills.map((s) => {
            const active = filters.skills.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => set({ skills: toggle(filters.skills, s) })}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-md border border-transparent bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Date Posted">
        <div className="space-y-2.5">
          {datePostedOptions.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
            >
              <Checkbox
                checked={filters.datePosted === o.value}
                onCheckedChange={() => set({ datePosted: o.value })}
              />
              <Label className="cursor-pointer font-normal text-muted-foreground">{o.label}</Label>
            </label>
          ))}
        </div>
      </Group>
    </div>
  );
}
