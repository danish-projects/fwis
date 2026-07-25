"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { asSessionType } from "@/lib/setup-types";
import { formatDate } from "@/lib/utils";

export type CalendarDayRow = {
  id: string;
  date: string;
  lessonPlanNumber: number | null;
  sessionType: string;
  attendanceCount: number;
  /** From academic year holidays when session type is HOLIDAY. */
  holidayName?: string | null;
};

type CalendarDaysTableProps = {
  days: CalendarDayRow[];
  canUpdate: boolean;
};

export function CalendarDaysTable({ days, canUpdate }: CalendarDaysTableProps) {
  const [sessionTypeFilter, setSessionTypeFilter] = useState("");

  const filteredDays = useMemo(() => {
    if (!sessionTypeFilter) return days;
    return days.filter((day) => day.sessionType === sessionTypeFilter);
  }, [days, sessionTypeFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <label
              htmlFor="calendar-session-type-filter"
              className="text-xs font-medium text-muted-foreground"
            >
              Session Type
            </label>
            <select
              id="calendar-session-type-filter"
              value={sessionTypeFilter}
              onChange={(e) => setSessionTypeFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All session types</option>
              {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Lesson Plan</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Session Type</th>
                <th className="pb-3 pr-4 font-medium">Holiday / Notes</th>
                <th className="pb-3 pr-4 font-medium">Attendance Needed</th>
                <th className="pb-3 pr-4 font-medium">Records</th>
                {canUpdate && <th className="pb-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDays.map((day) => {
                const attendanceNeeded = isAttendanceNeeded(day.sessionType);
                const holidayLabel =
                  day.sessionType === "HOLIDAY"
                    ? day.holidayName?.trim() || null
                    : null;

                return (
                  <tr key={day.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {formatLessonPlanLabel(day.lessonPlanNumber)}
                    </td>
                    <td className="py-3 pr-4">{formatDate(day.date)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">
                        {SESSION_TYPE_LABELS[asSessionType(day.sessionType)]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {holidayLabel ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={attendanceNeeded ? "success" : "secondary"}>
                        {attendanceNeeded ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {day.attendanceCount} record(s)
                    </td>
                    {canUpdate && (
                      <td className="py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/calendar/${day.id}/edit`}>Edit</Link>
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredDays.length === 0 && (
                <tr>
                  <td
                    colSpan={canUpdate ? 7 : 6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {sessionTypeFilter
                      ? "No calendar days match this session type."
                      : 'No calendar days yet. Use "Add Day" or "Generate Sundays" to create them.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
