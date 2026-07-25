"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { bulkGenerateCalendarDays } from "@/actions/calendar";
import { SessionTypeSelect } from "@/components/calendar/session-type-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { formatDate } from "@/lib/utils";
import type { SessionType } from "@/lib/setup-types";

export type CalendarGenerateSchoolOption = {
  id: string;
  name: string;
  hasYearLink: boolean;
};

export type CalendarGenerateDayDraft = {
  date: string;
  sessionType: SessionType;
  lessonPlanNumber: number | null;
};

type CalendarBulkGenerateProps = {
  academicYearId: string;
  academicYearName: string;
  startDate: string;
  endDate: string;
  currentSchoolId: string;
  schools: CalendarGenerateSchoolOption[];
  previewDays: CalendarGenerateDayDraft[];
  holidayCount?: number;
};

export function CalendarBulkGenerate({
  academicYearId,
  academicYearName,
  startDate,
  endDate,
  currentSchoolId,
  schools,
  previewDays,
  holidayCount = 0,
}: CalendarBulkGenerateProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState<CalendarGenerateDayDraft[]>(previewDays);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(
    () => new Set([currentSchoolId])
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const linkedSchools = useMemo(
    () => schools.filter((school) => school.hasYearLink),
    [schools]
  );

  function openDialog() {
    setDays(previewDays.map((day) => ({ ...day })));
    setSelectedSchoolIds(new Set([currentSchoolId]));
    setOpen(true);
  }

  function updateDay(
    index: number,
    patch: Partial<CalendarGenerateDayDraft>
  ) {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== index) return day;
        const next = { ...day, ...patch };
        if (patch.sessionType !== undefined) {
          if (!isAttendanceNeeded(patch.sessionType)) {
            next.lessonPlanNumber = null;
          } else if (next.lessonPlanNumber == null) {
            const maxWeek = Math.max(
              0,
              ...prev.map((d, j) =>
                j === index ? 0 : (d.lessonPlanNumber ?? 0)
              )
            );
            next.lessonPlanNumber = maxWeek + 1;
          }
        }
        return next;
      })
    );
  }

  function toggleSchool(schoolId: string, checked: boolean) {
    if (schoolId === currentSchoolId) return;
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(schoolId);
      else next.delete(schoolId);
      next.add(currentSchoolId);
      return next;
    });
  }

  function handleGenerate() {
    const schoolIds = Array.from(selectedSchoolIds);
    startTransition(async () => {
      try {
        const result = await bulkGenerateCalendarDays({
          academicYearId,
          schoolIds,
          days: days.map((day) => ({
            date: day.date,
            sessionType: day.sessionType,
            lessonPlanNumber: day.lessonPlanNumber,
          })),
        });
        const schoolSummary =
          result.schools.length > 1
            ? ` across ${result.schools.length} schools`
            : "";
        toast.success(
          `Generated ${result.created} day(s)${schoolSummary}${
            result.skipped ? ` (${result.skipped} already existed)` : ""
          }`
        );
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Generation failed");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={openDialog}>
        Generate Sundays
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-generate-title"
              className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border bg-background shadow-lg"
            >
              <div className="border-b px-5 py-4">
                <h2
                  id="calendar-generate-title"
                  className="text-lg font-semibold"
                >
                  Generate Sundays
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {academicYearName} · {formatDate(startDate)} –{" "}
                  {formatDate(endDate)}. Existing dates are skipped
                  {holidayCount > 0
                    ? ` · ${holidayCount} holiday Sunday(s) pre-marked`
                    : ""}
                  .
                </p>
              </div>

              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Schools</p>
                  <p className="text-xs text-muted-foreground">
                    Current school is always included. Schools without this
                    academic year are disabled.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {schools.map((school) => {
                      const disabled = !school.hasYearLink;
                      const isCurrent = school.id === currentSchoolId;
                      const checked =
                        selectedSchoolIds.has(school.id) || isCurrent;
                      return (
                        <label
                          key={school.id}
                          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded"
                            checked={checked}
                            disabled={disabled || isCurrent}
                            onChange={(e) =>
                              toggleSchool(school.id, e.target.checked)
                            }
                          />
                          <span>
                            <span className="font-medium">{school.name}</span>
                            {isCurrent && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (current)
                              </span>
                            )}
                            {disabled && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Year not linked
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {linkedSchools.length === 0 && (
                    <p className="text-sm text-destructive">
                      No schools are linked to this academic year.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Sundays ({days.length})
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDays(previewDays.map((day) => ({ ...day })))
                      }
                    >
                      Reset defaults
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 font-medium">#</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Session type</th>
                          <th className="px-3 py-2 font-medium">Week #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day, index) => {
                          const needsWeek = isAttendanceNeeded(day.sessionType);
                          return (
                            <tr key={`${day.date}-${index}`} className="border-b">
                              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2">
                                <Label className="sr-only" htmlFor={`date-${index}`}>
                                  Date {index + 1}
                                </Label>
                                <Input
                                  id={`date-${index}`}
                                  type="date"
                                  value={day.date}
                                  min={startDate}
                                  max={endDate}
                                  onChange={(e) =>
                                    updateDay(index, { date: e.target.value })
                                  }
                                  className="h-9"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <SessionTypeSelect
                                  id={`session-${index}`}
                                  value={day.sessionType}
                                  onChange={(sessionType) =>
                                    updateDay(index, { sessionType })
                                  }
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Label className="sr-only" htmlFor={`week-${index}`}>
                                  Week {index + 1}
                                </Label>
                                <Input
                                  id={`week-${index}`}
                                  type="number"
                                  min={1}
                                  disabled={!needsWeek}
                                  value={day.lessonPlanNumber ?? ""}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    updateDay(index, {
                                      lessonPlanNumber:
                                        raw === ""
                                          ? null
                                          : Number.parseInt(raw, 10),
                                    });
                                  }}
                                  placeholder={needsWeek ? "Week" : "—"}
                                  className="h-9 w-24"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending || days.length === 0}
                  onClick={handleGenerate}
                >
                  {pending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
