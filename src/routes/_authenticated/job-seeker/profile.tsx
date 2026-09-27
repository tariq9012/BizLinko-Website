import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Loader2,
  MapPin,
  Pencil,
  PlusCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
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
import { displayName, profileCompletion } from "@/lib/auth-utils";
import { initials } from "@/lib/format";
import { useResumes } from "@/features/resumes/queries";
import { useEducations, useExperiences } from "@/features/profile/queries";
import {
  useAddEducation,
  useAddExperience,
  useDeleteEducation,
  useDeleteExperience,
  useUpdateEducation,
  useUpdateExperience,
  useUpdateProfile,
} from "@/features/profile/mutations";
import { uploadAvatar, validateAvatarFile } from "@/features/profile/storage";
import { EditProfileDialog, type ProfileFormState } from "@/features/profile/EditProfileDialog";
import { ExperienceDialog } from "@/features/profile/ExperienceDialog";
import { EducationDialog } from "@/features/profile/EducationDialog";
import type { ExperienceFormValues, EducationFormValues } from "@/features/profile/schemas";
import type { Experience, Education } from "@/features/profile/types";

const title = "My Profile — BizLinko";
const description = "Keep your BizLinko profile up to date so employers can find you.";

export const Route = createFileRoute("/_authenticated/job-seeker/profile")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProfilePage,
});

function formatDateRange(start: string | null, end: string | null, isCurrent?: boolean) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const startText = start ? fmt(start) : "";
  const endText = isCurrent ? "Present" : end ? fmt(end) : "";
  return [startText, endText].filter(Boolean).join(" – ");
}

