"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SchoolOption = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type AcademicYearOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type SchoolBackupFormProps = {
  schools: SchoolOption[];
  academicYears: AcademicYearOption[];
  initialSchoolId: string | null;
  showSchoolPicker: boolean;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function downloadBackupFile(schoolId: string, yearId: string) {
  const response = await fetch(
    `/api/export/school-backup?schoolId=${encodeURIComponent(schoolId)}&yearId=${encodeURIComponent(yearId)}`
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Backup download failed");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match?.[1] ?? "fwis-backup.xlsx";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SchoolBackupForm({
  schools,
  academicYears,
  initialSchoolId,
  showSchoolPicker,
}: SchoolBackupFormProps) {
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? schools[0]?.id ?? "");
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>(() =>
    academicYears.length > 0 ? [academicYears[0].id] : []
  );
  const [pending, startTransition] = useTransition();

  const allSelected =
    academicYears.length > 0 && selectedYearIds.length === academicYears.length;

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === schoolId),
    [schoolId, schools]
  );

  function toggleYear(yearId: string) {
    setSelectedYearIds((current) =>
      current.includes(yearId)
        ? current.filter((id) => id !== yearId)
        : [...current, yearId]
    );
  }

  function toggleSelectAll() {
    setSelectedYearIds(allSelected ? [] : academicYears.map((year) => year.id));
  }

  function handleSchoolChange(nextSchoolId: string) {
    setSchoolId(nextSchoolId);
    window.location.href = `/backup?school=${encodeURIComponent(nextSchoolId)}`;
  }

  function handleDownload() {
    if (!schoolId) {
      toast.error("Select a school first.");
      return;
    }
    if (selectedYearIds.length === 0) {
      toast.error("Select at least one academic year.");
      return;
    }

    startTransition(async () => {
      try {
        for (const yearId of selectedYearIds) {
          await downloadBackupFile(schoolId, yearId);
        }
        toast.success(
          selectedYearIds.length === 1
            ? "Backup downloaded."
            : `${selectedYearIds.length} backup files downloaded.`
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Backup download failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export settings</CardTitle>
        <CardDescription>
          Download Excel backups that match the import template. Each academic year exports as
          its own workbook using student_id references.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showSchoolPicker && (
          <div className="space-y-2">
            <label htmlFor="backup-school" className="text-sm font-medium">
              School
            </label>
            <select
              id="backup-school"
              value={schoolId}
              onChange={(event) => handleSchoolChange(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.city}, {school.state})
                </option>
              ))}
            </select>
          </div>
        )}

        {!showSchoolPicker && selectedSchool && (
          <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">{selectedSchool.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {selectedSchool.city}, {selectedSchool.state}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium">Academic years</label>
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={academicYears.length === 0}
              className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>

          {academicYears.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No academic years found for this school.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {academicYears.map((year) => {
                const checked = selectedYearIds.includes(year.id);
                return (
                  <label
                    key={year.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                      checked && "border-primary bg-primary/5"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleYear(year.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>
                      {year.name}
                      {year.isActive ? " (Active)" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Workbook sheets: School_Setup, Teachers, Students, Attendance, Assessments,
          Calendar_Optional. Student references use student_id (e.g.{" "}
          {selectedSchool ? `${slugify(selectedSchool.city).slice(0, 3).toUpperCase()}-B1` : "HOU-B1"}
          ), not database UUIDs.
        </div>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={pending || !schoolId || selectedYearIds.length === 0}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {selectedYearIds.length <= 1
            ? "Download Excel backup"
            : `Download ${selectedYearIds.length} Excel backups`}
        </Button>
      </CardContent>
    </Card>
  );
}
