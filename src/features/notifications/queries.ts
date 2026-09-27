import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapNotification, type NotificationRow } from "./types";

const PAGE_SIZE = 20;
const BELL_LIMIT = 8;

/** Latest notifications for the bell popover — a small, fixed fetch, not
 * the paginated list. */
export function useRecentNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications-recent", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(BELL_LIMIT);
      if (error) throw error;
      return (data as NotificationRow[]).map(mapNotification);
    },
    refetchInterval: 60_000,
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["unread-notification-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useUnreadMessageCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["unread-message-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_message_count");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

export type NotificationFilter = "all" | "unread";

/** Full notifications page — paginated, "All" / "Unread" tabs. */
export function useNotificationsList(userId: string | undefined, filter: NotificationFilter) {
  return useInfiniteQuery({
    queryKey: ["notifications-list", userId, filter],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, pageParam * PAGE_SIZE + PAGE_SIZE - 1);
      if (filter === "unread") query = query.is("read_at", null);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data as NotificationRow[];
      return {
        notifications: rows.map(mapNotification),
        page: pageParam,
        isLast: rows.length < PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.isLast ? undefined : lastPage.page + 1),
  });
}
