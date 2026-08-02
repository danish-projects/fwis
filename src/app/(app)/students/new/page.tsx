"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createStudent } from "@/actions/students";
import { StudentForm } from "@/components/students/student-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastStudentSaveError } from "@/lib/students/toast-student-save-error";

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: Parameters<typeof createStudent>[0]) {
    setLoading(true);
    try {
      const student = await createStudent(data);
      toast.success("Student created");
      router.push(`/enrollments/new?studentId=${student.id}`);
    } catch (error) {
      toastStudentSaveError(error, "Could not create student");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Student</h1>
        <p className="text-muted-foreground">
          Create a permanent student record. Duplicate checks run automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={loading}>
            <StudentForm
              submitLabel={loading ? "Creating..." : "Create Student"}
              cancelHref="/students"
              onSubmit={handleSubmit}
            />
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
