import { Link } from "@tanstack/react-router";
import { Github, Linkedin, Twitter } from "lucide-react";
import { Logo } from "./Logo";

const columns = [
  {
    title: "For Job Seekers",
    links: [
      { label: "Browse Jobs", to: "/jobs" },
      { label: "Career Resources", to: "/career-resources" },
      { label: "Job Alerts", to: "/job-seeker" },
      { label: "My Applications", to: "/job-seeker" },
    ],
  },
  {
    title: "For Employers",
    links: [
      { label: "Post a Job", to: "/employer" },
      { label: "Find Candidates", to: "/employer" },
      { label: "Employer Dashboard", to: "/employer" },
      { label: "Pricing", to: "/employer" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page py-12 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Connect Talent With Opportunity.
            </p>
            <div className="mt-5 flex gap-2">
              {[Linkedin, Twitter, Github].map((Icon, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
                >
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">© 2026 BizLinko. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
