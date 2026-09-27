import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * One channel per signed-in user, filtered to their own notifications —
 * never an unfiltered subscription. A new_message notification is also
 * how the conversation list/unread badge stay live without a second,
 * broader subscription on `messages` itself.
 */
export function useNotificationsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const topic = `realtime:notifications:${userId}`;

    // Defensive: if a channel with this exact topic is already registered
    // (e.g. React Strict Mode's dev double-invoke, or Fast Refresh, didn't
    // finish tearing down the previous one yet), supabase-js's `channel()`
    // would hand back that *same already-subscribed* instance instead of a
    // fresh one — and calling `.on()` on an already-subscribed channel
    // throws. Clearing it first guarantees we always start from a clean,
    // unsubscribed channel.
    const stale = supabase.getChannels().find((c) => c.topic === topic);
    if (stale) void supabase.removeChannel(stale);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
          void queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
          void queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
          const row = payload.new as { type?: string };
          if (row.type === "new_message") {
            void queryClient.invalidateQueries({ queryKey: ["conversations"] });
            void queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
          void queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
          void queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
