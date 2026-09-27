import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/common/ComingSoonPage";

const title = "Your job seeker dashboard — BizLinko";
const description = "Track applications, saved jobs and job alerts in a single workspace.";

export const Route = createFileRoute("/job-seeker")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: () => (
    <ComingSoonPage
      title="Job Seeker Dashboard"
      description="Track applications, saved jobs and job alerts in a single workspace."
    />
  ),
});
