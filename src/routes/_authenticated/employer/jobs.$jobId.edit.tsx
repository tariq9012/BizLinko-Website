import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import { useJob, useJobCategories } from "@/features/jobs/queries";
import { useUpdateJob, jobUpdateFromForm } from "@/features/jobs/mutations";
import { JobForm } from "@/features/jobs/JobForm";
import type { JobFormValues } from "@/features/jobs/validation";

const title = "Edit Job — BizLinko";

export const Route = createFileRoute("/_authenticated/employer/jobs/$jobId/edit")({
  head: () => ({ meta: [{ title }] }),
  component: EditJobPage,
});

function EditJobPage() {
  const { jobId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: company, isPending: companyPending } = useEmployerCompany();
  const { data: job, isPending: jobPending, isError } = useJob(jobId);
  const { data: categories = [], isPending: categoriesPending } = useJobCategories();
  const updateJob = useUpdateJob();
  const [submitting, setSubmitting] = useState<"draft" | "publish" | false>(false);

  // Ownership is ultimately enforced by RLS on the UPDATE itself, but we
  // check it here too so an employer can never even *see* another
  // company's job pre-filled in the edit form by guessing a URL.
  const isOwnJob = !!job && !!company && job.companyId === company.id;

  const defaultValues = useMemo<Partial<JobFormValues> | undefined>(() => {
    if (!job) return undefined;
    const categoryId = categories.find((c) => c.slug === job.category)?.id ?? "";
    return {
      title: job.title,
      categoryId,
      employmentType: job.type,
      workplaceType: job.workMode,
      experienceLevel: job.experience,
      city: job.location.split(",")[0]?.trim() ?? "",
      country: job.location.split(",").slice(1).join(",").trim(),
      salaryMin: job.salaryMin ? String(job.salaryMin) : "",
      salaryMax: job.salaryMax ? String(job.salaryMax) : "",
      salaryCurrency: job.currency,
      salaryPeriod: job.salaryPeriod ?? "year",
      hideSalary: job.hideSalary ?? false,
      description: job.summary,
      responsibilities: job.responsibilities.join("\n"),
      requirements: job.requirements.join("\n"),
      qualifications: (job.qualifications ?? []).join("\n"),
      benefits: job.benefits.join("\n"),
      skills: job.skills.join(", "),
      applicationDeadline: job.applicationDeadline ?? "",
    };
  }, [job, categories]);

  const handleSubmit = async (values: JobFormValues, status: "draft" | "published") => {
    if (!job || !company) return;
    setSubmitting(status === "draft" ? "draft" : "publish");
    try {
      await updateJob.mutateAsync({
        id: job.id,
        companyId: company.id,
        patch: jobUpdateFromForm(values, status === job.status ? undefined : status),
      });
      toast.success("Job updated.");
      void navigate({ to: "/employer/jobs" });
    } catch {
      toast.error("We couldn't save your changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pending = companyPending || jobPending || categoriesPending;

  return (
    <>
      <DashboardHeader title="Edit Job" description="Update the details of this job post." />

      {pending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !job ? (
        <EmptyState
          title="Job not found"
          description="This job may have been deleted."
          action={
            <Button variant="outline" asChild>
              <Link to="/employer/jobs">Back to My Jobs</Link>
            </Button>
          }
        />
      ) : !isOwnJob ? (
        <EmptyState
          title="You don't have access to this job"
          description="You can only edit jobs that belong to your own company."
          action={
            <Button variant="outline" asChild>
              <Link to="/employer/jobs">Back to My Jobs</Link>
            </Button>
          }
        />
      ) : (
        <JobForm
          categories={categories}
          {...(defaultValues ? { defaultValues } : {})}
          submitting={submitting}
          onSubmit={handleSubmit}
          submitLabels={{
            draft: job.status === "draft" ? "Save draft" : "Save & unpublish",
            publish: job.status === "published" ? "Save changes" : "Save & publish",
          }}
        />
      )}
    </>
  );
}
