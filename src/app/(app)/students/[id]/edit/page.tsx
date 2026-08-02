"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteStudent,
  getStudentById,
  updateStudent,
} from "@/actions/students";
import { StudentForm } from "@/components/students/student-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentInput } from "@/lib/validations/student";
import { asGender } from "@/lib/setup-types";
import { toastStudentSaveError } from "@/lib/students/toast-student-save-error";

type PageProps = { params: Promise<{ id: string }> };

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export default function EditStudentPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<Awaited<ReturnType<typeof getStudentById>>>(null);

  useEffect(() => {
    params.then(async ({ id: studentId }) => {
      setId(studentId);
      try {
        const data = await getStudentById(studentId);
        setStudent(data);
      } catch {
        toast.error("Student not found or access denied");
      }
      setLoading(false);
    });
  }, [params]);

  async function handleSubmit(data: StudentInput) {
    setSaving(true);
    try {
      await updateStudent(id, data);
      toast.success("Student updated");
      router.push(`/students/${id}`);
    } catch (error) {
      toastStudentSaveError(error, "Could not update student");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Soft-delete this student record?")) return;
    try {
      await deleteStudent(id);
      toast.success("Student deleted");
      router.push("/students");
    } catch (error) {
      toastStudentSaveError(error, "Could not delete student");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-muted-foreground">Student not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Student</h1>
          <p className="text-muted-foreground">
            {student.firstName} {student.lastName}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={saving}>
            <StudentForm
              defaultValues={{
                firstName: student.firstName,
                lastName: student.lastName,
                gender: asGender(student.gender),
                dateOfBirth: toDateInputValue(student.dateOfBirth) || undefined,
                emailAddress: student.emailAddress ?? undefined,
                streetAddress: student.streetAddress ?? undefined,
                city: student.city ?? undefined,
                stateProvince: student.stateProvince ?? undefined,
                zipPostalCode: student.zipPostalCode ?? undefined,
                country: student.country ?? undefined,
                fatherGuardianFirstName: student.fatherGuardianFirstName ?? undefined,
                fatherGuardianLastName: student.fatherGuardianLastName ?? undefined,
                fatherParentalResponsibility:
                  student.fatherParentalResponsibility ?? undefined,
                fatherMobileWhatsappNumber:
                  student.fatherMobileWhatsappNumber ?? undefined,
                motherGuardianFirstName: student.motherGuardianFirstName ?? undefined,
                motherGuardianLastName: student.motherGuardianLastName ?? undefined,
                motherParentalResponsibility:
                  student.motherParentalResponsibility ?? undefined,
                motherMobileWhatsappNumber:
                  student.motherMobileWhatsappNumber ?? undefined,
                emergencyContact: student.emergencyContact ?? undefined,
                enrollmentDate: toDateInputValue(student.enrollmentDate) || undefined,
                isActive: student.isActive,
              }}
              submitLabel={saving ? "Saving..." : "Save Changes"}
              cancelHref={`/students/${id}`}
              onSubmit={handleSubmit}
            />
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
