import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useResumes } from "@/features/resumes/queries";
import {
  useDeleteResume,
  useSetPrimaryResume,
  useUploadResume,
} from "@/features/resumes/mutations";
import { getResumeSignedUrl } from "@/features/resumes/storage";
import { validateResumeFile, type Resume } from "@/features/resumes/types";

const title = "My Resumes — BizLinko";

export const Route = createFileRoute("/_authenticated/job-seeker/resumes")({
  head: () => ({ meta: [{ title }] }),
  component: ResumesPage,
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResumesPage() {
  const { currentUser } = useAuth();
  const { data: resumes = [], isPending } = useResumes();
  const uploadResume = useUploadResume();
  const setPrimary = useSetPrimaryResume();
  const deleteResume = useDeleteResume();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<Resume | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUser) return;

    const validationError = validateResumeFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await uploadResume.mutateAsync({
        file,
        userId: currentUser.id,
        name: file.name.replace(/\.[^.]+$/, ""),
        makePrimary: resumes.length === 0,
      });
      toast.success("Resume uploaded.");
    } catch {
      toast.error("We couldn't upload that file. Please try again.");
    }
  };

  const handleSetPrimary = async (resume: Resume) => {
    if (!currentUser) return;
    try {
      await setPrimary.mutateAsync({ id: resume.id, userId: currentUser.id });
      toast.success(`"${resume.name}" is now your primary resume.`);
    } catch {
      toast.error("Couldn't update your primary resume. Please try again.");
    }
  };

  const handleDownload = async (resume: Resume) => {
    setDownloadingId(resume.id);
    try {
      const url = await getResumeSignedUrl(resume.filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open this resume. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !currentUser) return;
    try {
      await deleteResume.mutateAsync({
        id: pendingDelete.id,
        userId: currentUser.id,
        filePath: pendingDelete.filePath,
      });
      toast.success(`Deleted "${pendingDelete.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this resume.");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <DashboardHeader
        title="My Resumes"
        description="Upload and manage the resumes you apply with. PDF, DOC, or DOCX — up to 10 MB."
        action={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadResume.isPending}>
              {uploadResume.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload resume
            </Button>
          </>
        }
      />

      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : resumes.length === 0 ? (
        <EmptyState
          title="No resumes yet"
          description="Upload a resume so you're ready to apply the moment you find a role you like."
          action={
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Upload resume
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-medium text-foreground">{resume.name}</p>
                    {resume.isPrimary && <Badge>Primary</Badge>}
                  </div>
                  <p className="break-words text-xs text-muted-foreground">
                    {resume.fileName} · {formatBytes(resume.fileSize)} · Uploaded{" "}
                    {new Date(resume.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!resume.isPrimary && (
                  <Button variant="outline" size="sm" onClick={() => handleSetPrimary(resume)}>
                    <Star className="size-3.5" /> Set as primary
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(resume)}
                  disabled={downloadingId === resume.id}
                >
                  {downloadingId === resume.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(resume)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If this resume was used in an application, deletion will be
              blocked to keep that application's record intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
