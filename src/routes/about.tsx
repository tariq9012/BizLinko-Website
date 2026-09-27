import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/common/ComingSoonPage";

const title = "About BizLinko — BizLinko";
const description =
  "BizLinko connects job seekers with employers through a modern, transparent hiring experience.";

export const Route = createFileRoute("/about")({
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
      title="About BizLinko"
      description="BizLinko connects job seekers with employers through a modern, transparent hiring experience."
    />
  ),
});
