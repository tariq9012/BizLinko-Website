import { useState } from "react";
import { Check, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatChatTimestamp } from "@/lib/format";
import { MESSAGE_MAX_LENGTH, type Message } from "@/features/messaging/types";

export function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  onEdit: (body: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [saving, setSaving] = useState(false);
  const isDeleted = !!message.deletedAt;

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      <div className={cn("group flex items-end gap-1.5", isOwn && "flex-row-reverse")}>
        <div
          className={cn(
            "max-w-[min(28rem,80vw)] rounded-2xl px-3.5 py-2 text-sm",
            isDeleted
              ? "border border-dashed border-border text-muted-foreground italic"
              : isOwn
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground",
          )}
        >
          {isDeleted ? (
            "Message deleted"
          ) : editing ? (
            <div className="flex min-w-56 flex-col gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MESSAGE_MAX_LENGTH}
                rows={2}
                className="min-h-0 resize-none bg-background text-foreground"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setEditing(false)}
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  className="size-7"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  <Check className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>

        {isOwn && !isDeleted && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onDelete()} className="text-destructive">
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <span className="px-1 text-[11px] text-muted-foreground">
        {formatChatTimestamp(message.createdAt)}
        {message.editedAt && !isDeleted ? " · edited" : ""}
      </span>
    </div>
  );
}
