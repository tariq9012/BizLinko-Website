import { SectionHeader } from "@/components/common/SectionHeader";

const steps = [
  {
    number: "01",
    title: "Create Your Profile",
    text: "Build your professional profile and showcase your skills.",
  },
  {
    number: "02",
    title: "Discover Opportunities",
    text: "Search and filter jobs that match your goals.",
  },
  {
    number: "03",
    title: "Apply & Get Hired",
    text: "Apply to jobs and track your application journey.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeader
          align="center"
          eyebrow="How it works"
          title="Three Steps to Your Next Role"
          description="A straightforward path from profile to offer, designed to keep your search organised."
        />
        <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[2.15rem] hidden h-px bg-border md:block"
          />
          {steps.map((s) => (
            <li
              key={s.number}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-navy text-sm font-bold text-navy-foreground">
                {s.number}
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
