import { supabase } from "@/integrations/supabase/client";

const BUCKET = "resumes";

export async function uploadResumeFile(path: string, file: File): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
}

export async function deleteResumeFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** Never expose a permanent public URL for a resume — every download goes
 * through a short-lived signed URL, generated on demand for an authorized
 * viewer (RLS on storage.objects decides who's authorized). */
export async function getResumeSignedUrl(path: string, expiresInSeconds = 120): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
