import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReport } from "@/features/reports/mutations";
import {
  REPORT_REASON_LABEL,
  type ReportEntityType,
  type ReportReason,
} from "@/features/admin/types";

export function ReportDialog({
  entityType,
  entityId,
  targetLabel,
  reasons,
  trigger,
}: {
  entityType: ReportEntityType;
  entityId: string;
  targetLabel: string;
  reasons: ReportReason[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const createReport = useCreateReport();

  const handleSubmit = async () => {
    if (!reason) return;
    try {
      await createReport.mutateAsync({
        entityType,
        entityId,
        reason,
        description: description.trim(),
      });
      toast.success("Report submitted — our team will review it.");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit the report.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="size-3.5" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetLabel}</DialogTitle>
          <DialogDescription>
            Let us know what's wrong. Reports are reviewed by our team before any action is taken.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
            {reasons.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`report-reason-${r}`} />
                <Label htmlFor={`report-reason-${r}`} className="font-normal">
                  {REPORT_REASON_LABEL[r]}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-description">Additional details (optional)</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Anything that helps our team review this"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!reason || createReport.isPending} onClick={() => void handleSubmit()}>
            {createReport.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
