"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cloneCalendarToSchools } from "@/actions/calendar";
import { Button } from "@/components/ui/button";

export type CalendarCloneSchoolOption = {
  id: string;
  name: string;
  hasYearLink: boolean;
  hasCalendarDays: boolean;
};

type CalendarCloneProps = {
  academicYearId: string;
  academicYearName: string;
  currentSchoolId: string;
  currentSchoolName: string;
  sourceDayCount: number;
  schools: CalendarCloneSchoolOption[];
};

export function CalendarClone({
  academicYearId,
  academicYearName,
  currentSchoolId,
  currentSchoolName,
  sourceDayCount,
  schools,
}: CalendarCloneProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const targetSchools = useMemo(
    () => schools.filter((school) => school.id !== currentSchoolId),
    [schools, currentSchoolId]
  );

  const selectableIds = useMemo(
    () =>
      targetSchools
        .filter((school) => school.hasYearLink && !school.hasCalendarDays)
        .map((school) => school.id),
    [targetSchools]
  );

  function openDialog() {
    setSelectedSchoolIds(new Set());
    setOpen(true);
  }

  function toggleSchool(schoolId: string, checked: boolean) {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(schoolId);
      else next.delete(schoolId);
      return next;
    });
  }

  function selectAllEligible() {
    setSelectedSchoolIds(new Set(selectableIds));
  }

  function handleClone() {
    const targetSchoolIds = Array.from(selectedSchoolIds);
    if (targetSchoolIds.length === 0) {
      toast.error("Select at least one school");
      return;
    }
    startTransition(async () => {
      try {
        const result = await cloneCalendarToSchools({
          academicYearId,
          targetSchoolIds,
        });
        toast.success(
          `Cloned ${result.dayCount} day(s) to ${result.schools.length} school(s)`
        );
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Clone failed");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openDialog}
        disabled={sourceDayCount === 0}
        title={
          sourceDayCount === 0
            ? "Generate a calendar for this school first"
            : undefined
        }
      >
        Clone Calendar
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-clone-title"
              className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border bg-background shadow-lg"
            >
              <div className="border-b px-5 py-4">
                <h2 id="calendar-clone-title" className="text-lg font-semibold">
                  Clone Calendar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy {sourceDayCount} day(s) from {currentSchoolName} (
                  {academicYearName}) to other schools. Targets that already have
                  calendar days are blocked.
                </p>
              </div>

              <div className="space-y-3 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Schools ({targetSchools.length})
                  </p>
                  {selectableIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllEligible}
                    >
                      Select all eligible
                    </Button>
                  )}
                </div>

                {targetSchools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No other schools are available.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {targetSchools.map((school) => {
                      const disabled =
                        !school.hasYearLink || school.hasCalendarDays;
                      const checked = selectedSchoolIds.has(school.id);
                      let reason = "";
                      if (!school.hasYearLink) reason = "Year not linked";
                      else if (school.hasCalendarDays)
                        reason = "Already has calendar days";

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
                            disabled={disabled}
                            onChange={(e) =>
                              toggleSchool(school.id, e.target.checked)
                            }
                          />
                          <span>
                            <span className="font-medium">{school.name}</span>
                            {reason && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {reason}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
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
                  disabled={pending || selectedSchoolIds.size === 0}
                  onClick={handleClone}
                >
                  {pending ? "Cloning..." : "Clone"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
