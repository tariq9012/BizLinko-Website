import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsList, type NotificationFilter } from "@/features/notifications/queries";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/features/notifications/mutations";
import { useState } from "react";

export function NotificationsPage() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationsList(currentUser?.id, filter);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  // Realtime is owned by NotificationBell (mounted once, app-wide, in the
  // navbar) — subscribing again here with the same channel name
  // (`notifications:${userId}`) would make supabase-js reuse that already
  // -subscribed channel object and throw on the second `.on()` call. This
  // page still updates live because the Bell's subscription invalidates
  // the same "notifications-list" query key this page reads.

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  return (
    <>
      <DashboardHeader
        title="Notifications"
        description="Application updates, interviews, and new messages."
        action={
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border p-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState title="Couldn't load notifications" description="Please try again." />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
              description={
                filter === "unread"
                  ? "New updates will show up here."
                  : "Application updates, interviews, and messages will show up here."
              }
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markRead.mutate(id)}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="flex justify-center p-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
