import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — matches bucket file_size_limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please upload a JPEG, PNG, or WebP image.";
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return "Image is too large. Maximum size is 5 MB.";
  }
  return null;
}

/**
 * Uploads a new avatar and returns its public URL. The bucket is public by
 * design (profile photos are meant to be visible on a professional
 * profile), so no signed URL is needed here — unlike resumes, which stay
 * private. `upsert: true` at a fixed filename means replacing an avatar
 * overwrites the old file in place rather than accumulating orphans.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust so the new image shows immediately even though the path
  // (and therefore the URL) didn't change.
  return `${data.publicUrl}?v=${Date.now()}`;
}
