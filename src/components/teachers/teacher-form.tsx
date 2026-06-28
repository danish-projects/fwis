"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getTeacherFormOptions } from "@/actions/teachers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GenderCode } from "@/lib/setup-types";
import { sectionNameForGender } from "@/lib/teachers/gender-section";
import type { TeacherInput } from "@/lib/validations/teacher";

type FormOptions = Awaited<ReturnType<typeof getTeacherFormOptions>>;

type TeacherFormProps = {
  options: FormOptions;
  defaultValues?: Partial<TeacherInput>;
  onSubmit: (data: TeacherInput) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
};

export function TeacherForm({
  options: initialOptions,
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
}: TeacherFormProps) {
  const [options, setOptions] = useState(initialOptions);
  const [schoolId, setSchoolId] = useState(
    defaultValues?.schoolId ?? initialOptions.defaultSchoolId ?? ""
  );
  const [gender, setGender] = useState<GenderCode>(
    defaultValues?.gender ?? "MALE"
  );
  const [classroomId, setClassroomId] = useState(
    defaultValues?.classroomIds?.[0] ?? ""
  );

  useEffect(() => {
    if (!schoolId) return;
    getTeacherFormOptions(schoolId).then(setOptions);
  }, [schoolId]);

  const filteredClassrooms = useMemo(() => {
    if (!schoolId || !gender) return [];
    const sectionName = sectionNameForGender(gender);
    return options.classrooms.filter(
      (c) => c.schoolId === schoolId && c.sectionName === sectionName
    );
  }, [options.classrooms, schoolId, gender]);

  useEffect(() => {
    if (!classroomId) return;
    const stillValid = filteredClassrooms.some((c) => c.id === classroomId);
    if (!stillValid) setClassroomId("");
  }, [classroomId, filteredClassrooms]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    await onSubmit({
      schoolId,
      gender,
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      phone: (form.get("phone") as string) || undefined,
      isActive: form.get("isActive") === "on",
      classroomIds: classroomId ? [classroomId] : [],
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
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
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
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={defaultValues?.firstName}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={defaultValues?.lastName}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <select
            id="gender"
            name="gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value as GenderCode)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="classroomId">Assigned Grade</Label>
        <select
          id="classroomId"
          name="classroomId"
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
          disabled={!schoolId}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">None</option>
          {filteredClassrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {gender === "MALE"
            ? "Male teachers can only be assigned to Boys grades."
            : "Female teachers can only be assigned to Girls grades."}{" "}
          One teacher may teach only one grade per academic year.
        </p>
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
