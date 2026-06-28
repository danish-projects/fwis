"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AcademicYearInput } from "@/lib/validations/academic-year";

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/academic-years").getAcademicYearFormOptions>
>;

type AcademicYearFormProps = {
  options: FormOptions;
  defaultValues?: Partial<AcademicYearInput>;
  onSubmit: (data: AcademicYearInput) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
  showGenerateCalendar?: boolean;
};

export function AcademicYearForm({
  options,
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
  showGenerateCalendar = true,
}: AcademicYearFormProps) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSubmit({
      schoolId: form.get("schoolId") as string,
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
        <Label htmlFor="schoolId">School *</Label>
        <select
          id="schoolId"
          name="schoolId"
          required
          defaultValue={defaultValues?.schoolId}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select school</option>
          {options.schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Academic Year Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="2025-2026"
          defaultValue={defaultValues?.name}
          required
        />
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? false}
          className="rounded"
        />
        Set as active year for this school
      </label>

      {showGenerateCalendar && (
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

      <div className="flex gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
