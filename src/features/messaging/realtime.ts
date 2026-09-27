import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapMessage, type MessageRow } from "./types";
import type { MessagePage } from "./queries";

/**
 * Live updates for one open conversation. Subscribes only to that
 * conversation's messages (never an unfiltered `messages` subscription),
 * and unsubscribes on unmount or when `conversationId` changes — a single
 * channel per open thread, re-created only when the id actually changes.
 *
 * New rows are spliced directly into the newest page of the paginated
 * message cache (deduped by id) instead of invalidating the whole
 * infinite query, which would refetch every already-loaded page and blow
 * away the scroll position of someone reading older history. The
 * conversation list summary (unread counts, previews) is cheap to
 * refetch wholesale, so that one still uses a plain invalidate.
 */
export function useConversationRealtime(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const queryKey = ["conversation-messages", conversationId];
    const topic = `realtime:messages:${conversationId}`;

    // Same defensive clear as the notifications channel — see comment there.
    const stale = supabase.getChannels().find((c) => c.topic === topic);
    if (stale) void supabase.removeChannel(stale);

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = mapMessage(payload.new as MessageRow);
          queryClient.setQueryData<{ pages: MessagePage[]; pageParams: unknown[] } | undefined>(
            queryKey,
            (old) => {
              if (!old || old.pages.length === 0) return old;
              const [newest, ...rest] = old.pages;
              if (!newest || newest.messages.some((m) => m.id === row.id)) return old;
              return {
                ...old,
                pages: [{ ...newest, messages: [...newest.messages, row] }, ...rest],
              };
            },
          );
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = mapMessage(payload.new as MessageRow);
          queryClient.setQueryData<{ pages: MessagePage[]; pageParams: unknown[] } | undefined>(
            queryKey,
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) => (m.id === row.id ? row : m)),
                })),
              };
            },
          );
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}
