import type { CareerResource } from "@/types";

export const resources: CareerResource[] = [
  {
    id: "build-a-strong-resume",
    title: "How to Build a Strong Resume",
    category: "Resume",
    description:
      "A practical framework for structuring your resume so recruiters can see your impact in the first ten seconds.",
    readingTime: "7 min read",
    publishedAt: "2026-08-18",
    featured: true,
    body: [
      "A strong resume is a summary of outcomes, not a list of duties. Start each bullet with what changed because you were there, then add the context and the numbers.",
      "Keep the layout boring and the content sharp. One column, consistent dates, and clear section headings will always outperform decorative templates in applicant tracking systems.",
      "Tailor the top third of the page to the role you are applying for. That is the part that decides whether the rest gets read.",
    ],
  },
  {
    id: "interview-tips-for-developers",
    title: "Top Interview Tips for Developers",
    category: "Interviews",
    description:
      "How to prepare for technical interviews, structure your answers and show the way you actually think.",
    readingTime: "9 min read",
    publishedAt: "2026-08-04",
    body: [
      "Technical interviews reward communication as much as correctness. Narrate your assumptions before you start typing, and confirm the constraints.",
      "Prepare three or four project stories you can adapt: a hard bug, a design trade-off, a disagreement you resolved, and something you shipped end to end.",
      "Always finish with questions that show you understand the team's problems, not just the perks.",
    ],
  },
  {
    id: "find-the-right-job",
    title: "How to Find the Right Job",
    category: "Job Search",
    description:
      "Move from scattered applications to a focused search built around the work you actually want to do.",
    readingTime: "6 min read",
    publishedAt: "2026-07-22",
    body: [
      "Define your search criteria before you open a job board. Role, level, work mode, salary floor and industry are enough to filter most noise.",
      "Track every application in one place with the date, contact and stage. A simple pipeline beats memory.",
      "Twenty considered applications will beat two hundred generic ones, every time.",
    ],
  },
  {
    id: "negotiating-your-offer",
    title: "Negotiating Your Offer With Confidence",
    category: "Career Growth",
    description:
      "What to research, when to ask and how to phrase the conversation so both sides finish it well.",
    readingTime: "8 min read",
    publishedAt: "2026-07-09",
    body: [
      "Anchor on market data for your role, level and location, and separate base salary from the parts that are easier to move.",
      "Ask for time. A day to consider an offer is normal and expected.",
      "Frame the request around the scope of the role rather than personal need.",
    ],
  },
  {
    id: "remote-work-that-works",
    title: "Making Remote Work Actually Work",
    category: "Career Growth",
    description:
      "Habits and systems that keep remote professionals visible, effective and out of burnout.",
    readingTime: "5 min read",
    publishedAt: "2026-06-27",
    body: [
      "Write more than feels necessary. In distributed teams, written context is how influence travels.",
      "Protect a hard boundary at the end of the day; remote work expands to fill whatever space you leave.",
      "Make your progress visible through short weekly updates rather than waiting for review season.",
    ],
  },
  {
    id: "switching-careers-into-tech",
    title: "Switching Careers Into Tech",
    category: "Job Search",
    description:
      "A realistic path for career changers, from choosing a specialism to landing the first role.",
    readingTime: "10 min read",
    publishedAt: "2026-06-11",
    body: [
      "Pick one specialism and stay with it long enough to build depth. Breadth comes later.",
      "Translate your previous career into transferable evidence: stakeholder management, analysis, operations under pressure.",
      "Ship two or three real projects that solve a genuine problem, and write about how you built them.",
    ],
  },
];

export const featuredResource: CareerResource = resources.find((r) => r.featured) ?? resources[0]!;
export const resourceCategories = Array.from(new Set(resources.map((r) => r.category)));
export const getResourceById = (id: string) => resources.find((r) => r.id === id);
