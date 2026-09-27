import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEmployerCompany } from "@/features/jobs/useEmployerCompany";
import { useJobCategories } from "@/features/jobs/queries";
import { useCreateJob, jobInsertFromForm } from "@/features/jobs/mutations";
import { JobForm } from "@/features/jobs/JobForm";
import type { JobFormValues } from "@/features/jobs/validation";

const title = "Post a Job — BizLinko";
const description = "Create a job post and reach the right candidates on BizLinko.";

export const Route = createFileRoute("/_authenticated/employer/post-job")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PostJobPage,
});

function PostJobPage() {
  const { currentUser } = useAuth();
  const { data: company, isPending: companyPending } = useEmployerCompany();
  const { data: categories = [], isPending: categoriesPending } = useJobCategories();
  const createJob = useCreateJob();
  const navigate = Route.useNavigate();
  const [submitting, setSubmitting] = useState<"draft" | "publish" | false>(false);

  const handleSubmit = async (values: JobFormValues, status: "draft" | "published") => {
    if (!currentUser || !company) return;
    setSubmitting(status === "draft" ? "draft" : "publish");
    try {
      await createJob.mutateAsync(jobInsertFromForm(values, company.id, currentUser.id, status));
      toast.success(status === "published" ? "Job published." : "Job saved as draft.");
      void navigate({ to: "/employer/jobs" });
    } catch {
      toast.error("We couldn't save this job. Please check the form and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Post a Job"
        description="Publish a role and start receiving applications."
      />

      {companyPending || categoriesPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !company ? (
        <EmptyState
          title="Set up your company profile first"
          description="Candidates need to know who they're applying to before you can post a job."
          action={
            <Button asChild>
              <Link to="/employer/company">Create company profile</Link>
            </Button>
          }
        />
      ) : (
        <JobForm categories={categories} submitting={submitting} onSubmit={handleSubmit} />
      )}
    </>
  );
}
