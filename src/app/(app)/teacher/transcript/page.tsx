import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getTeacherPrimaryClassroomId } from "@/lib/auth/teacher-defaults";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Transcript" };

export default async function TeacherTranscriptPage() {
  const user = await requireRole("TEACHER");
  const classroomId = await getTeacherPrimaryClassroomId(user);

  if (classroomId) {
    redirect(`/teacher/transcript/${classroomId}`);
  }

  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        No grade assigned. Contact your school administrator.
      </CardContent>
    </Card>
  );
}
