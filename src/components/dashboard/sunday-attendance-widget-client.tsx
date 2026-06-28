"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  DashboardAttendanceWidgetData,
  GradeAttendanceCell,
} from "@/lib/attendance/dashboard-attendance-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SundayAttendanceWidgetClientProps = {
  data: DashboardAttendanceWidgetData;
  showSchoolColumn?: boolean;
};

export function SundayAttendanceWidgetClient({
  data,
  showSchoolColumn = true,
}: SundayAttendanceWidgetClientProps) {
  const [sessionKey, setSessionKey] = useState(data.defaultSessionKey);
  const [sectionKey, setSectionKey] = useState(data.defaultSectionKey);

  const sessionMatrix = data.matrix[sessionKey]?.[sectionKey] ?? {};
  const selectedSession = data.sessions.find((s) => s.key === sessionKey);
  const selectedSection = data.sections.find((s) => s.key === sectionKey);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <CardTitle>Today&apos;s Session Attendance</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor="dashboardSession" className="text-sm font-medium">
                Session
              </label>
              <select
                id="dashboardSession"
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                className="h-10 min-w-[280px] rounded-md border border-input bg-background px-3 text-sm"
              >
                {data.sessions.map((session) => (
                  <option key={session.key} value={session.key}>
                    {session.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="dashboardSection" className="text-sm font-medium">
                Section
              </label>
              <select
                id="dashboardSection"
                value={sectionKey}
                onChange={(e) => setSectionKey(e.target.value)}
                className="h-10 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
              >
                {data.sections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(selectedSession?.isAllSessions || selectedSection?.isAllSections) && (
            <p className="text-xs text-muted-foreground">
              {selectedSession?.isAllSessions && selectedSection?.isAllSections
                ? "Totals across all sessions and sections for the active year, by grade."
                : selectedSession?.isAllSessions
                  ? `Totals across all markable sessions for ${selectedSection?.isAllSections ? "both sections" : selectedSection?.label ?? "this section"}, by grade.`
                  : "Boys and Girls combined per grade for the selected session."}
            </p>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/attendance">View attendance</Link>
        </Button>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {data.grades.length === 0 ? (
          <p className="text-muted-foreground">No grade enrollment data available.</p>
        ) : (
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {showSchoolColumn && (
                  <th className="sticky left-0 z-10 bg-background pb-2 pr-4 font-medium">
                    School
                  </th>
                )}
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Students</th>
                {data.grades.map((grade) => (
                  <th key={grade.id} className="pb-2 pr-3 font-medium whitespace-nowrap">
                    {grade.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.schools.map((school) => {
                const gradeCells = sessionMatrix[school.id] ?? {};
                const enrolledCount = data.enrollmentCounts[sectionKey]?.[school.id] ?? 0;
                return (
                  <tr key={school.id} className="border-b last:border-0">
                    {showSchoolColumn && (
                      <td className="sticky left-0 z-10 bg-background py-3 pr-4 font-medium">
                        {school.name}
                      </td>
                    )}
                    <td className="py-3 pr-3 font-medium text-muted-foreground">{enrolledCount}</td>
                    {data.grades.map((grade) => (
                      <td key={grade.id} className="py-3 pr-3 align-top">
                        <AttendanceCell counts={gradeCells[grade.id] ?? emptyCell()} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function emptyCell(): GradeAttendanceCell {
  return { present: 0, absent: 0, tardy: 0 };
}

function AttendanceCell({ counts }: { counts: GradeAttendanceCell }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs leading-tight">
      <span
        className={
          counts.present > 0
            ? "font-semibold text-emerald-600"
            : "text-muted-foreground"
        }
      >
        P {counts.present}
      </span>
      <span
        className={
          counts.absent > 0 ? "font-semibold text-destructive" : "text-muted-foreground"
        }
      >
        A {counts.absent}
      </span>
      <span
        className={
          counts.tardy > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"
        }
      >
        T {counts.tardy}
      </span>
    </div>
  );
}
