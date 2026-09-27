import type { Tables } from "@/integrations/supabase/types";

export type ResumeRow = Tables<"resumes">;

export interface Resume {
  id: string;
  userId: string;
  name: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapResumeRow(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const RESUME_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — matches the DB check + storage bucket limit

export const RESUME_ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

/**
 * Client-side validation only — the real enforcement is the `resumes`
 * table's CHECK constraints and the storage bucket's file_size_limit /
 * allowed_mime_types. This just gives the user a fast, friendly error
 * before anything is uploaded.
 */
export function validateResumeFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mimeOk = Object.hasOwn(RESUME_ALLOWED_TYPES, file.type);
  const extensionOk = Object.values(RESUME_ALLOWED_TYPES).includes(extension);
  // Neither the MIME type nor the extension alone is trusted — a renamed
  // file (e.g. malware.exe → resume.pdf) only passes extension checks, and
  // some browsers/OSes report inconsistent or empty MIME types for the
  // same real file, so a mismatch isn't itself proof of tampering.
  if (!mimeOk && !extensionOk) {
    return "Please upload a PDF, DOC, or DOCX file.";
  }
  if (file.size > RESUME_MAX_SIZE_BYTES) {
    return "File is too large. Maximum size is 10 MB.";
  }
  if (file.size === 0) {
    return "This file appears to be empty.";
  }
  return null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

/** Storage path convention: {user_id}/{resume_id}/{filename} — matched
 * exactly by the storage.objects RLS policies. */
export function buildResumeStoragePath(userId: string, resumeId: string, fileName: string): string {
  return `${userId}/${resumeId}/${sanitizeFileName(fileName)}`;
}
