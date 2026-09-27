import { GraduationCap, Rocket, Search, SendHorizonal } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";

const features = [
  {
    icon: Search,
    title: "Smart Job Search",
    text: "Find relevant opportunities using powerful search and filters.",
  },
  {
    icon: Rocket,
    title: "Career Opportunities",
    text: "Discover roles from growing companies and established organizations.",
  },
  {
    icon: SendHorizonal,
    title: "Easy Applications",
    text: "Apply to opportunities through a simple and streamlined process.",
  },
  {
    icon: GraduationCap,
    title: "Career Growth",
    text: "Access resources that help you improve your resume, interview skills and career strategy.",
  },
];

export function WhyBizLinko() {
  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <SectionHeader
          align="center"
          eyebrow="Why BizLinko"
          title="Everything You Need to Find Your Next Opportunity"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
