import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentProfile } from "@/actions/student-profile";
import { StudentProfileView } from "@/components/students/student-profile-view";
import { Button } from "@/components/ui/button";
import { getSessionUser, requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Student Profile" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function StudentProfilePage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission("students:read");
  const user = await getSessionUser();
  const isTeacherOnly =
    !!user &&
    (user.roles.includes("TEACHER") || user.roles.includes("SUBSTITUTE")) &&
    !user.roles.includes("SCHOOL_ADMIN") &&
    !user.roles.includes("PRINCIPAL") &&
    !user.roles.includes("NIGRA");

  const { id } = await params;
  const { year } = await searchParams;

  let profile;
  try {
    profile = await getStudentProfile(id, year);
  } catch {
    notFound();
  }

  if (!profile) notFound();

  return (
    <div className="space-y-6">
      {!isTeacherOnly && (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${id}`}>← Student Details</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/students">All Students</Link>
          </Button>
        </div>
      )}
      <StudentProfileView profile={profile} />
    </div>
  );
}
