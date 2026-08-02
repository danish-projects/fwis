import { getTeacherPrimaryClassroomId, getDefaultAttendanceDayId } from "@/lib/auth/teacher-defaults";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Teacher Attendance" };

export default async function TeacherAttendancePage() {
  await requireRole("TEACHER", "SUBSTITUTE");
  const user = await getSessionUser();
  const classroomId = user ? await getTeacherPrimaryClassroomId(user) : null;

  if (classroomId) {
    const dayId = await getDefaultAttendanceDayId(classroomId);
    redirect(`/teacher/attendance/${classroomId}${dayId ? `?day=${dayId}` : ""}`);
  }

  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        No grades assigned. Contact your school administrator.
      </CardContent>
    </Card>
  );
}
