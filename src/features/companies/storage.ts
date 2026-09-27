import { supabase } from "@/integrations/supabase/client";

const BUCKET = "company-assets";
export const COMPANY_ASSET_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateCompanyAssetFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please upload a JPEG, PNG, or WebP image.";
  }
  if (file.size > COMPANY_ASSET_MAX_SIZE_BYTES) {
    return "Image is too large. Maximum size is 5 MB.";
  }
  return null;
}

/** Uploads a company logo or cover image and returns its public URL.
 * `upsert: true` at a fixed filename ({company_id}/logo.ext or
 * .../cover.ext) replaces the previous asset in place. */
export async function uploadCompanyAsset(
  companyId: string,
  kind: "logo" | "cover",
  file: File,
): Promise<string> {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${companyId}/${kind}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
