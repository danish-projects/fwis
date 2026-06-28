import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getTeacherPrimaryClassroomId } from "@/lib/auth/teacher-defaults";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Assessments" };

export default async function TeacherAssessmentsPage() {
  const user = await requireRole("TEACHER");
  const classroomId = await getTeacherPrimaryClassroomId(user);

  if (classroomId) {
    redirect(`/teacher/assessments/${classroomId}`);
  }

  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        No grade assigned. Contact your school administrator.
      </CardContent>
    </Card>
  );
}
