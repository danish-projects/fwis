"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteCalendarDay, updateCalendarDay } from "@/actions/calendar";
import { SessionTypeSelect } from "@/components/calendar/session-type-select";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { asSessionType, type SessionType } from "@/lib/setup-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CalendarDayEditFormProps = {
  day: NonNullable<Awaited<ReturnType<typeof import("@/actions/calendar").getCalendarDayById>>>;
};

export function CalendarDayEditForm({ day }: CalendarDayEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>(
    asSessionType(day.sessionType)
  );
  const attendanceNeeded = isAttendanceNeeded(sessionType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const rawLessonPlan = form.get("lessonPlanNumber");
    const lessonPlanNumber =
      attendanceNeeded && rawLessonPlan
        ? Number(rawLessonPlan)
        : null;

    try {
      await updateCalendarDay(day.id, {
        sessionType,
        lessonPlanNumber,
      });
      toast.success("Calendar day updated");
      router.push("/calendar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this calendar day?")) return;
    try {
      await deleteCalendarDay(day.id);
      toast.success("Calendar day deleted");
      router.push("/calendar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/calendar">← Back to calendar</Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Calendar Day</h1>
          <p className="text-muted-foreground">
            {day.academicYear.name} ·{" "}
            {new Date(day.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={day._count.attendance > 0}
        >
          Delete
        </Button>
      </div>

      {day._count.attendance > 0 && (
        <p className="text-sm text-muted-foreground">
          This day has attendance records and cannot be deleted.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  defaultValue={day.lessonPlanNumber ?? undefined}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Displayed as{" "}
                  {formatLessonPlanLabel(day.lessonPlanNumber ?? 1)} on the
                  calendar and attendance screens.
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
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/calendar">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
