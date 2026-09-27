import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ConversationList, MessagingEmptyPane } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { useAuth } from "@/hooks/useAuth";
import { useMyConversations } from "@/features/messaging/queries";

type MessagesSearch = { conversation?: string | undefined };

export const Route = createFileRoute("/_authenticated/employer/messages")({
  validateSearch: (search: Record<string, unknown>): MessagesSearch => ({
    conversation:
      typeof search["conversation"] === "string" && search["conversation"]
        ? (search["conversation"] as string)
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — BizLinko" }] }),
  component: EmployerMessagesPage,
});

function EmployerMessagesPage() {
  const { conversation: conversationId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { currentUser } = useAuth();
  const { data: conversations = [], isPending, isError } = useMyConversations();

  const selected = conversations.find((c) => c.conversationId === conversationId);

  const selectConversation = (id: string) => {
    void navigate({ search: { conversation: id } });
  };

  return (
    <>
      <DashboardHeader
        title="Messages"
        description="Conversations with candidates about your open roles."
      />
      <div className="grid h-[calc(100dvh-14rem-4.5rem)] min-h-[24rem] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] md:grid-cols-[320px_1fr] lg:h-[calc(100dvh-14rem)]">
        <div
          className={`min-h-0 overflow-y-auto border-border md:border-r ${conversationId ? "hidden md:block" : ""}`}
        >
          <ConversationList
            conversations={conversations}
            isPending={isPending}
            isError={isError}
            selectedId={conversationId}
            onSelect={selectConversation}
            viewerRole="employer"
          />
        </div>
        <div className={`min-h-0 ${conversationId ? "" : "hidden md:block"}`}>
          {!conversationId ? (
            <MessagingEmptyPane />
          ) : !currentUser ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : selected ? (
            <div className="flex h-full flex-col">
              <Button
                variant="ghost"
                size="sm"
                className="m-2 w-fit md:hidden"
                onClick={() => void navigate({ search: {} })}
              >
                <ArrowLeft className="size-4" /> Conversations
              </Button>
              <div className="min-h-0 flex-1">
                <MessageThread
                  conversation={selected}
                  currentUserId={currentUser.id}
                  viewerRole="employer"
                />
              </div>
            </div>
          ) : isPending ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MessagingEmptyPane />
          )}
        </div>
      </div>
    </>
  );
}
