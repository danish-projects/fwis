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

type PageProps = { params: Promise<{ id: string }> };

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
      toast.error(error instanceof Error ? error.message : "Update failed");
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
      toast.error(error instanceof Error ? error.message : "Delete failed");
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
                dateOfBirth: student.dateOfBirth?.toISOString(),
                parentName: student.parentName ?? undefined,
                parentPhone: student.parentPhone ?? undefined,
                parentEmail: student.parentEmail ?? undefined,
                address: student.address ?? undefined,
                emergencyContact: student.emergencyContact ?? undefined,
                enrollmentDate: student.enrollmentDate.toISOString(),
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
