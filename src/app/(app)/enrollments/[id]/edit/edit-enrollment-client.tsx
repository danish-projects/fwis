"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteEnrollment, updateEnrollment } from "@/actions/enrollments";
import { EnrollmentForm } from "@/components/enrollments/enrollment-form";
import { asEnrollmentStatus } from "@/lib/setup-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EditEnrollmentData = {
  studentFirstName: string;
  studentLastName: string;
  studentId: string;
  schoolId: string;
  academicYearId: string;
  classroomId: string;
  staffId: string | null;
  enrollmentDate: string;
  status: string;
};

type Props = {
  id: string;
  enrollment: EditEnrollmentData;
  options: Awaited<ReturnType<typeof import("@/actions/enrollments").getEnrollmentFormOptions>>;
};

export function EditEnrollmentClient({ id, enrollment, options }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Withdraw this enrollment?")) return;
    try {
      await deleteEnrollment(id);
      toast.success("Enrollment withdrawn");
      router.push("/enrollments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Enrollment</h1>
          <p className="text-muted-foreground">
            {enrollment.studentFirstName} {enrollment.studentLastName}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Withdraw
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={loading}>
            <EnrollmentForm
              options={options}
              defaultValues={{
                studentId: enrollment.studentId,
                schoolId: enrollment.schoolId,
                academicYearId: enrollment.academicYearId,
                classroomId: enrollment.classroomId,
                staffId: enrollment.staffId ?? "",
                enrollmentDate: enrollment.enrollmentDate,
                status: asEnrollmentStatus(enrollment.status),
              }}
              submitLabel={loading ? "Saving..." : "Save Changes"}
              cancelHref={`/enrollments/${id}`}
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  await updateEnrollment(id, data);
                  toast.success("Enrollment updated");
                  router.push(`/enrollments/${id}`);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Update failed"
                  );
                  setLoading(false);
                }
              }}
            />
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
