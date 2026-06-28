"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StudentInput } from "@/lib/validations/student";

type StudentFormProps = {
  defaultValues?: Partial<StudentInput> & { id?: string };
  onSubmit: (data: StudentInput) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
};

export function StudentForm({
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
}: StudentFormProps) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSubmit({
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      gender: form.get("gender") as "MALE" | "FEMALE",
      dateOfBirth: (form.get("dateOfBirth") as string) || undefined,
      parentName: (form.get("parentName") as string) || undefined,
      parentPhone: (form.get("parentPhone") as string) || undefined,
      parentEmail: (form.get("parentEmail") as string) || undefined,
      address: (form.get("address") as string) || undefined,
      emergencyContact: (form.get("emergencyContact") as string) || undefined,
      enrollmentDate: (form.get("enrollmentDate") as string) || undefined,
      isActive: form.get("isActive") === "on",
    });
  }

  const dobValue = defaultValues?.dateOfBirth
    ? String(defaultValues.dateOfBirth).slice(0, 10)
    : "";
  const enrollValue = defaultValues?.enrollmentDate
    ? String(defaultValues.enrollmentDate).slice(0, 10)
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={defaultValues?.firstName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            defaultValue={defaultValues?.lastName}
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
            defaultValue={defaultValues?.gender ?? "MALE"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={dobValue}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentName">Parent / Guardian Name</Label>
        <Input
          id="parentName"
          name="parentName"
          defaultValue={defaultValues?.parentName ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parentPhone">Parent Phone</Label>
          <Input
            id="parentPhone"
            name="parentPhone"
            type="tel"
            defaultValue={defaultValues?.parentPhone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentEmail">Parent Email</Label>
          <Input
            id="parentEmail"
            name="parentEmail"
            type="email"
            defaultValue={defaultValues?.parentEmail ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={defaultValues?.address ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyContact">Emergency Contact</Label>
        <Input
          id="emergencyContact"
          name="emergencyContact"
          defaultValue={defaultValues?.emergencyContact ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="enrollmentDate">Enrollment Date</Label>
        <Input
          id="enrollmentDate"
          name="enrollmentDate"
          type="date"
          defaultValue={enrollValue}
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
