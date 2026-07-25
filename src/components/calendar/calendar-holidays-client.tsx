"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createAcademicYearHoliday,
  deleteAcademicYearHoliday,
} from "@/actions/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

export type HolidayListItem = {
  id: string;
  date: string;
  name: string | null;
};

type CalendarHolidaysClientProps = {
  academicYearId: string;
  academicYearName: string;
  startDate: string;
  endDate: string;
  initialHolidays: HolidayListItem[];
};

export function CalendarHolidaysClient({
  academicYearId,
  academicYearName,
  startDate,
  endDate,
  initialHolidays,
}: CalendarHolidaysClientProps) {
  const router = useRouter();
  const [holidays, setHolidays] = useState(initialHolidays);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const holiday = await createAcademicYearHoliday({
        academicYearId,
        date: String(data.get("date")),
        name: (data.get("name") as string) || "",
      });
      setHolidays((prev) =>
        [...prev, holiday].sort((a, b) => a.date.localeCompare(b.date))
      );
      toast.success("Holiday added");
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add holiday");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this holiday?")) return;
    setDeletingId(id);
    try {
      await deleteAcademicYearHoliday(id);
      setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
      toast.success("Holiday removed");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove holiday"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/calendar">← Back to calendar</Link>
        </Button>
        <h1 className="text-2xl font-bold">Add Holidays</h1>
        <p className="text-muted-foreground">
          {academicYearName} · shared across all schools for this year
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Holiday Sunday</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  min={startDate}
                  max={endDate}
                />
                <p className="text-xs text-muted-foreground">
                  Must be a Sunday within {startDate} – {endDate}.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Eid al-Fitr"
                  maxLength={120}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              When you Generate Sundays, these dates become Holiday session types
              and do not receive a week number — the next Sunday continues the
              sequence.
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Holiday"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holidays ({holidays.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No holidays yet. Add Sunday dates before generating the calendar.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {holidays.map((holiday) => (
                <li
                  key={holiday.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{formatDate(holiday.date)}</p>
                    <p className="text-muted-foreground">
                      {holiday.name || "Holiday"} · {holiday.date}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deletingId === holiday.id}
                    onClick={() => handleDelete(holiday.id)}
                  >
                    {deletingId === holiday.id ? "Removing..." : "Remove"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
