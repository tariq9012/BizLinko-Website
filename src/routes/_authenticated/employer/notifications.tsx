import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const Route = createFileRoute("/_authenticated/employer/notifications")({
  head: () => ({ meta: [{ title: "Notifications — BizLinko" }] }),
  component: NotificationsPage,
});
