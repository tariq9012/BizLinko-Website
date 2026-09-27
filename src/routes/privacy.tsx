import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/common/ComingSoonPage";

const title = "Privacy at BizLinko — BizLinko";
const description = "How BizLinko handles personal data across the platform.";

export const Route = createFileRoute("/privacy")({
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
      title="Privacy Policy"
      description="How BizLinko handles personal data across the platform."
    />
  ),
});
