import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { formatChatTimestamp } from "@/lib/format";
import { initials } from "@/lib/format";
import type { ConversationSummary } from "@/features/messaging/types";

export function ConversationList({
  conversations,
  isPending,
  isError,
  selectedId,
  onSelect,
  viewerRole,
}: {
  conversations: ConversationSummary[];
  isPending: boolean;
  isError: boolean;
  selectedId: string | undefined;
  onSelect: (conversationId: string) => void;
  viewerRole: "employer" | "job_seeker";
}) {
  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <EmptyState title="Couldn't load conversations" description="Please try again." />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No conversations yet"
          description={
            viewerRole === "employer"
              ? "Message a candidate from their applicant detail page to start a conversation."
              : "Message an employer from your application detail page to start a conversation."
          }
        />
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {conversations.map((c) => {
        const name = viewerRole === "employer" ? c.candidateName : c.companyName;
        const avatar = viewerRole === "employer" ? c.candidateAvatar : c.companyLogo;
        const active = c.conversationId === selectedId;
        const preview = c.lastMessageDeleted
          ? "Message deleted"
          : (c.lastMessagePreview ?? "No messages yet");
        return (
          <li key={c.conversationId}>
            <button
              type="button"
              onClick={() => onSelect(c.conversationId)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary",
                active && "bg-primary-soft",
              )}
            >
              <Avatar>
                <AvatarImage src={avatar ?? undefined} alt={name} />
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  {c.lastMessageAt && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatChatTimestamp(c.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.jobTitle}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{preview}</p>
                  {c.unreadCount > 0 && (
                    <Badge className="shrink-0 rounded-full px-1.5 py-0 text-[10px]">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MessagingEmptyPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <MessageSquare className="size-10" />
      <p className="text-sm">Select a conversation to view messages.</p>
    </div>
  );
}
