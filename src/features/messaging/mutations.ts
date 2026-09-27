import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapMessage, type MessageRow } from "./types";
import type { MessagePage } from "./queries";

function friendlyMessagingError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("row-level security") || code === "42501") {
    return "You don't have permission to do that.";
  }
  if (message.toLowerCase().includes("no longer accepts")) {
    return "This conversation is closed to new messages.";
  }
  return message || "Something went wrong. Please try again.";
}

function useInvalidateConversations() {
  const queryClient = useQueryClient();
  return (conversationId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    void queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    if (conversationId) {
      void queryClient.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
    }
  };
}

/** Finds or atomically creates the one conversation for an application —
 * safe to call every time the "Message" button is clicked, including under
 * concurrent double-clicks (the DB function is the source of truth). */
export function useFindOrCreateConversation() {
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase.rpc("find_or_create_conversation", {
        p_application_id: applicationId,
      });
      if (error) throw new Error(friendlyMessagingError(error));
      return data;
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      const id = crypto.randomUUID();
      const { data, error } = await supabase
        .from("messages")
        .insert({ id, conversation_id: conversationId, body })
        .select("*")
        .single();
      if (error) throw new Error(friendlyMessagingError(error));
      return data as MessageRow;
    },
    onSuccess: (row, { conversationId }) => {
      // Shows the message immediately (the mutation's own round trip),
      // deduped by id against the realtime INSERT event that will also
      // arrive for this same row a moment later.
      const message = mapMessage(row);
      queryClient.setQueryData<{ pages: MessagePage[]; pageParams: unknown[] } | undefined>(
        ["conversation-messages", conversationId],
        (old) => {
          if (!old || old.pages.length === 0) return old;
          const [newest, ...rest] = old.pages;
          if (!newest || newest.messages.some((m) => m.id === message.id)) return old;
          return {
            ...old,
            pages: [{ ...newest, messages: [...newest.messages, message] }, ...rest],
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({
        queryKey: ["conversation-participant", conversationId],
      });
    },
  });
}

export function useEditMessage() {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: async ({
      messageId,
      body,
    }: {
      messageId: string;
      conversationId: string;
      body: string;
    }) => {
      const { error } = await supabase.from("messages").update({ body }).eq("id", messageId);
      if (error) throw new Error(friendlyMessagingError(error));
    },
    onSuccess: (_d, { conversationId }) => invalidate(conversationId),
  });
}

export function useDeleteMessage() {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId);
      if (error) throw new Error(friendlyMessagingError(error));
    },
    onSuccess: (_d, { conversationId }) => invalidate(conversationId),
  });
}

/** Updates the caller's own last_read_at — called when a conversation is
 * actually opened/viewed, never just because it appears in the sidebar. */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
      void queryClient.invalidateQueries({
        queryKey: ["conversation-participant", conversationId],
      });
    },
  });
}
