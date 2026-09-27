import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/common/ComingSoonPage";

const title = "Contact BizLinko — BizLinko";
const description = "Get in touch with the BizLinko team about hiring, support or partnerships.";

export const Route = createFileRoute("/contact")({
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
      title="Contact Us"
      description="Get in touch with the BizLinko team about hiring, support or partnerships."
    />
  ),
});
