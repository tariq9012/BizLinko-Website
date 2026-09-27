import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useJob } from "@/features/jobs/queries";
import { useHasApplied } from "@/features/applications/queries";
import { useSubmitApplication } from "@/features/applications/mutations";
import { applicationFormSchema, type ApplicationFormValues } from "@/features/applications/schemas";
import { useResumes } from "@/features/resumes/queries";
import { useUploadResume } from "@/features/resumes/mutations";
import { validateResumeFile } from "@/features/resumes/types";
import { formatSalary } from "@/lib/format";

export const Route = createFileRoute("/jobs/$jobId_/apply")({
  head: () => ({ meta: [{ title: "Apply — BizLinko" }] }),
  component: ApplyPage,
});

function ApplyPage() {
  const { jobId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { currentUser, role, isAuthenticated, loading: authLoading } = useAuth();
  const { data: job, isPending: jobPending } = useJob(jobId);
  const { data: resumes = [], isPending: resumesPending } = useResumes();
  const { data: existingApplication } = useHasApplied(jobId);
  const submitApplication = useSubmitApplication();
  const uploadResume = useUploadResume();
  const [uploading, setUploading] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: { resumeId: "", coverLetter: "" },
  });

  // Don't make the user manually click a radio button when they only have
  // one resume (or clearly have a primary) — pre-select it, they can still
  // change it before submitting.
  useEffect(() => {
    if (resumes.length === 0) return;
    const current = form.getValues("resumeId");
    if (current && resumes.some((r) => r.id === current)) return;
    const preferred = resumes.find((r) => r.isPrimary) ?? resumes[0];
    if (preferred) form.setValue("resumeId", preferred.id);
  }, [resumes, form]);

  const handleNewResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUser) return;
    const validationError = validateResumeFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setUploading(true);
    try {
      const resume = await uploadResume.mutateAsync({
        file,
        userId: currentUser.id,
        name: file.name.replace(/\.[^.]+$/, ""),
        makePrimary: resumes.length === 0,
      });
      form.setValue("resumeId", resume.id, { shouldValidate: true });
      toast.success("Resume uploaded.");
    } catch {
      toast.error("We couldn't upload that file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: ApplicationFormValues) => {
    if (!currentUser || !job) return;
    try {
      const result = await submitApplication.mutateAsync({
        jobId: job.id,
        applicantId: currentUser.id,
        resumeId: values.resumeId,
        coverLetter: values.coverLetter ?? "",
      });
      toast.success("Application submitted!");
      void navigate({
        to: "/job-seeker/applications/$applicationId",
        params: { applicationId: result.id },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your application.");
    }
  };

  const pending = authLoading || jobPending || resumesPending;

  if (pending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Please sign in to apply"
          description="You need a job seeker account to apply to this job."
          action={
            <Button asChild>
              <Link to="/login" search={{ redirect: `/jobs/${jobId}/apply` }}>
                Sign in
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (role !== "job_seeker") {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Only job seekers can apply"
          description="This account isn't set up as a job seeker."
        />
      </div>
    );
  }

  if (!job || job.status !== "published") {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="This job isn't accepting applications"
          description="It may have been closed, or the link is incorrect."
          action={
            <Button variant="outline" asChild>
              <Link to="/jobs">Browse all jobs</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="You've already applied"
          description="You can check your application's status from your dashboard."
          action={
            <Button asChild>
              <Link
                to="/job-seeker/applications/$applicationId"
                params={{ applicationId: existingApplication.id }}
              >
                View Application
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-10 md:py-14">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Apply for {job.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {job.companyName} · {job.location} · {job.type}
        {!job.hideSalary && <> · {formatSalary(job)}</>}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <FormField
            control={form.control}
            name="resumeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resume</FormLabel>
                <FormControl>
                  {resumes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      You don't have a resume yet — upload one below to continue.
                    </p>
                  ) : (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-2"
                    >
                      {resumes.map((resume) => (
                        <Label
                          key={resume.id}
                          htmlFor={resume.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary"
                        >
                          <RadioGroupItem value={resume.id} id={resume.id} />
                          <span className="text-sm">
                            {resume.name}
                            {resume.isPrimary && (
                              <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                            )}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <input
              id="new-resume-upload"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleNewResume}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById("new-resume-upload")?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload a new resume
            </Button>
          </div>

          <FormField
            control={form.control}
            name="coverLetter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cover letter (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={6} placeholder="Tell them why you're a great fit..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" disabled={submitApplication.isPending} className="w-full">
            {submitApplication.isPending && <Loader2 className="size-4 animate-spin" />}
            Submit Application
          </Button>
        </form>
      </Form>
    </div>
  );
}
