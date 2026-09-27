import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildResumeStoragePath, mapResumeRow } from "./types";
import { deleteResumeFile, uploadResumeFile } from "./storage";

/**
 * Upload sequencing (see Phase 4 report for the full rationale): the
 * storage file is written FIRST, and the database row only afterwards. If
 * the DB insert then fails, we delete the just-uploaded file so it doesn't
 * become an orphan with no metadata pointing at it. If the file upload
 * itself fails, we never touch the database at all — so a failed upload
 * never leaves a DB row with nothing behind it.
 */
export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      userId,
      name,
      makePrimary,
    }: {
      file: File;
      userId: string;
      name: string;
      makePrimary: boolean;
    }) => {
      const resumeId = crypto.randomUUID();
      const path = buildResumeStoragePath(userId, resumeId, file.name);

      await uploadResumeFile(path, file);

      const { data, error } = await supabase
        .from("resumes")
        .insert({
          id: resumeId,
          user_id: userId,
          name,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          is_primary: makePrimary,
        })
        .select("*")
        .single();

      if (error) {
        // DB insert failed after a successful upload — clean up the orphan
        // file rather than leaving it stranded in storage.
        await deleteResumeFile(path).catch(() => {
          /* best-effort cleanup; the row was never created either way */
        });
        throw error;
      }

      return mapResumeRow(data);
    },
    onSuccess: (resume) => {
      void queryClient.invalidateQueries({ queryKey: ["resumes", resume.userId] });
    },
  });
}

export function useSetPrimaryResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase.from("resumes").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
      return { userId };
    },
    onSuccess: ({ userId }) => {
      void queryClient.invalidateQueries({ queryKey: ["resumes", userId] });
    },
  });
}

/**
 * Deletes the DB row first, then the storage file — the opposite order
 * from upload. A resume referenced by an application has
 * ON DELETE RESTRICT on that foreign key, so the DB delete fails cleanly
 * with a Postgres 23503 (foreign_key_violation) before any file is
 * touched — never destroying a file an application still points to. Only
 * once the DB row is actually gone do we remove the file; if that second
 * step fails, the result is a harmless orphaned blob in storage rather
 * than a broken download link on a still-visible resume row.
 */
export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      userId,
      filePath,
    }: {
      id: string;
      userId: string;
      filePath: string;
    }) => {
      const { error } = await supabase.from("resumes").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          throw new Error("This resume is used in an application and can't be deleted.");
        }
        throw error;
      }
      await deleteResumeFile(filePath).catch(() => {
        /* DB row is already gone; a leftover file is harmless and can be
         * cleaned up later — don't surface this as a user-facing failure. */
      });
      return { userId };
    },
    onSuccess: ({ userId }) => {
      void queryClient.invalidateQueries({ queryKey: ["resumes", userId] });
    },
  });
}
