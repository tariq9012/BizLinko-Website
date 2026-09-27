import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/Hero";
import { FeaturedJobs } from "@/components/home/FeaturedJobs";
import { PopularCategories } from "@/components/home/PopularCategories";
import { TopCompanies } from "@/components/home/TopCompanies";
import { RecentJobs } from "@/components/home/RecentJobs";
import { WhyBizLinko } from "@/components/home/WhyBizLinko";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ResourcesPreview } from "@/components/home/ResourcesPreview";
import { EmployerCTA } from "@/components/home/EmployerCTA";

const title = "BizLinko — Find the Right Job. Build Your Future.";
const description =
  "Discover jobs from trusted companies, explore employers and grow your career with BizLinko.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedJobs />
      <PopularCategories />
      <TopCompanies />
      <RecentJobs />
      <WhyBizLinko />
      <HowItWorks />
      <ResourcesPreview />
      <EmployerCTA />
    </>
  );
}
