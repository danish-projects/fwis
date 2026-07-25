"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AcademicYearInput } from "@/lib/validations/academic-year";

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/academic-years").getAcademicYearFormOptions>
>;

export type AcademicYearFormValues = AcademicYearInput;

type AcademicYearFormProps = {
  options: FormOptions;
  defaultValues?: Partial<AcademicYearFormValues> & { linkedSchoolIds?: string[] };
  onSubmit: (data: AcademicYearFormValues) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
  mode?: "create" | "edit";
};

export function AcademicYearForm({
  options,
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
  mode = "create",
}: AcademicYearFormProps) {
  const linkedSchoolIds =
    defaultValues?.linkedSchoolIds ?? defaultValues?.schoolIds ?? [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSubmit({
      schoolIds: form.getAll("schoolIds") as string[],
      name: form.get("name") as string,
      startDate: form.get("startDate") as string,
      endDate: form.get("endDate") as string,
      isActive: form.get("isActive") === "on",
      generateCalendar: form.get("generateCalendar") === "on",
    });
  }

  const startDate = defaultValues?.startDate
    ? String(defaultValues.startDate).slice(0, 10)
    : "";
  const endDate = defaultValues?.endDate
    ? String(defaultValues.endDate).slice(0, 10)
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Academic Year Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="2025-2026"
          defaultValue={defaultValues?.name}
          required
        />
        <p className="text-xs text-muted-foreground">
          Lesson plans are resolved under FWIS Docs using this name (e.g.{" "}
          <span className="font-medium text-foreground">
            FWIS Docs/2025-2026/Lesson Plans
          </span>
          ). Set{" "}
          <code className="text-xs">GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID</code> in
          the server environment.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={startDate}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={endDate}
            required
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <p className="font-medium">Schools</p>
          <p className="text-sm text-muted-foreground">
            {mode === "edit"
              ? "Check schools that participate in this academic year."
              : "Select schools to link when creating this year."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.schools.map((school) => (
            <label
              key={school.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                name="schoolIds"
                value={school.id}
                defaultChecked={linkedSchoolIds.includes(school.id)}
                className="rounded"
              />
              <span className="font-mono text-xs text-muted-foreground">
                {school.code}
              </span>
              <span>{school.name}</span>
            </label>
          ))}
        </div>
        {options.schools.length === 0 && (
          <p className="text-sm text-muted-foreground">No schools available.</p>
        )}
      </div>

      {mode === "create" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="generateCalendar"
            defaultChecked={defaultValues?.generateCalendar ?? true}
            className="rounded"
          />
          Generate Sunday calendar days from date range
        </label>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? false}
          className="rounded"
        />
        Set as active year for selected schools
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
