import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import { useConversationMessages, useMyParticipant } from "@/features/messaging/queries";
import { useConversationRealtime } from "@/features/messaging/realtime";
import {
  useDeleteMessage,
  useEditMessage,
  useMarkConversationRead,
  useSendMessage,
} from "@/features/messaging/mutations";
import { isConversationMessageable, type ConversationSummary } from "@/features/messaging/types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

export function MessageThread({
  conversation,
  currentUserId,
  viewerRole,
}: {
  conversation: ConversationSummary;
  currentUserId: string;
  viewerRole: "employer" | "job_seeker";
}) {
  const conversationId = conversation.conversationId;
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversationMessages(conversationId);
  useMyParticipant(conversationId, currentUserId);
  useConversationRealtime(conversationId);
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const markRead = useMarkConversationRead();

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef<number | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const messages = data ? [...data.pages].reverse().flatMap((p) => p.messages) : [];
  const messageCount = messages.length;

  // Mark read when the conversation is actually opened/viewed.
  useEffect(() => {
    markRead.mutate({ conversationId, userId: currentUserId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to latest on first load / conversation switch.
  useEffect(() => {
    if (!isPending && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationId, isPending]);

  // When older messages load (fetchNextPage), keep the viewport anchored
  // on what the user was already looking at instead of jumping.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || prevScrollHeight.current === null) return;
    el.scrollTop = el.scrollHeight - prevScrollHeight.current;
    prevScrollHeight.current = null;
  }, [messageCount]);

  const handleLoadOlder = () => {
    if (scrollRef.current) prevScrollHeight.current = scrollRef.current.scrollHeight;
    void fetchNextPage();
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) setShowJumpToLatest(false);
  };

  // If a new message arrives while the user is scrolled up reading older
  // history, don't steal their scroll position — surface a small
  // indicator instead.
  const lastMessageId = messages[messages.length - 1]?.id;
  const lastIsOwn = messages[messages.length - 1]?.senderId === currentUserId;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !lastMessageId) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom || lastIsOwn) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    } else {
      setShowJumpToLatest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId]);

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setShowJumpToLatest(false);
  };

  const name = viewerRole === "employer" ? conversation.candidateName : conversation.companyName;
  const avatar =
    viewerRole === "employer" ? conversation.candidateAvatar : conversation.companyLogo;
  const detailLink =
    viewerRole === "employer"
      ? `/employer/applications/${conversation.applicationId}`
      : `/job-seeker/applications/${conversation.applicationId}`;
  const messageable = isConversationMessageable(conversation.applicationStatus);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Avatar>
          <AvatarImage src={avatar ?? undefined} alt={name} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{conversation.jobTitle}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={detailLink}>
            <ExternalLink className="size-3.5" />
            {viewerRole === "employer" ? "View applicant" : "View application"}
          </Link>
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full space-y-3 overflow-y-auto px-4 py-4"
        >
          {isPending ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Couldn't load messages. Please try again.
            </p>
          ) : (
            <>
              {hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetchingNextPage}
                    onClick={handleLoadOlder}
                  >
                    {isFetchingNextPage ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Load older messages
                  </Button>
                </div>
              )}
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No messages yet — say hello.
                </p>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isOwn={m.senderId === currentUserId}
                    onEdit={async (body) => {
                      try {
                        await editMessage.mutateAsync({ messageId: m.id, conversationId, body });
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Couldn't edit this message.",
                        );
                      }
                    }}
                    onDelete={async () => {
                      try {
                        await deleteMessage.mutateAsync({ messageId: m.id, conversationId });
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Couldn't delete this message.",
                        );
                      }
                    }}
                  />
                ))
              )}
            </>
          )}
        </div>
        {showJumpToLatest && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md"
          >
            <ArrowUp className="size-3.5 rotate-180" /> New message
          </button>
        )}
      </div>

      <MessageComposer
        disabled={!messageable}
        disabledReason={
          conversation.applicationStatus === "rejected"
            ? "Messaging is closed — this application was rejected."
            : "Messaging is closed — this application was withdrawn."
        }
        onSend={async (body) => {
          try {
            await sendMessage.mutateAsync({ conversationId, body });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't send this message.");
          }
        }}
      />
    </div>
  );
}
