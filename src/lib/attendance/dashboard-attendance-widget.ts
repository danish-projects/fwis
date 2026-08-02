import type { AttendanceStatus } from "@/lib/setup-types";
import { asAttendanceStatus, asSessionType } from "@/lib/setup-types";
import { prisma } from "@/lib/prisma";
import { ATTENDANCE_MARKABLE_SESSION_TYPES } from "@/lib/grades/attendance-percentage";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { selectDefaultCalendarDayId } from "@/lib/calendar/select-default-day";
import { calendarDateKey } from "@/lib/calendar/calendar-date";
import { formatDate } from "@/lib/utils";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";
import { resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";

export type GradeAttendanceCell = {
  present: number;
  absent: number;
  tardy: number;
};

export type DashboardSessionOption = {
  key: string;
  label: string;
  isAllSessions: boolean;
};

export type DashboardSectionOption = {
  key: string;
  label: string;
  isAllSections: boolean;
};

export type DashboardAttendanceWidgetData = {
  sessions: DashboardSessionOption[];
  defaultSessionKey: string;
  sections: DashboardSectionOption[];
  defaultSectionKey: string;
  grades: Array<{ id: number; name: string }>;
  schools: Array<{ id: string; name: string }>;
  /** sectionKey → schoolId → active enrollment count */
  enrollmentCounts: Record<string, Record<string, number>>;
  /** sessionKey → sectionKey → schoolId → gradeId → counts */
  matrix: Record<string, Record<string, Record<string, Record<number, GradeAttendanceCell>>>>;
};

const ALL_SESSIONS_KEY = "all";
const ALL_SECTIONS_KEY = "all";

function emptyCell(): GradeAttendanceCell {
  return { present: 0, absent: 0, tardy: 0 };
}

function addStatus(cell: GradeAttendanceCell, status: AttendanceStatus) {
  if (status === "PRESENT") cell.present++;
  else if (status === "ABSENT") cell.absent++;
  else if (status === "TARDY") cell.tardy++;
}

export async function getDashboardAttendanceWidgetData(
  schoolIds?: string[],
  selectedYear?: AcademicYearSummary | null,
  classroomIds?: string[]
): Promise<DashboardAttendanceWidgetData | null> {
  const schools = await prisma.school.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(schoolIds?.length ? { id: { in: schoolIds } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (schools.length === 0) return null;

  const schoolContexts = await Promise.all(
    schools.map(async (school) => {
      const activeYear = await resolveAcademicYearForSchool(
        school.id,
        selectedYear ?? null
      );

      if (!activeYear) {
        return {
          school,
          activeYear: null,
          calendarDays: [],
          enrollments: [],
        };
      }

      const calendarDays = await prisma.academicCalendarDay.findMany({
        where: {
          academicYearSchoolId: activeYear.id,
          deletedAt: null,
          sessionType: { in: ATTENDANCE_MARKABLE_SESSION_TYPES },
        },
        orderBy: { date: "asc" },
      });

      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          schoolId: school.id,
          academicYearSchoolId: activeYear.id,
          status: "ACTIVE",
          deletedAt: null,
          ...(classroomIds?.length ? { classroomId: { in: classroomIds } } : {}),
        },
        select: {
          id: true,
          classroom: {
            select: {
              gradeId: true,
              sectionId: true,
              grade: { select: { id: true, name: true, sortOrder: true } },
              section: { select: { id: true, name: true } },
            },
          },
          attendance: {
            where: { deletedAt: null },
            select: {
              status: true,
              calendarDayId: true,
            },
          },
        },
      });

      return {
        school,
        activeYear,
        calendarDays,
        enrollments,
      };
    })
  );

  const grades = await prisma.grade.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true },
  });

  const dbSections = await prisma.section.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const visibleSections =
    classroomIds?.length && classroomIds.length > 0
      ? dbSections.filter((section) =>
          schoolContexts.some((ctx) =>
            ctx.enrollments.some(
              (e) => e.classroom.section.id === section.id
            )
          )
        )
      : dbSections;

  const includesAllSections = visibleSections.length > 1;

  const sections: DashboardSectionOption[] = [
    ...(includesAllSections
      ? [{ key: ALL_SECTIONS_KEY, label: "All Sections", isAllSections: true }]
      : []),
    ...visibleSections.map((section) => ({
      key: String(section.id),
      label: section.name,
      isAllSections: false,
    })),
  ];

  const sectionKeys = sections.map((s) => s.key);
  const defaultSectionKey = includesAllSections
    ? ALL_SECTIONS_KEY
    : (sectionKeys[0] ?? ALL_SECTIONS_KEY);

  const sessionMap = new Map<
    string,
    { sessionKey: string; sortOrder: number; date: Date; label: string }
  >();
  /** Maps each school's calendar day id → shared session key (date). */
  const dayIdToSessionKey = new Map<string, string>();

  for (const ctx of schoolContexts) {
    for (const day of ctx.calendarDays) {
      const sessionKey = calendarDateKey(day.date);
      dayIdToSessionKey.set(day.id, sessionKey);
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          sessionKey,
          sortOrder: day.lessonPlanNumber ?? Number.MAX_SAFE_INTEGER,
          date: day.date,
          label: `${formatLessonPlanLabel(day.lessonPlanNumber)} — ${formatDate(day.date)} · ${SESSION_TYPE_LABELS[asSessionType(day.sessionType)]}`,
        });
      }
    }
  }

  const orderedSessions = [...sessionMap.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.sortOrder - b.sortOrder
  );

  let defaultSessionKey = orderedSessions[0]?.sessionKey;
  const referenceDays = schoolContexts.find((c) => c.calendarDays.length > 0)?.calendarDays ?? [];
  if (referenceDays.length > 0) {
    const defaultId = selectDefaultCalendarDayId(referenceDays);
    if (defaultId) {
      defaultSessionKey = dayIdToSessionKey.get(defaultId) ?? defaultSessionKey;
    }
  }

  const sessions: DashboardSessionOption[] = [
    { key: ALL_SESSIONS_KEY, label: "All Sessions", isAllSessions: true },
    ...orderedSessions.map((s) => ({
      key: s.sessionKey,
      label: s.label,
      isAllSessions: false,
    })),
  ];

  const defaultSessionKeyResolved = defaultSessionKey ?? ALL_SESSIONS_KEY;

  const sessionKeys = [
    ALL_SESSIONS_KEY,
    ...orderedSessions.map((s) => s.sessionKey),
  ];

  const matrix: DashboardAttendanceWidgetData["matrix"] = {};
  for (const sk of sessionKeys) {
    matrix[sk] = {};
    for (const secKey of sectionKeys) {
      matrix[sk][secKey] = {};
    }
  }

  function initSchoolGradeCells(sessionKey: string, sectionKey: string, schoolId: string) {
    if (!matrix[sessionKey][sectionKey][schoolId]) {
      matrix[sessionKey][sectionKey][schoolId] = {};
    }
    for (const grade of grades) {
      matrix[sessionKey][sectionKey][schoolId][grade.id] = emptyCell();
    }
  }

  const enrollmentCounts: DashboardAttendanceWidgetData["enrollmentCounts"] = {};
  for (const secKey of sectionKeys) {
    enrollmentCounts[secKey] = {};
    for (const school of schools) {
      enrollmentCounts[secKey][school.id] = 0;
    }
  }

  for (const ctx of schoolContexts) {
    const schoolId = ctx.school.id;
    const markableDayIds = new Set(ctx.calendarDays.map((d) => d.id));

    for (const sessionKey of sessionKeys) {
      for (const sectionKey of sectionKeys) {
        initSchoolGradeCells(sessionKey, sectionKey, schoolId);
      }
    }

    for (const enrollment of ctx.enrollments) {
      const gradeId = enrollment.classroom.gradeId;
      const sectionId = String(enrollment.classroom.sectionId);
      const targetSectionKeys = sectionKeys.filter(
        (key) => key === ALL_SECTIONS_KEY || key === sectionId
      );

      for (const key of targetSectionKeys) {
        enrollmentCounts[key][schoolId]++;
      }

      for (const record of enrollment.attendance) {
        if (!markableDayIds.has(record.calendarDayId)) continue;

        const dateSessionKey = dayIdToSessionKey.get(record.calendarDayId);
        if (!dateSessionKey) continue;

        const sessionKeysForRecord = [ALL_SESSIONS_KEY, dateSessionKey];

        for (const sessionKey of sessionKeysForRecord) {
          for (const sectionKey of targetSectionKeys) {
            const cell = matrix[sessionKey]?.[sectionKey]?.[schoolId]?.[gradeId];
            if (cell) addStatus(cell, asAttendanceStatus(record.status));
          }
        }
      }
    }
  }

  return {
    sessions,
    defaultSessionKey: defaultSessionKeyResolved,
    sections,
    defaultSectionKey,
    grades,
    schools: schools.map((s) => ({ id: s.id, name: s.name })),
    enrollmentCounts,
    matrix,
  };
}

/** @deprecated Use getDashboardAttendanceWidgetData */
export async function getSchoolSundayAttendanceStats(schoolIds?: string[]) {
  const data = await getDashboardAttendanceWidgetData(schoolIds);
  if (!data) return [];

  const sessionKey = data.defaultSessionKey;
  return data.schools.map((school) => {
    const schoolMatrix = data.matrix[sessionKey]?.[data.defaultSectionKey]?.[school.id] ?? {};
    let present = 0;
    let absent = 0;
    let tardy = 0;
    for (const cell of Object.values(schoolMatrix)) {
      present += cell.present;
      absent += cell.absent;
      tardy += cell.tardy;
    }
    const session = data.sessions.find((s) => s.key === sessionKey);
    return {
      schoolId: school.id,
      schoolName: school.name,
      calendarDay: session?.isAllSessions
        ? null
        : {
            id: sessionKey,
            date: sessionKey !== ALL_SESSIONS_KEY ? new Date(`${sessionKey}T00:00:00.000Z`) : new Date(),
            lessonPlanNumber: null,
            sessionType: "INSTRUCTIONAL" as const,
          },
      present,
      absent,
      tardy,
      unmarked: 0,
      totalStudents: 0,
    };
  });
}
