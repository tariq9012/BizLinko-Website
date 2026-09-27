import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/common/ComingSoonPage";

const title = "Post jobs and find talent — BizLinko";
const description = "Publish roles, manage candidates and reach skilled professionals on BizLinko.";

export const Route = createFileRoute("/employer")({
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
      title="For Employers"
      description="Publish roles, manage candidates and reach skilled professionals on BizLinko."
    />
  ),
});
