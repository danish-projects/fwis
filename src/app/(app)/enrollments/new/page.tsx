import { getEnrollmentFormOptions } from "@/actions/enrollments";
import { requirePermission } from "@/lib/auth/session";
import { NewEnrollmentClient } from "./new-enrollment-client";

export const metadata = { title: "New Enrollment" };

type PageProps = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function NewEnrollmentPage({ searchParams }: PageProps) {
  await requirePermission("enrollments:create");
  const { studentId } = await searchParams;
  const options = await getEnrollmentFormOptions();
  return <NewEnrollmentClient options={options} preferredStudentId={studentId} />;
}
