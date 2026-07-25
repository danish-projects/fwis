import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentNameWithGender } from "@/components/students/student-name-with-gender";
import { StudentProfileYearSelect } from "@/components/students/student-profile-year-select";
import type { StudentProfileData } from "@/actions/student-profile";
import { formatDate, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

const HEALTH_STYLES = {
  green: {
    border: "border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
    text: "text-emerald-800 dark:text-emerald-200",
  },
  orange: {
    border: "border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    dot: "bg-amber-500",
    text: "text-amber-900 dark:text-amber-200",
  },
  red: {
    border: "border-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    dot: "bg-red-500",
    text: "text-red-900 dark:text-red-200",
  },
} as const;

type StudentProfileViewProps = {
  profile: StudentProfileData;
};

export function StudentProfileView({ profile }: StudentProfileViewProps) {
  const healthStyle = HEALTH_STYLES[profile.health.status];
  const fullName = `${profile.student.firstName} ${profile.student.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StudentNameWithGender
            name={fullName}
            gender={profile.student.gender}
            studentNumber={profile.student.studentNumber}
            className="text-2xl font-bold md:text-3xl [&>span:first-child]:text-2xl [&>span:first-child]:font-bold md:[&>span:first-child]:text-3xl"
          />
          <p className="mt-1 text-muted-foreground">Student Profile</p>
        </div>
        <StudentProfileYearSelect
          studentId={profile.student.id}
          years={profile.yearOptions}
          selectedYearId={profile.selectedYearId}
        />
      </div>

      <Card
        className={cn(
          "border-l-4",
          healthStyle.border,
          healthStyle.bg
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-3 w-3 rounded-full", healthStyle.dot)}
              aria-hidden
            />
            <CardTitle className={cn("text-lg", healthStyle.text)}>
              {profile.health.title}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn("capitalize", healthStyle.text)}
            >
              {profile.health.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className={cn("text-sm leading-relaxed", healthStyle.text)}>
            {profile.health.description}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p>{formatDate(profile.student.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined School</p>
              <p>{formatDate(profile.student.enrollmentDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={profile.student.isActive ? "success" : "secondary"}>
                {profile.student.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p>{profile.student.streetAddress ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p>{profile.student.city ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">State / Province</p>
              <p>{profile.student.stateProvince ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zip / Postal</p>
              <p>{profile.student.zipPostalCode ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p>{profile.student.country ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p>{profile.student.emailAddress ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Father / Guardian</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p>
                {[
                  profile.student.fatherGuardianFirstName,
                  profile.student.fatherGuardianLastName,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mobile / WhatsApp</p>
              <p>{profile.student.fatherMobileWhatsappNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Parental responsibility</p>
              <p>
                {profile.student.fatherParentalResponsibility == null
                  ? "—"
                  : profile.student.fatherParentalResponsibility
                    ? "Yes"
                    : "No"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emergency Contact</p>
              <p>{profile.student.emergencyContact ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mother / Guardian</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p>
                {[
                  profile.student.motherGuardianFirstName,
                  profile.student.motherGuardianLastName,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mobile / WhatsApp</p>
              <p>{profile.student.motherMobileWhatsappNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Parental responsibility</p>
              <p>
                {profile.student.motherParentalResponsibility == null
                  ? "—"
                  : profile.student.motherParentalResponsibility
                    ? "Yes"
                    : "No"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.enrollment ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Academic Year</p>
                <p className="font-medium">{profile.enrollment.academicYearName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">School</p>
                <p className="font-medium">{profile.enrollment.schoolName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grade / Class</p>
                <p className="font-medium">{profile.enrollment.gradeName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff</p>
                <p className="font-medium">
                  {profile.enrollment.staffName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year Enrolled</p>
                <p>{formatDate(profile.enrollment.enrollmentDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    profile.enrollment.status === "ACTIVE" ? "success" : "outline"
                  }
                >
                  {profile.enrollment.status}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No enrollment found for the selected academic year.
            </p>
          )}
        </CardContent>
      </Card>

      {profile.enrollment && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{profile.attendance.present}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPercent(profile.attendance.presentPct)} of{" "}
                  {profile.attendance.totalDays} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Absent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{profile.attendance.absent}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPercent(profile.attendance.absentPct)} of{" "}
                  {profile.attendance.totalDays} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Tardy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{profile.attendance.tardy}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPercent(profile.attendance.tardyPct)} of{" "}
                  {profile.attendance.totalDays} days
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Weighted attendance rate (present + tardy):{" "}
                <span className="font-semibold text-foreground">
                  {formatPercent(profile.attendance.attendancePct)}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quizzes & Final Exam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Assessment</th>
                      <th className="pb-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.assessments.map((a) => (
                      <tr key={a.type} className="border-b last:border-0">
                        <td className="py-3 pr-4">{a.label}</td>
                        <td className="py-3 font-medium">
                          {a.score != null ? formatPercent(a.score) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Rating</th>
                      <th className="pb-3 pr-4 font-medium">Adjustment</th>
                      <th className="pb-3 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.behavior.rows.map((row) => (
                      <tr key={row.code} className="border-b last:border-0">
                        <td className="py-3 pr-4">{row.label}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {row.adjustment}
                        </td>
                        <td className="py-3 font-medium">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ratings Recorded</p>
                  <p className="text-xl font-bold">{profile.behavior.ratingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Adjustment</p>
                  <p className="text-xl font-bold">
                    {profile.behavior.totalAdjustment > 0 ? "+" : ""}
                    {profile.behavior.totalAdjustment}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Behavior Score</p>
                  <p className="text-xl font-bold">
                    {formatPercent(profile.behavior.score)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.behavior.level}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grade Contribution</p>
                  <p className="text-xl font-bold">
                    {profile.behavior.contribution.toFixed(2)} pts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Final Percentage</p>
                  <p className="text-3xl font-bold">
                    {profile.overall.finalPct != null
                      ? formatPercent(profile.overall.finalPct)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Letter Grade</p>
                  <p className="text-3xl font-bold">
                    {profile.overall.letterGrade ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class Rank</p>
                  <p className="text-3xl font-bold">
                    {profile.overall.classRank ?? "—"}
                  </p>
                </div>
              </div>
              {profile.enrollment && (
                <p className="mt-4 text-sm text-muted-foreground">
                  <Link
                    href={`/enrollments/${profile.enrollment.id}`}
                    className="text-primary hover:underline"
                  >
                    View enrollment record →
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
