import { getEnrollmentById, getEnrollmentFormOptions } from "@/actions/enrollments";
import { requirePermission } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { EditEnrollmentClient } from "./edit-enrollment-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditEnrollmentPage({ params }: PageProps) {
  await requirePermission("enrollments:update");
  const { id } = await params;

  let enrollment;
  try {
    enrollment = await getEnrollmentById(id);
  } catch {
    notFound();
  }
  if (!enrollment) notFound();

  const options = await getEnrollmentFormOptions();

  return (
    <EditEnrollmentClient
      id={id}
      enrollment={{
        studentFirstName: enrollment.student.firstName,
        studentLastName: enrollment.student.lastName,
        studentId: enrollment.studentId,
        schoolId: enrollment.schoolId,
        academicYearId: enrollment.academicYearId,
        classroomId: enrollment.classroomId,
        teacherId: enrollment.teacherId,
        enrollmentDate: enrollment.enrollmentDate.toISOString(),
        status: enrollment.status,
      }}
      options={options}
    />
  );
}
