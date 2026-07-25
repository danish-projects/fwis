import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnrollmentById } from "@/actions/enrollments";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPercent } from "@/lib/utils";
import { BehaviorCalculationService, BEHAVIOR_REPORT_WEIGHT } from "@/lib/behavior";
import { prisma } from "@/lib/prisma";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { asSessionType } from "@/lib/setup-types";

type PageProps = { params: Promise<{ id: string }> };

export default async function EnrollmentDetailPage({ params }: PageProps) {
  await requirePermission("enrollments:read");
  const user = await getSessionUser();
  const canEdit = user && hasPermission(user.roles, "enrollments:update");

  const { id } = await params;
  let enrollment;
  try {
    enrollment = await getEnrollmentById(id);
  } catch {
    notFound();
  }
  if (!enrollment) notFound();

  const behaviorRatings = await prisma.attendance.findMany({
    where: {
      enrollmentId: id,
      deletedAt: null,
      behaviorValue: { not: null },
    },
    select: { behaviorValue: true },
  });

  const behaviorScore = BehaviorCalculationService.calculateFromRaw(
    behaviorRatings.map((row) => row.behaviorValue)
  );
  const behaviorLevel = BehaviorCalculationService.levelForScore(behaviorScore);
  const behaviorContribution =
    BehaviorCalculationService.contributionToFinalGrade(behaviorScore);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {enrollment.student.firstName} {enrollment.student.lastName}
          </h1>
          <p className="text-muted-foreground">
            {enrollment.academicYearSchool.academicYear.name} · {enrollment.classroom.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/enrollments">Back</Link>
          </Button>
          {canEdit && (
            <Button asChild>
              <Link href={`/enrollments/${id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={enrollment.status === "ACTIVE" ? "success" : "secondary"}>
              {enrollment.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(behaviorScore)}</p>
            <p className="text-sm text-muted-foreground">{behaviorLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Final Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {enrollment.finalGrade
                ? `${enrollment.finalGrade.letterGrade} (${formatPercent(Number(enrollment.finalGrade.finalPct))})`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Class Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {enrollment.finalGrade?.classRank ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">School</p>
            <p>{enrollment.school.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Staff</p>
            <p>
              {enrollment.staff
                ? `${enrollment.staff.firstName} ${enrollment.staff.lastName}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Enrolled</p>
            <p>{formatDate(enrollment.enrollmentDate)}</p>
          </div>
          {enrollment.finalGrade && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Attendance %</p>
                <p>{formatPercent(Number(enrollment.finalGrade.attendancePct))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Behavior %</p>
                <p>{formatPercent(Number(enrollment.finalGrade.behaviorPct))}</p>
                <p className="text-xs text-muted-foreground">
                  Level: {behaviorLevel} · Weight: {BEHAVIOR_REPORT_WEIGHT * 100}% ·
                  Contribution: {behaviorContribution.toFixed(2)} pts
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {enrollment.attendance.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span>
                  {formatLessonPlanLabel(a.calendarDay.lessonPlanNumber)} — {formatDate(a.calendarDay.date)} (
                  {SESSION_TYPE_LABELS[asSessionType(a.calendarDay.sessionType)]})
                </span>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            ))}
            {enrollment.attendance.length === 0 && (
              <p className="text-muted-foreground">No attendance recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
