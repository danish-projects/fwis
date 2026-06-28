"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GradeRecordInput } from "@/lib/validations/grade-record";

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/grades").getGradeRecordFormOptions>
>;

type GradeFormProps = {
  options: FormOptions;
  defaultValues?: Partial<GradeRecordInput & { name?: string }>;
  onSubmit: (data: GradeRecordInput) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
};

export function GradeForm({
  options,
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
}: GradeFormProps) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSubmit({
      schoolId: form.get("schoolId") as string,
      gradeId: Number(form.get("gradeId")),
      sectionId: Number(form.get("sectionId")),
      name: (form.get("name") as string) || undefined,
      isActive: form.get("isActive") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schoolId">School *</Label>
        <select
          id="schoolId"
          name="schoolId"
          required
          defaultValue={defaultValues?.schoolId ?? options.defaultSchoolId ?? ""}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gradeId">Grade Level *</Label>
          <select
            id="gradeId"
            name="gradeId"
            required
            defaultValue={defaultValues?.gradeId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select grade</option>
            {options.grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sectionId">Section *</Label>
          <select
            id="sectionId"
            name="sectionId"
            required
            defaultValue={defaultValues?.sectionId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select section</option>
            {options.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Auto-generated from grade + section if blank"
          defaultValue={defaultValues?.name}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="rounded"
        />
        Active
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
