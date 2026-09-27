import { useState } from "react";
import { Bookmark, Mail, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useRenameSavedSearch,
  useSavedSearches,
  useUpdateSavedSearchAlert,
  type SavedSearch,
} from "@/features/search/queries";
import type { JobFilters } from "@/types";

export function SaveSearchButton({
  userId,
  keyword,
  filters,
}: {
  userId: string | undefined;
  keyword: string;
  filters: JobFilters;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createSearch = useCreateSavedSearch();

  if (!userId) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await createSearch.mutateAsync({ name: name.trim(), query: keyword, filters });
      toast.success("Search saved");
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this search.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="size-3.5" /> Save search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="saved-search-name">Name</Label>
          <Input
            id="saved-search-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Remote React roles"
            maxLength={80}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || createSearch.isPending}
            onClick={() => void handleSave()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SavedSearchesMenu({
  userId,
  onRun,
}: {
  userId: string | undefined;
  onRun: (search: SavedSearch) => void;
}) {
  const { data: saved = [] } = useSavedSearches(userId);
  const renameSearch = useRenameSavedSearch();
  const deleteSearch = useDeleteSavedSearch();
  const updateAlert = useUpdateSavedSearchAlert();

  if (!userId || saved.length === 0) return null;

  const handleRename = async (id: string, currentName: string) => {
    const next = window.prompt("Rename saved search", currentName);
    if (!next || !next.trim() || next.trim() === currentName) return;
    try {
      await renameSearch.mutateAsync({ id, name: next.trim() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't rename this search.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSearch.mutateAsync(id);
      toast.success("Saved search removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove this search.");
    }
  };

  const handleToggleAlert = async (id: string, enabled: boolean) => {
    try {
      await updateAlert.mutateAsync({ id, emailAlertEnabled: enabled });
      toast.success(enabled ? "Email alerts on for this search" : "Email alerts off");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update email alerts.");
    }
  };

  const handleFrequencyChange = async (id: string, frequency: "daily" | "weekly") => {
    try {
      await updateAlert.mutateAsync({ id, alertFrequency: frequency });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update alert frequency.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="size-3.5" /> Saved ({saved.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] max-w-72">
        {saved.map((s) => (
          <div key={s.id} className="space-y-1 border-b px-2 py-1.5 last:border-b-0">
            <div className="flex items-center gap-1">
              <DropdownMenuItem className="flex-1 cursor-pointer truncate" onClick={() => onRun(s)}>
                {s.name}
              </DropdownMenuItem>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRename(s.id, s.name);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(s.id);
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <div
              className="flex items-center justify-between gap-2 px-2 text-xs text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1">
                <Mail className="size-3" /> Email alerts
              </span>
              <div className="flex items-center gap-2">
                {s.emailAlertEnabled && (
                  <select
                    aria-label={`Alert frequency for ${s.name}`}
                    className="rounded border bg-transparent px-1 py-0.5 text-xs"
                    value={s.alertFrequency}
                    onChange={(e) =>
                      void handleFrequencyChange(s.id, e.target.value as "daily" | "weekly")
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                )}
                <Switch
                  checked={s.emailAlertEnabled}
                  onCheckedChange={(checked) => void handleToggleAlert(s.id, checked)}
                  aria-label={`Toggle email alerts for ${s.name}`}
                  className="scale-90"
                />
              </div>
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
