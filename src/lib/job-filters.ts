import type { Job, JobFilters } from "@/types";

export const emptyFilters: JobFilters = {
  keyword: "",
  location: "",
  category: "",
  types: [],
  workModes: [],
  experience: [],
  minSalary: 0,
  maxSalary: 0,
  salaryPeriod: "",
  verifiedOnly: false,
  datePosted: "any",
  skills: [],
};

const withinDays = (iso: string, days: number) =>
  Date.now() - new Date(iso).getTime() <= days * 86_400_000;

export function filterJobs(all: Job[], f: JobFilters): Job[] {
  const kw = f.keyword.trim().toLowerCase();
  const loc = f.location.trim().toLowerCase();

  return all.filter((job) => {
    if (
      kw &&
      ![job.title, job.companyName, job.summary, ...job.skills].join(" ").toLowerCase().includes(kw)
    )
      return false;

    if (loc) {
      const remoteMatch = loc === "remote" && job.workMode === "Remote";
      if (!remoteMatch && !job.location.toLowerCase().includes(loc)) return false;
    }

    if (f.category && job.category !== f.category) return false;
    if (f.types.length && !f.types.includes(job.type)) return false;
    if (f.workModes.length && !f.workModes.includes(job.workMode)) return false;
    if (f.experience.length && !f.experience.includes(job.experience)) return false;
    if (f.minSalary && job.salaryMax < f.minSalary) return false;
    if (f.skills.length && !f.skills.every((s) => job.skills.includes(s))) return false;

    if (f.datePosted === "24h" && !withinDays(job.postedAt, 1)) return false;
    if (f.datePosted === "7d" && !withinDays(job.postedAt, 7)) return false;
    if (f.datePosted === "30d" && !withinDays(job.postedAt, 30)) return false;

    return true;
  });
}

export type SortKey = "recent" | "salary-high" | "salary-low" | "title";

export function sortJobs(list: Job[], key: SortKey): Job[] {
  const out = [...list];
  switch (key) {
    case "salary-high":
      return out.sort((a, b) => b.salaryMax - a.salaryMax);
    case "salary-low":
      return out.sort((a, b) => a.salaryMin - b.salaryMin);
    case "title":
      return out.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return out.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }
}

export function countActiveFilters(f: JobFilters) {
  return (
    (f.location ? 1 : 0) +
    (f.category ? 1 : 0) +
    f.types.length +
    f.workModes.length +
    f.experience.length +
    f.skills.length +
    (f.minSalary ? 1 : 0) +
    (f.maxSalary ? 1 : 0) +
    (f.verifiedOnly ? 1 : 0) +
    (f.datePosted !== "any" ? 1 : 0)
  );
}

export function similarJobs(all: Job[], job: Job, limit = 3) {
  return all
    .filter((j) => j.id !== job.id)
    .map((j) => ({
      job: j,
      score:
        (j.category === job.category ? 3 : 0) +
        (j.workMode === job.workMode ? 1 : 0) +
        j.skills.filter((s) => job.skills.includes(s)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.job);
}