function ProfilePage() {
  const { profile, currentUser, refresh } = useAuth();
  const { data: resumes = [] } = useResumes();
  const { data: experiences = [] } = useExperiences(currentUser?.id);
  const { data: educations = [] } = useEducations(currentUser?.id);

  const updateProfile = useUpdateProfile();
  const addExperience = useAddExperience();
  const updateExperience = useUpdateExperience();
  const deleteExperience = useDeleteExperience();
  const addEducation = useAddEducation();
  const updateEducation = useUpdateEducation();
  const deleteEducation = useDeleteEducation();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [experienceDialog, setExperienceDialog] = useState<{ open: boolean; editing?: Experience }>(
    {
      open: false,
    },
  );
  const [educationDialog, setEducationDialog] = useState<{ open: boolean; editing?: Education }>({
    open: false,
  });
  const [deleteExperienceId, setDeleteExperienceId] = useState<string | null>(null);
  const [deleteEducationId, setDeleteEducationId] = useState<string | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);

  const name = displayName(profile ?? { email: currentUser?.email ?? null });
  const primaryResume = resumes.find((r) => r.isPrimary) ?? resumes[0];
  const completion = profileCompletion(profile, {
    hasResume: resumes.length > 0,
    hasExperience: experiences.length > 0,
    hasEducation: educations.length > 0,
  });

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUser) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(currentUser.id, file);
      await updateProfile.mutateAsync({ userId: currentUser.id, patch: { profile_image: url } });
      await refresh();
      toast.success("Profile photo updated.");
    } catch {
      toast.error("Couldn't upload that image. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSubmit = async (values: ProfileFormState) => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      await updateProfile.mutateAsync({
        userId: currentUser.id,
        patch: {
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          headline: values.headline || null,
          phone: values.phone || null,
          location: values.location || null,
          bio: values.bio || null,
          current_job_title: values.current_job_title || null,
          current_company: values.current_company || null,
          years_of_experience: values.years_of_experience
            ? Number(values.years_of_experience)
            : null,
          skills: values.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          website: values.website || null,
          linkedin_url: values.linkedin_url || null,
          github_url: values.github_url || null,
          portfolio_url: values.portfolio_url || null,
          open_to_work: values.open_to_work,
        },
      });
      await refresh();
      toast.success("Profile updated.");
      setEditProfileOpen(false);
    } catch {
      toast.error("We couldn't save your changes. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleOpenToWork = async (checked: boolean) => {
    if (!currentUser) return;
    try {
      await updateProfile.mutateAsync({ userId: currentUser.id, patch: { open_to_work: checked } });
      await refresh();
    } catch {
      toast.error("Couldn't update that. Please try again.");
    }
  };

  const submitExperience = async (values: ExperienceFormValues) => {
    if (!currentUser) return;
    setSavingEntry(true);
    try {
      if (experienceDialog.editing) {
        await updateExperience.mutateAsync({
          id: experienceDialog.editing.id,
          values,
          userId: currentUser.id,
        });
      } else {
        await addExperience.mutateAsync({ values, userId: currentUser.id });
      }
      toast.success("Experience saved.");
      setExperienceDialog({ open: false });
    } catch {
      toast.error("Couldn't save this experience. Please try again.");
    } finally {
      setSavingEntry(false);
    }
  };

  const submitEducation = async (values: EducationFormValues) => {
    if (!currentUser) return;
    setSavingEntry(true);
    try {
      if (educationDialog.editing) {
        await updateEducation.mutateAsync({
          id: educationDialog.editing.id,
          values,
          userId: currentUser.id,
        });
      } else {
        await addEducation.mutateAsync({ values, userId: currentUser.id });
      }
      toast.success("Education saved.");
      setEducationDialog({ open: false });
    } catch {
      toast.error("Couldn't save this entry. Please try again.");
    } finally {
      setSavingEntry(false);
    }
  };

  const confirmDeleteExperience = async () => {
    if (!deleteExperienceId || !currentUser) return;
    try {
      await deleteExperience.mutateAsync({ id: deleteExperienceId, userId: currentUser.id });
      toast.success("Experience removed.");
    } catch {
      toast.error("Couldn't remove this entry.");
    } finally {
      setDeleteExperienceId(null);
    }
  };

  const confirmDeleteEducation = async () => {
    if (!deleteEducationId || !currentUser) return;
    try {
      await deleteEducation.mutateAsync({ id: deleteEducationId, userId: currentUser.id });
      toast.success("Education removed.");
    } catch {
      toast.error("Couldn't remove this entry.");
    } finally {
      setDeleteEducationId(null);
    }
  };

  const links = [
    profile?.website && { icon: Globe, href: profile.website, label: "Website" },
    profile?.linkedin_url && { icon: Linkedin, href: profile.linkedin_url, label: "LinkedIn" },
    profile?.github_url && { icon: Github, href: profile.github_url, label: "GitHub" },
    profile?.portfolio_url && { icon: Globe, href: profile.portfolio_url, label: "Portfolio" },
  ].filter((l): l is { icon: typeof Globe; href: string; label: string } => !!l);

  return (
    <>
      <DashboardHeader
        title="My Profile"
        description="Employers see this information when you apply."
        action={
          <Button onClick={() => setEditProfileOpen(true)}>
            <Pencil className="size-4" /> Edit Profile
          </Button>
        }
      />

      <SettingsSection>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <Avatar className="size-20">
              {profile?.profile_image ? (
                <AvatarImage src={profile.profile_image} alt={name} />
              ) : null}
              <AvatarFallback className="bg-primary-soft text-xl font-semibold text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              aria-label="Change profile photo"
            >
              {avatarUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
            </button>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{name}</h2>
              {profile?.open_to_work && <Badge>Open to work</Badge>}
            </div>
            {profile?.headline && <p className="mt-1 text-muted-foreground">{profile.headline}</p>}
            {profile?.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" /> {profile.location}
              </p>
            )}
            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <l.icon className="size-3.5" /> {l.label}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch checked={profile?.open_to_work ?? false} onCheckedChange={toggleOpenToWork} />
              <span className="text-sm text-foreground">Open to work</span>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Profile completion</span>
            <span className="font-semibold text-primary">{completion}%</span>
          </div>
          <Progress value={completion} className="mt-2" />
        </div>
      </SettingsSection>

      {profile?.bio && (
        <SettingsSection title="About">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        </SettingsSection>
      )}

      {profile?.skills && profile.skills.length > 0 && (
        <SettingsSection title="Skills">
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </SettingsSection>
      )}

      <SettingsSection
        title="Experience"
        action={
          <Button variant="outline" size="sm" onClick={() => setExperienceDialog({ open: true })}>
            <PlusCircle className="size-3.5" /> Add Experience
          </Button>
        }
      >
        {experiences.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="size-4" /> Add your first work experience.
          </p>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="flex items-start justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-foreground">{exp.jobTitle}</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {exp.companyName}
                    {exp.location ? ` · ${exp.location}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                  </p>
                  {exp.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {exp.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExperienceDialog({ open: true, editing: exp })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteExperienceId(exp.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Education"
        action={
          <Button variant="outline" size="sm" onClick={() => setEducationDialog({ open: true })}>
            <PlusCircle className="size-3.5" /> Add Education
          </Button>
        }
      >
        {educations.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="size-4" /> Add your education background.
          </p>
        ) : (
          <div className="space-y-4">
            {educations.map((edu) => (
              <div
                key={edu.id}
                className="flex items-start justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-foreground">{edu.institution}</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEducationDialog({ open: true, editing: edu })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteEducationId(edu.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Resume"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/job-seeker/resumes">Manage resumes</Link>
          </Button>
        }
      >
        {primaryResume ? (
          <p className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="size-4 text-primary" /> {primaryResume.name}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
        )}
      </SettingsSection>

      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        profile={profile}
        submitting={savingProfile}
        onSubmit={handleProfileSubmit}
      />

      <ExperienceDialog
        open={experienceDialog.open}
        onOpenChange={(open) => setExperienceDialog((s) => ({ ...s, open }))}
        submitting={savingEntry}
        onSubmit={submitExperience}
        {...(experienceDialog.editing
          ? {
              defaultValues: {
                jobTitle: experienceDialog.editing.jobTitle,
                companyName: experienceDialog.editing.companyName,
                location: experienceDialog.editing.location ?? "",
                employmentType: experienceDialog.editing.employmentType ?? "Full-time",
                startDate: experienceDialog.editing.startDate,
                endDate: experienceDialog.editing.endDate ?? "",
                isCurrent: experienceDialog.editing.isCurrent,
                description: experienceDialog.editing.description ?? "",
              },
            }
          : {})}
      />

      <EducationDialog
        open={educationDialog.open}
        onOpenChange={(open) => setEducationDialog((s) => ({ ...s, open }))}
        submitting={savingEntry}
        onSubmit={submitEducation}
        {...(educationDialog.editing
          ? {
              defaultValues: {
                institution: educationDialog.editing.institution,
                degree: educationDialog.editing.degree ?? "",
                fieldOfStudy: educationDialog.editing.fieldOfStudy ?? "",
                startDate: educationDialog.editing.startDate ?? "",
                endDate: educationDialog.editing.endDate ?? "",
                grade: educationDialog.editing.grade ?? "",
                description: educationDialog.editing.description ?? "",
              },
            }
          : {})}
      />

      <AlertDialog
        open={!!deleteExperienceId}
        onOpenChange={(open) => !open && setDeleteExperienceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this experience?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteExperience}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteEducationId}
        onOpenChange={(open) => !open && setDeleteEducationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this education entry?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEducation}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
