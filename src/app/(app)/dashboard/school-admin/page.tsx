import { getSessionUser, requireRole } from "@/lib/auth/session";
import { isSectionScopedAdmin } from "@/lib/auth/section-scope";
import { prisma } from "@/lib/prisma";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import { SundayAttendanceWidget } from "@/components/dashboard/sunday-attendance-widget";
import { DashboardCalendarHighlights } from "@/components/dashboard/dashboard-calendar-highlights";
import { StudentsByGradeCard } from "@/components/dashboard/students-by-grade-card";
import { StudentsStatCard } from "@/components/dashboard/students-stat-card";
import { TeachersStatCard } from "@/components/dashboard/teachers-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

export const metadata = { title: "School Admin Dashboard" };

export default async function SchoolAdminDashboardPage() {
  const user = await requireRole("SCHOOL_ADMIN");
  const schoolId = user.schoolIds[0];
  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = schoolId
    ? await resolveAcademicYearForSchool(schoolId, selectedYear)
    : null;

  const schoolFilter = schoolId
    ? { schoolId, deletedAt: null }
    : { deletedAt: null };

  const sectionScope =
    isSectionScopedAdmin(user) && user.classroomIds.length > 0
      ? { classroomId: { in: user.classroomIds } }
      : {};

  const enrollmentWhere = {
    ...schoolFilter,
    status: "ACTIVE" as const,
    ...(schoolYear ? { academicYearSchoolId: schoolYear.id } : {}),
    ...sectionScope,
  };

  const teacherWhere = {
    ...(schoolId ? { schoolId } : {}),
    deletedAt: null,
    isActive: true,
  };

  const [studentCount, boyCount, girlCount, teacherCount, maleTeacherCount, femaleTeacherCount, enrollments] =
    await Promise.all([
    prisma.studentEnrollment.count({
      where: enrollmentWhere,
    }),
    prisma.studentEnrollment.count({
      where: { ...enrollmentWhere, student: { gender: "MALE" } },
    }),
    prisma.studentEnrollment.count({
      where: { ...enrollmentWhere, student: { gender: "FEMALE" } },
    }),
    prisma.teacher.count({ where: teacherWhere }),
    prisma.teacher.count({ where: { ...teacherWhere, gender: "MALE" } }),
    prisma.teacher.count({ where: { ...teacherWhere, gender: "FEMALE" } }),
    prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: { select: { gender: true } },
        classroom: { include: { grade: true, section: true } },
        finalGrade: { select: { behaviorPct: true } },
      },
    }),
  ]);

  const behaviorScoreFor = (e: (typeof enrollments)[number]) =>
    e.finalGrade ? Number(e.finalGrade.behaviorPct) : 85;

  const avgBehavior =
    enrollments.length > 0
      ? enrollments.reduce((s, e) => s + behaviorScoreFor(e), 0) / enrollments.length
      : 85;

  const atRisk = enrollments.filter((e) => behaviorScoreFor(e) < 75).length;

  const gradeRows = Object.values(
    enrollments.reduce<
      Record<string, { grade: string; sortOrder: number; total: number; boys: number; girls: number }>
    >((acc, e) => {
      const grade = e.classroom.grade.name;
      if (!acc[grade]) {
        acc[grade] = {
          grade,
          sortOrder: e.classroom.grade.sortOrder,
          total: 0,
          boys: 0,
          girls: 0,
        };
      }
      acc[grade].total += 1;
      if (e.student.gender === "MALE") acc[grade].boys += 1;
      else if (e.student.gender === "FEMALE") acc[grade].girls += 1;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">School Dashboard</h1>
        <p className="text-muted-foreground">Your school at a glance</p>
      </div>

      {schoolId && (
        <DashboardCalendarHighlights
          schoolId={schoolId}
          selectedYear={selectedYear}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudentsStatCard
          label="Students"
          total={studentCount}
          boys={boyCount}
          girls={girlCount}
        />
        <TeachersStatCard
          total={teacherCount}
          male={maleTeacherCount}
          female={femaleTeacherCount}
        />
        {[
          { label: "Attendance", value: formatPercent(90) },
          { label: "Behavior Avg", value: formatPercent(avgBehavior) },
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

      {schoolId && (
        <SundayAttendanceWidget
          schoolIds={[schoolId]}
          showSchoolColumn={false}
          selectedYear={selectedYear}
          classroomIds={
            isSectionScopedAdmin(user) ? user.classroomIds : undefined
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentsByGradeCard rows={gradeRows} />

        <Card>
          <CardHeader>
            <CardTitle>Students At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{atRisk}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Students with behavior score below 75%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
