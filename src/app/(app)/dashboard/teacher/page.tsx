import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  getDefaultAttendanceDayId,
  getTeacherPrimaryClassroomId,
} from "@/lib/auth/teacher-defaults";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import { StudentsStatCard } from "@/components/dashboard/students-stat-card";
import { DashboardCalendarHighlights } from "@/components/dashboard/dashboard-calendar-highlights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatPercent } from "@/lib/utils";
import { pickSchoolLink } from "@/lib/classrooms/ensure-classroom-for-school";
import { getSelectedSchool } from "@/lib/school/resolve-school";

export const metadata = { title: "Teacher Dashboard" };

export default async function TeacherDashboardPage() {
  const user = await requireRole("TEACHER");
  const classroomId = await getTeacherPrimaryClassroomId(user);

  if (!classroomId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No grade assigned. Contact your school administrator.
        </CardContent>
      </Card>
    );
  }

  const [classroom, selectedSchool] = await Promise.all([
    prisma.classroom.findFirst({
      where: { id: classroomId, deletedAt: null },
      include: {
        schoolLinks: {
          where: { deletedAt: null, isActive: true },
          include: { school: { select: { name: true } } },
        },
        grade: true,
        section: true,
      },
    }),
    getSelectedSchool(user),
  ]);

  if (!classroom) {
    redirect("/unauthorized");
  }

  const preferredSchoolIds = [
    ...(selectedSchool ? [selectedSchool.id] : []),
    ...user.schoolIds,
  ];
  const schoolLink = pickSchoolLink(classroom.schoolLinks, preferredSchoolIds);
  if (!schoolLink) {
    redirect("/unauthorized");
  }

  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(
    schoolLink.schoolId,
    selectedYear
  );

  const enrollmentWhere = {
    classroomId,
    deletedAt: null,
    status: "ACTIVE" as const,
    ...(schoolYear ? { academicYearSchoolId: schoolYear.id } : {}),
  };

  const enrollments = await prisma.studentEnrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: { select: { gender: true } },
      finalGrade: { select: { attendancePct: true, behaviorPct: true } },
    },
  });

  const boyCount = enrollments.filter((e) => e.student.gender === "MALE").length;
  const girlCount = enrollments.filter((e) => e.student.gender === "FEMALE").length;

  const withGrades = enrollments.filter((e) => e.finalGrade);
  const avgBehavior =
    withGrades.length > 0
      ? withGrades.reduce(
          (sum, e) => sum + Number(e.finalGrade!.behaviorPct),
          0
        ) / withGrades.length
      : 100;
  const atRisk = withGrades.filter(
    (e) => Number(e.finalGrade!.behaviorPct) < 75
  ).length;

  const avgAttendance =
    withGrades.length > 0
      ? withGrades.reduce(
          (sum, e) => sum + Number(e.finalGrade!.attendancePct),
          0
        ) / withGrades.length
      : 100;

  const dayId = await getDefaultAttendanceDayId(classroomId);
  const attendanceHref = `/teacher/attendance/${classroomId}${dayId ? `?day=${dayId}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">My Grade Dashboard</h1>
        <p className="text-muted-foreground">
          {classroom.name} · {schoolLink.school.name}
          {schoolYear ? ` · ${schoolYear.academicYear.name}` : ""}
        </p>
      </div>

      {schoolYear && (
        <DashboardCalendarHighlights
          schoolId={schoolLink.schoolId}
          academicYearSchoolId={schoolYear.id}
          selectedYear={selectedYear}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudentsStatCard
          label="Students in My Grade"
          total={enrollments.length}
          boys={boyCount}
          girls={girlCount}
        />
        {[
          { label: "Avg Attendance", value: formatPercent(avgAttendance) },
          { label: "Behavior Avg", value: formatPercent(avgBehavior) },
          { label: "Students At Risk", value: String(atRisk) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={attendanceHref}>Take Attendance</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/teacher/assessments/${classroomId}`}>Enter Assessments</Link>
        </Button>
      </div>

      {atRisk > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Behavior Watch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {atRisk} student{atRisk === 1 ? "" : "s"} in your grade ha
              {atRisk === 1 ? "s" : "ve"} a behavior score below 75%.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
