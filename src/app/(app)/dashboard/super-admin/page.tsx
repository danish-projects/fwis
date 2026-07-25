import { requireRole, getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateSchoolHealthScore } from "@/lib/grades/calculate-final-grade";
import { BEHAVIOR_BASE_SCORE } from "@/lib/behavior";
import { getSelectedAcademicYear } from "@/lib/academic-year/resolve-year";
import { SundayAttendanceWidget } from "@/components/dashboard/sunday-attendance-widget";
import { DashboardCalendarHighlights } from "@/components/dashboard/dashboard-calendar-highlights";
import { StudentsStatCard } from "@/components/dashboard/students-stat-card";
import { HealthScoreStatCard } from "@/components/dashboard/health-score-stat-card";
import { StaffStatCard } from "@/components/dashboard/staff-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

export const metadata = { title: "Super Admin Dashboard" };

const activeEnrollmentWhere = { deletedAt: null, status: "ACTIVE" as const };

export default async function SuperAdminDashboardPage() {
  await requireRole("NIGRA");
  const user = await getSessionUser();
  const selectedYear = user ? await getSelectedAcademicYear(user) : null;

  const yearFilter = selectedYear
    ? {
        academicYearSchool: {
          academicYear: { name: selectedYear.name, deletedAt: null },
          deletedAt: null,
        },
      }
    : {};

  const enrollmentWhere = { ...activeEnrollmentWhere, ...yearFilter };

  const staffWhere = { deletedAt: null, isActive: true };

  const [
    schoolCount,
    studentCount,
    boyCount,
    girlCount,
    staffCount,
    maleStaffCount,
    femaleStaffCount,
    schools,
    recentActivity,
  ] = await Promise.all([
    prisma.school.count({ where: { deletedAt: null, isActive: true } }),
    prisma.studentEnrollment.count({ where: enrollmentWhere }),
    prisma.studentEnrollment.count({
      where: { ...enrollmentWhere, student: { gender: "MALE" } },
    }),
    prisma.studentEnrollment.count({
      where: { ...enrollmentWhere, student: { gender: "FEMALE" } },
    }),
    prisma.staff.count({ where: staffWhere }),
    prisma.staff.count({ where: { ...staffWhere, gender: "MALE" } }),
    prisma.staff.count({ where: { ...staffWhere, gender: "FEMALE" } }),
    prisma.school.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        enrollments: {
          where: enrollmentWhere,
          select: {
            finalGrade: { select: { behaviorPct: true } },
          },
        },
      },
      take: 10,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true, school: true },
    }),
  ]);

  const schoolRankings = schools
    .map((school) => {
      const avgBehavior =
        school.enrollments.length > 0
          ? school.enrollments.reduce(
              (sum, e) => sum + Number(e.finalGrade?.behaviorPct ?? BEHAVIOR_BASE_SCORE),
              0
            ) / school.enrollments.length
          : BEHAVIOR_BASE_SCORE;
      const health = calculateSchoolHealthScore({
        attendancePct: 88,
        academicPct: 82,
        behaviorPct: avgBehavior,
      });
      return {
        id: school.id,
        name: school.name,
        health,
        students: school.enrollments.length,
      };
    })
    .sort((a, b) => b.health - a.health);

  const avgHealth =
    schoolRankings.length > 0
      ? schoolRankings.reduce((s, r) => s + r.health, 0) / schoolRankings.length
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Nationwide overview of all FWIS schools</p>
      </div>

      <DashboardCalendarHighlights selectedYear={selectedYear} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{schoolCount}</p>
          </CardContent>
        </Card>

        <StudentsStatCard total={studentCount} boys={boyCount} girls={girlCount} />

        <StaffStatCard
          label="Total Staff"
          total={staffCount}
          male={maleStaffCount}
          female={femaleStaffCount}
        />

        <HealthScoreStatCard value={formatPercent(avgHealth)} />
      </div>

      <SundayAttendanceWidget selectedYear={selectedYear} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Schools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schoolRankings.slice(0, 5).map((school, i) => (
              <div key={school.id} className="flex items-center justify-between">
                <span>
                  #{i + 1} {school.name}
                </span>
                <span className="font-medium text-primary">
                  {formatPercent(school.health)}
                </span>
              </div>
            ))}
            {schoolRankings.length === 0 && (
              <p className="text-muted-foreground">No school data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((log) => (
              <div key={log.id} className="text-sm">
                <p className="font-medium">
                  {log.action} {log.entity}
                  {log.school ? ` · ${log.school.name}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {log.user?.userId ?? "System"} ·{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-muted-foreground">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
