import { useState, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_MAX_LENGTH } from "@/features/messaging/types";

export function MessageComposer({
  disabled,
  disabledReason,
  onSend,
}: {
  disabled: boolean;
  disabledReason?: string;
  onSend: (body: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (disabled) {
    return (
      <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
        {disabledReason ?? "Messaging is closed for this application."}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a message…"
        maxLength={MESSAGE_MAX_LENGTH}
        rows={1}
        className="max-h-40 min-h-[2.5rem] flex-1 resize-none"
      />
      <Button size="icon" disabled={!value.trim() || sending} onClick={() => void handleSend()}>
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      </Button>
    </div>
  );
}
