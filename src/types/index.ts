export type JobType = "Full-time" | "Part-time" | "Contract" | "Internship";
export type WorkMode = "Remote" | "Hybrid" | "On-site";
export type ExperienceLevel = "Entry" | "Mid" | "Senior" | "Lead";

export type JobStatus = "draft" | "published" | "closed" | "archived";
export type SalaryPeriod = "year" | "month" | "hour";

export interface Job {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  location: string;
  type: JobType;
  workMode: WorkMode;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  experience: ExperienceLevel;
  category: string;
  skills: string[];
  postedAt: string; // ISO date
  featured?: boolean;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  // Added for the database-backed jobs system (Phase 3). Optional so the
  // type stays compatible with any remaining static/demo usage.
  slug?: string;
  status?: JobStatus;
  qualifications?: string[];
  hideSalary?: boolean;
  salaryPeriod?: SalaryPeriod;
  applicationDeadline?: string | null;
  categoryName?: string;
  companySlug?: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  employees: string;
  website: string;
  founded: string;
  about: string;
  overview: string[];
  // Added for the database-backed companies system (Phase 5).
  slug?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  linkedinUrl?: string | null;
  verified?: boolean;
  openJobCount?: number;
}

export interface Category {
  slug: string;
  name: string;
  icon: string;
  jobCount: number;
}

export interface CareerResource {
  id: string;
  title: string;
  category: string;
  description: string;
  readingTime: string;
  publishedAt: string;
  featured?: boolean;
  body: string[];
}

export interface JobFilters {
  keyword: string;
  location: string;
  category: string;
  types: JobType[];
  workModes: WorkMode[];
  experience: ExperienceLevel[];
  minSalary: number;
  maxSalary: number;
  salaryPeriod: SalaryPeriod | "";
  verifiedOnly: boolean;
  datePosted: string;
  skills: string[];
}
