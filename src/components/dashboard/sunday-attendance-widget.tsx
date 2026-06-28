import { getDashboardAttendanceWidgetData } from "@/lib/attendance/dashboard-attendance-widget";
import { SundayAttendanceWidgetClient } from "@/components/dashboard/sunday-attendance-widget-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";

type SundayAttendanceWidgetProps = {
  schoolIds?: string[];
  showSchoolColumn?: boolean;
  selectedYear?: AcademicYearSummary | null;
  classroomIds?: string[];
};

export async function SundayAttendanceWidget({
  schoolIds,
  showSchoolColumn,
  selectedYear,
  classroomIds,
}: SundayAttendanceWidgetProps) {
  const data = await getDashboardAttendanceWidgetData(
    schoolIds,
    selectedYear,
    classroomIds
  );

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Session Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No schools available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <SundayAttendanceWidgetClient
      data={data}
      showSchoolColumn={showSchoolColumn ?? (data.schools.length > 1)}
    />
  );
}
