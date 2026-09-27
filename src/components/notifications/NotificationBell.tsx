import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useRecentNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/queries";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/features/notifications/mutations";
import { useNotificationsRealtime } from "@/features/notifications/realtime";
import { NotificationItem } from "./NotificationItem";

export function NotificationBell() {
  const { currentUser, role } = useAuth();
  const userId = currentUser?.id;
  const { data: notifications = [], isPending } = useRecentNotifications(userId);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  useNotificationsRealtime(userId);

  const notificationsHome =
    role === "employer" ? "/employer/notifications" : "/job-seeker/notifications";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-1.5 py-1 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isPending ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markRead.mutate(id)}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to={notificationsHome}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
