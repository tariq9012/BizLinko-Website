import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/hooks/useAuth";

export interface ProfileFormState {
  first_name: string;
  last_name: string;
  headline: string;
  phone: string;
  location: string;
  bio: string;
  current_job_title: string;
  current_company: string;
  years_of_experience: string;
  skills: string;
  website: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  open_to_work: boolean;
}

export function profileToFormState(profile: Profile | null): ProfileFormState {
  return {
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    headline: profile?.headline ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    current_job_title: profile?.current_job_title ?? "",
    current_company: profile?.current_company ?? "",
    years_of_experience: profile?.years_of_experience ? String(profile.years_of_experience) : "",
    skills: (profile?.skills ?? []).join(", "),
    website: profile?.website ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    github_url: profile?.github_url ?? "",
    portfolio_url: profile?.portfolio_url ?? "",
    open_to_work: profile?.open_to_work ?? false,
  };
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  submitting: boolean;
  onSubmit: (values: ProfileFormState) => void;
}) {
  const [form, setForm] = useState<ProfileFormState>(profileToFormState(profile));

  useEffect(() => {
    if (open) setForm(profileToFormState(profile));
  }, [open, profile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Professional headline</Label>
            <Input
              id="headline"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="e.g. Senior Frontend Developer"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current_job_title">Current job title</Label>
              <Input
                id="current_job_title"
                value={form.current_job_title}
                onChange={(e) => setForm({ ...form, current_job_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_company">Current company</Label>
              <Input
                id="current_company"
                value={form.current_company}
                onChange={(e) => setForm({ ...form, current_company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="years_of_experience">Years of experience</Label>
              <Input
                id="years_of_experience"
                inputMode="numeric"
                value={form.years_of_experience}
                onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell employers about your experience and what you're looking for."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma separated)</Label>
            <Input
              id="skills"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, TypeScript, Node.js"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub</Label>
              <Input
                id="github_url"
                value={form.github_url}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                placeholder="https://github.com/…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio_url">Portfolio</Label>
              <Input
                id="portfolio_url"
                value={form.portfolio_url}
                onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Open to work</p>
              <p className="text-xs text-muted-foreground">
                Signal to employers that you're actively looking.
              </p>
            </div>
            <Switch
              checked={form.open_to_work}
              onCheckedChange={(v) => setForm({ ...form, open_to_work: v })}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
