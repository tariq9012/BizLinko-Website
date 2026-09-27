import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { LogoPlaceholder } from "@/components/common/LogoPlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import {
  useCreateCompany,
  useUpdateCompany,
  generateUniqueCompanySlug,
} from "@/features/companies/mutations";
import { uploadCompanyAsset, validateCompanyAssetFile } from "@/features/companies/storage";

const title = "Company Profile — BizLinko";
const description = "Tell candidates who you are, what you do and where you're based.";

export const Route = createFileRoute("/_authenticated/employer/company")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CompanyProfilePage,
});

const empty = {
  name: "",
  industry: "",
  location: "",
  website: "",
  employee_count: "",
  description: "",
  founded_year: "",
  linkedin_url: "",
};

function CompanyProfilePage() {
  const { currentUser } = useAuth();
  const { data: company, isPending } = useEmployerCompany();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "cover" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name ?? "",
      industry: company.industry ?? "",
      location: company.location ?? "",
      website: company.website ?? "",
      employee_count: company.employee_count ?? "",
      description: company.description ?? "",
      founded_year: company.founded_year ? String(company.founded_year) : "",
      linkedin_url: company.linkedin_url ?? "",
    });
    setLogoUrl(company.logo);
    setCoverUrl(company.cover_image_url);
  }, [company]);

  const handleAssetUpload = async (kind: "logo" | "cover", file: File) => {
    if (!company) {
      toast.error("Please save your company details first, then upload an image.");
      return;
    }
    const validationError = validateCompanyAssetFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setUploadingAsset(kind);
    try {
      const url = await uploadCompanyAsset(company.id, kind, file);
      const patch = kind === "logo" ? { logo: url } : { cover_image_url: url };
      await updateCompany.mutateAsync({
        id: company.id,
        ownerId: company.owner_id as string,
        patch,
      });
      if (kind === "logo") setLogoUrl(url);
      else setCoverUrl(url);
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} updated.`);
    } catch {
      toast.error("Couldn't upload that image. Please try again.");
    } finally {
      setUploadingAsset(null);
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.name.trim()) {
      toast.error("Please enter your company name.");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        name: form.name,
        industry: form.industry || null,
        location: form.location || null,
        website: form.website || null,
        employee_count: form.employee_count || null,
        description: form.description || null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        linkedin_url: form.linkedin_url || null,
      };

      if (company) {
        await updateCompany.mutateAsync({ id: company.id, ownerId: currentUser.id, patch });
      } else {
        const slug = await generateUniqueCompanySlug(form.name);
        const created = await createCompany.mutateAsync({
          ...patch,
          slug,
          owner_id: currentUser.id,
        });
        await supabase
          .from("employer_profiles")
          .update({ company_id: created.id })
          .eq("user_id", currentUser.id);
      }
      toast.success("Company profile saved.");
    } catch {
      toast.error("We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Company Profile"
        description="This is what candidates see on your company page."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <SettingsSection title="Branding">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="size-16 rounded-xl border border-border object-cover"
                />
              ) : (
                <LogoPlaceholder name={form.name || "?"} size="lg" />
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleAssetUpload("logo", file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAsset === "logo"}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingAsset === "logo" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Upload logo
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleAssetUpload("cover", file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAsset === "cover"}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {uploadingAsset === "cover" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Upload cover image
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Company details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_count">Company size</Label>
              <Input
                id="employee_count"
                value={form.employee_count}
                onChange={(e) => setForm({ ...form, employee_count: e.target.value })}
                placeholder="e.g. 11-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="founded_year">Founded year</Label>
              <Input
                id="founded_year"
                inputMode="numeric"
                value={form.founded_year}
                onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                placeholder="e.g. 2015"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/company/..."
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="About the company">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What your company does, your mission and what it's like to work there."
            />
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save company profile"}
          </Button>
        </div>
      </form>
    </>
  );
}
