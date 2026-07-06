"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createCalendarDay } from "@/actions/calendar";
import { SessionTypeSelect } from "@/components/calendar/session-type-select";
import { calendarDateKey } from "@/lib/calendar/calendar-date";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import type { SessionType } from "@/lib/setup-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CalendarDayCreateFormProps = {
  academicYearSchoolId: string;
  academicYearName: string;
  schoolName: string;
  startDate: string;
  endDate: string;
  calendarHref: string;
};

export function CalendarDayCreateForm({
  academicYearSchoolId,
  academicYearName,
  schoolName,
  startDate,
  endDate,
  calendarHref,
}: CalendarDayCreateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("INSTRUCTIONAL");
  const attendanceNeeded = isAttendanceNeeded(sessionType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const rawLessonPlan = form.get("lessonPlanNumber");
    const lessonPlanNumber =
      attendanceNeeded && rawLessonPlan ? Number(rawLessonPlan) : null;

    try {
      await createCalendarDay({
        academicYearSchoolId,
        date: String(form.get("date")),
        sessionType,
        lessonPlanNumber,
      });
      toast.success("Calendar day created");
      router.push(calendarHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={calendarHref}>← Back to calendar</Link>
        </Button>
        <h1 className="text-2xl font-bold">Add Calendar Day</h1>
        <p className="text-muted-foreground">
          {academicYearName} · {schoolName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                min={calendarDateKey(startDate)}
                max={calendarDateKey(endDate)}
              />
              <p className="text-xs text-muted-foreground">
                Must be within the academic year ({calendarDateKey(startDate)} –{" "}
                {calendarDateKey(endDate)}). Each date can only have one session
                type.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type</Label>
              <SessionTypeSelect
                name="sessionType"
                defaultValue={sessionType}
                onChange={setSessionType}
              />
            </div>

            <div className="space-y-2">
              <Label>Attendance Needed</Label>
              <Badge variant={attendanceNeeded ? "success" : "secondary"}>
                {attendanceNeeded ? "Yes" : "No"}
              </Badge>
            </div>

            {attendanceNeeded ? (
              <div className="space-y-2">
                <Label htmlFor="lessonPlanNumber">Lesson Plan Number *</Label>
                <Input
                  id="lessonPlanNumber"
                  name="lessonPlanNumber"
                  type="number"
                  min={1}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Displayed as {formatLessonPlanLabel(1)} on the calendar and
                  attendance screens.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Lesson plan numbers apply only to session types that require
                attendance.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Add Day"}
              </Button>
              <Button asChild variant="outline">
                <Link href={calendarHref}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
