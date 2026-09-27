import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const Route = createFileRoute("/_authenticated/job-seeker/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BizLinko" }] }),
  component: NotificationsPage,
});
