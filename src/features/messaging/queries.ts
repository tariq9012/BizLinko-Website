import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapConversationSummary, mapMessage, type Message, type MessageRow } from "./types";

const PAGE_SIZE = 40;

/** Conversation list for the current user — one efficient RPC call, no
 * N+1 (see get_my_conversations() in the migration). Works for both the
 * employer and job-seeker messages pages; each page decides which side of
 * the row (candidate vs company) is "them". */
export function useMyConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_conversations");
      if (error) throw error;
      return data.map(mapConversationSummary);
    },
    refetchOnWindowFocus: true,
  });
}

export interface MessagePage {
  messages: Message[];
  nextCursor: { createdAt: string; id: string } | null;
}

/** Newest PAGE_SIZE messages first, older pages loaded on demand — never
 * an unbounded history fetch. Pages come back newest-first from Postgres
 * (stable order: created_at + id) and are reversed here so the caller can
 * always render oldest → newest by concatenating pages in fetch order. */
export function useConversationMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["conversation-messages", conversationId],
    enabled: !!conversationId,
    initialPageParam: null as { createdAt: string; id: string } | null,
    queryFn: async ({ pageParam }): Promise<MessagePage> => {
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId as string)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.or(
          `created_at.lt.${pageParam.createdAt},and(created_at.eq.${pageParam.createdAt},id.lt.${pageParam.id})`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = data as MessageRow[];
      const messages = rows.map(mapMessage).reverse();
      const last = rows[rows.length - 1];
      return {
        messages,
        nextCursor:
          rows.length === PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/** The caller's own last_read_at for this conversation — used to decide
 * whether to show a "new message" indicator vs auto-scroll on realtime
 * inserts while the user is reading older history. */
export function useMyParticipant(conversationId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["conversation-participant", conversationId, userId],
    enabled: !!conversationId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("last_read_at")
        .eq("conversation_id", conversationId as string)
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
