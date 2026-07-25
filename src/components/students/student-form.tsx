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

function readOptional(form: FormData, key: string): string | undefined {
  const value = (form.get(key) as string) || "";
  return value.trim() ? value : undefined;
}

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
      dateOfBirth: readOptional(form, "dateOfBirth"),
      emailAddress: readOptional(form, "emailAddress"),
      streetAddress: readOptional(form, "streetAddress"),
      city: readOptional(form, "city"),
      stateProvince: readOptional(form, "stateProvince"),
      zipPostalCode: readOptional(form, "zipPostalCode"),
      country: readOptional(form, "country"),
      fatherGuardianFirstName: readOptional(form, "fatherGuardianFirstName"),
      fatherGuardianLastName: readOptional(form, "fatherGuardianLastName"),
      fatherParentalResponsibility: form.get("fatherParentalResponsibility") === "on",
      fatherMobileWhatsappNumber: readOptional(form, "fatherMobileWhatsappNumber"),
      motherGuardianFirstName: readOptional(form, "motherGuardianFirstName"),
      motherGuardianLastName: readOptional(form, "motherGuardianLastName"),
      motherParentalResponsibility: form.get("motherParentalResponsibility") === "on",
      motherMobileWhatsappNumber: readOptional(form, "motherMobileWhatsappNumber"),
      emergencyContact: readOptional(form, "emergencyContact"),
      enrollmentDate: readOptional(form, "enrollmentDate"),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Student</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Student First Name *</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              defaultValue={defaultValues?.firstName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Student Last Name *</Label>
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
            <Label htmlFor="gender">Student Gender *</Label>
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
            <Label htmlFor="dateOfBirth">Student Date of Birth</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={dobValue}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailAddress">Email Address</Label>
          <Input
            id="emailAddress"
            name="emailAddress"
            type="email"
            defaultValue={defaultValues?.emailAddress ?? ""}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Address</h3>
        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input
            id="streetAddress"
            name="streetAddress"
            defaultValue={defaultValues?.streetAddress ?? ""}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={defaultValues?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stateProvince">State / Province</Label>
            <Input
              id="stateProvince"
              name="stateProvince"
              defaultValue={defaultValues?.stateProvince ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="zipPostalCode">Zip / Postal Code</Label>
            <Input
              id="zipPostalCode"
              name="zipPostalCode"
              defaultValue={defaultValues?.zipPostalCode ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              defaultValue={defaultValues?.country ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Father / Guardian</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fatherGuardianFirstName">First Name</Label>
            <Input
              id="fatherGuardianFirstName"
              name="fatherGuardianFirstName"
              defaultValue={defaultValues?.fatherGuardianFirstName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fatherGuardianLastName">Last Name</Label>
            <Input
              id="fatherGuardianLastName"
              name="fatherGuardianLastName"
              defaultValue={defaultValues?.fatherGuardianLastName ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fatherMobileWhatsappNumber">Mobile / WhatsApp</Label>
            <Input
              id="fatherMobileWhatsappNumber"
              name="fatherMobileWhatsappNumber"
              type="tel"
              defaultValue={defaultValues?.fatherMobileWhatsappNumber ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="fatherParentalResponsibility"
              defaultChecked={defaultValues?.fatherParentalResponsibility ?? false}
              className="rounded"
            />
            Parental responsibility
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Mother / Guardian</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="motherGuardianFirstName">First Name</Label>
            <Input
              id="motherGuardianFirstName"
              name="motherGuardianFirstName"
              defaultValue={defaultValues?.motherGuardianFirstName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherGuardianLastName">Last Name</Label>
            <Input
              id="motherGuardianLastName"
              name="motherGuardianLastName"
              defaultValue={defaultValues?.motherGuardianLastName ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="motherMobileWhatsappNumber">Mobile / WhatsApp</Label>
            <Input
              id="motherMobileWhatsappNumber"
              name="motherMobileWhatsappNumber"
              type="tel"
              defaultValue={defaultValues?.motherMobileWhatsappNumber ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="motherParentalResponsibility"
              defaultChecked={defaultValues?.motherParentalResponsibility ?? false}
              className="rounded"
            />
            Parental responsibility
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Other</h3>
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
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
