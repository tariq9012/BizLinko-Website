import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  Calendar,
  CalendarX,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { AppNotification, NotificationType } from "@/features/notifications/types";

const TYPE_ICON: Record<NotificationType, typeof Briefcase> = {
  application_status_changed: CheckCircle2,
  new_application: Briefcase,
  interview_scheduled: Calendar,
  interview_rescheduled: RefreshCw,
  interview_cancelled: CalendarX,
  interview_completed: CheckCircle2,
  new_message: MessageSquare,
};

export function NotificationItem({
  notification,
  onRead,
  compact,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  compact?: boolean;
}) {
  const Icon = TYPE_ICON[notification.type];
  const unread = !notification.readAt;

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary",
        unread && "bg-primary-soft/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          unread ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            unread ? "font-semibold text-foreground" : "font-medium text-foreground",
          )}
        >
          {notification.title}
        </p>
        {notification.body && !compact && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
    </div>
  );

  const handleClick = () => {
    if (unread) onRead(notification.id);
  };

  if (notification.actionUrl) {
    return (
      <Link to={notification.actionUrl} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full">
      {content}
    </button>
  );
}
