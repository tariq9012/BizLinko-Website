import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { SettingsSection, ToggleRow } from "@/components/dashboard/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { JobCategory } from "./types";
import { jobFormDefaults, jobFormSchema, type JobFormValues } from "./validation";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
const WORKPLACE_TYPES = ["Remote", "Hybrid", "On-site"] as const;
const EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Lead"] as const;
const SALARY_PERIODS = ["year", "month", "hour"] as const;

export function JobForm({
  categories,
  defaultValues,
  submitting,
  onSubmit,
  submitLabels = { draft: "Save as Draft", publish: "Publish Job" },
}: {
  categories: JobCategory[];
  defaultValues?: Partial<JobFormValues>;
  submitting: "draft" | "publish" | false;
  onSubmit: (values: JobFormValues, targetStatus: "draft" | "published") => void;
  submitLabels?: { draft: string; publish: string };
}) {
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: { ...jobFormDefaults, ...defaultValues },
  });

  const submitAs = (status: "draft" | "published") =>
    form.handleSubmit((values) => onSubmit(values, status));

  return (
    <Form {...form}>
      <form className="space-y-6">
        <SettingsSection title="Job basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Job title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Senior React Developer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience level</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Location">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="workplaceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workplace type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORKPLACE_TYPES.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Islamabad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Pakistan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Compensation">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="salaryMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum salary</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="e.g. 80000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum salary</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="e.g. 110000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="USD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Per</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALARY_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="hideSalary"
            render={({ field }) => (
              <ToggleRow
                label="Hide salary from candidates"
                description="Salary range still helps ranking and search, but won't be shown publicly."
              >
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </ToggleRow>
            )}
          />
        </SettingsSection>

        <SettingsSection title="Job description">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="What is this role and team about?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsibilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsibilities (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={"Lead front-end architecture\nMentor engineers"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements (one per line)</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder={"5+ years of React experience"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualifications (one per line, optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={"Bachelor's degree or equivalent experience"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits (one per line, optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={"Private healthcare\nLearning budget"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Other">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills (comma separated, optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="React, TypeScript, GraphQL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="applicationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application deadline (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!!submitting}
            onClick={submitAs("draft")}
          >
            {submitting === "draft" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {submitLabels.draft}
          </Button>
          <Button type="button" disabled={!!submitting} onClick={submitAs("published")}>
            {submitting === "publish" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {submitLabels.publish}
          </Button>
        </div>
      </form>
    </Form>
  );
}
