import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getSelectedAcademicYear } from "@/lib/academic-year/resolve-year";
import { DashboardCalendarHighlights } from "@/components/dashboard/dashboard-calendar-highlights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Reports Dashboard" };

export default async function ReadOnlyDashboardPage() {
  const user = await requireRole("READ_ONLY");
  const selectedYear = await getSelectedAcademicYear(user);
  const schoolId = user.schoolIds[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Reports & Statistics</h1>
        <p className="text-muted-foreground">Read-only access to school reports</p>
      </div>

      {schoolId && (
        <DashboardCalendarHighlights
          schoolId={schoolId}
          selectedYear={selectedYear}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grade Performance Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              View and export grade-level performance by school, year, grade, and section.
            </p>
            <Button asChild>
              <Link href="/reports/grade-performance">View Report</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student Report Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Individual student report with attendance, behavior, and assessment scores.
            </p>
            <Button asChild>
              <Link href="/reports/student-report-card">View Report</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
