"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEligibleStudentsForEnrollment } from "@/actions/enrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EnrollmentInput } from "@/lib/validations/enrollment";

type FormOptions = Awaited<
  ReturnType<typeof import("@/actions/enrollments").getEnrollmentFormOptions>
>;

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type EnrollmentFormProps = {
  options: FormOptions;
  defaultValues?: Partial<EnrollmentInput>;
  preferredStudentId?: string;
  onSubmit: (data: EnrollmentInput) => Promise<void>;
  submitLabel: string;
  cancelHref: string;
};

function pickDefaultSchoolId(options: FormOptions, preferred?: string) {
  if (preferred && options.schools.some((school) => school.id === preferred)) {
    return preferred;
  }
  if (options.schools.length === 1) {
    return options.schools[0].id;
  }
  return "";
}

function pickDefaultYearId(options: FormOptions, schoolId: string) {
  const years = options.academicYears.filter((year) => year.schoolId === schoolId);
  const activeYear = years.find((year) => year.isActive);
  if (activeYear) return activeYear.id;
  if (years.length === 1) return years[0].id;
  return "";
}

export function EnrollmentForm({
  options,
  defaultValues,
  preferredStudentId,
  onSubmit,
  submitLabel,
  cancelHref,
}: EnrollmentFormProps) {
  const initialSchoolId =
    defaultValues?.schoolId ?? pickDefaultSchoolId(options);
  const initialYearId =
    defaultValues?.academicYearId ??
    (initialSchoolId ? pickDefaultYearId(options, initialSchoolId) : "");

  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [academicYearId, setAcademicYearId] = useState(initialYearId);
  const [classroomId, setClassroomId] = useState(defaultValues?.classroomId ?? "");
  const [teacherId, setTeacherId] = useState(defaultValues?.teacherId ?? "");
  const [studentId, setStudentId] = useState(
    defaultValues?.studentId ?? preferredStudentId ?? ""
  );
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null);

  const filteredYears = useMemo(
    () =>
      schoolId
        ? options.academicYears.filter((year) => year.schoolId === schoolId)
        : options.academicYears,
    [options.academicYears, schoolId]
  );

  const filteredClassrooms = useMemo(
    () =>
      schoolId
        ? options.classrooms.filter((classroom) => classroom.schoolId === schoolId)
        : options.classrooms,
    [options.classrooms, schoolId]
  );

  const filteredTeachers = useMemo(() => {
    const matchesGrade = options.teachers.filter((teacher) => {
      if (schoolId && teacher.schoolId !== schoolId) return false;
      if (classroomId) return teacher.classroomId === classroomId;
      return true;
    });

    const keepTeacherId = teacherId || defaultValues?.teacherId;
    if (
      keepTeacherId &&
      !matchesGrade.some((teacher) => teacher.id === keepTeacherId)
    ) {
      const assigned = options.teachers.find((teacher) => teacher.id === keepTeacherId);
      if (assigned && (!schoolId || assigned.schoolId === schoolId)) {
        return [...matchesGrade, assigned].sort(
          (a, b) =>
            a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
        );
      }
    }

    return matchesGrade;
  }, [options.teachers, schoolId, classroomId, teacherId, defaultValues?.teacherId]);

  useEffect(() => {
    if (teacherId && !filteredTeachers.some((teacher) => teacher.id === teacherId)) {
      setTeacherId("");
    } else if (
      !teacherId &&
      filteredTeachers.length === 1 &&
      classroomId
    ) {
      setTeacherId(filteredTeachers[0].id);
    }
  }, [filteredTeachers, teacherId, classroomId]);

  useEffect(() => {
    if (!schoolId || !academicYearId) {
      setStudents([]);
      setStudentLoadError(null);
      if (!defaultValues?.studentId) setStudentId("");
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);
    setStudentLoadError(null);

    getEligibleStudentsForEnrollment(
      schoolId,
      academicYearId,
      defaultValues?.studentId ?? preferredStudentId
    )
      .then((eligible) => {
        if (cancelled) return;
        setStudents(eligible);
        const preferredId = defaultValues?.studentId ?? preferredStudentId;
        setStudentId((current) => {
          if (current && eligible.some((student) => student.id === current)) {
            return current;
          }
          return preferredId && eligible.some((student) => student.id === preferredId)
            ? preferredId
            : "";
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setStudents([]);
        setStudentId("");
        setStudentLoadError(
          error instanceof Error ? error.message : "Failed to load students"
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, academicYearId, defaultValues?.studentId, preferredStudentId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSubmit({
      studentId: form.get("studentId") as string,
      schoolId: form.get("schoolId") as string,
      academicYearId: form.get("academicYearId") as string,
      classroomId: form.get("classroomId") as string,
      teacherId: (form.get("teacherId") as string) || "",
      enrollmentDate: (form.get("enrollmentDate") as string) || undefined,
      status: form.get("status") as EnrollmentInput["status"],
    });
  }

  const enrollDate = defaultValues?.enrollmentDate
    ? String(defaultValues.enrollmentDate).slice(0, 10)
    : "";

  const studentPlaceholder = !schoolId || !academicYearId
    ? "Select school and academic year first"
    : loadingStudents
      ? "Loading students..."
      : students.length === 0
        ? "No eligible students for this school and year"
        : "Select student";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schoolId">School *</Label>
        <select
          id="schoolId"
          name="schoolId"
          required
          value={schoolId}
          onChange={(e) => {
            const nextSchoolId = e.target.value;
            setSchoolId(nextSchoolId);
            setAcademicYearId(nextSchoolId ? pickDefaultYearId(options, nextSchoolId) : "");
            setClassroomId("");
            setTeacherId("");
            setStudentId("");
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select school</option>
          {options.schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="academicYearId">Academic Year *</Label>
        <select
          id="academicYearId"
          name="academicYearId"
          required
          value={academicYearId}
          disabled={!schoolId}
          onChange={(e) => {
            setAcademicYearId(e.target.value);
            setStudentId("");
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select year</option>
          {filteredYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label} {y.isActive ? "(Active)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="studentId">Student *</Label>
        <select
          id="studentId"
          name="studentId"
          required
          value={studentId}
          disabled={!schoolId || !academicYearId || loadingStudents}
          onChange={(e) => setStudentId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{studentPlaceholder}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
        {studentLoadError && (
          <p className="text-sm text-destructive">{studentLoadError}</p>
        )}
        {schoolId && academicYearId && !loadingStudents && students.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Only students not already enrolled for this school and year are shown.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="classroomId">Grade *</Label>
        <select
          id="classroomId"
          name="classroomId"
          required
          value={classroomId}
          disabled={!schoolId}
          onChange={(e) => {
            setClassroomId(e.target.value);
            setTeacherId("");
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select grade</option>
          {filteredClassrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacherId">Teacher</Label>
        <select
          id="teacherId"
          name="teacherId"
          value={teacherId}
          disabled={!classroomId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {!classroomId
              ? "Select grade first"
              : filteredTeachers.length === 0
                ? "No teacher assigned to this grade"
                : "None assigned"}
          </option>
          {filteredTeachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="enrollmentDate">Enrollment Date</Label>
          <Input id="enrollmentDate" name="enrollmentDate" type="date" defaultValue={enrollDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "ACTIVE"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ACTIVE">Active</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="GRADUATED">Graduated</option>
            <option value="PROMOTED">Promoted</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
