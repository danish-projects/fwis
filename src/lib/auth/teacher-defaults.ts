"use server";

import { redirect } from "next/navigation";
import { getSessionUser, type AuthUser } from "@/lib/auth/session";
import { getPrimaryRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { selectDefaultCalendarDayId } from "@/lib/calendar/select-default-day";
import { ATTENDANCE_MARKABLE_SESSION_TYPES } from "@/lib/grades/attendance-percentage";
import {
  getSelectedAcademicYear,
  resolveAcademicYearForSchool,
} from "@/lib/academic-year/resolve-year";

export async function getTeacherPrimaryClassroomId(
  user: AuthUser
): Promise<string | null> {
  if (!user.roles.includes("TEACHER") || user.classroomIds.length === 0) {
    return null;
  }
  const classrooms = await prisma.classroom.findMany({
    where: { id: { in: user.classroomIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, school: { select: { name: true } } },
  });
  return classrooms[0]?.id ?? null;
}

export async function getTeacherClassrooms(user: AuthUser) {
  if (!user.roles.includes("TEACHER")) return [];
  return prisma.classroom.findMany({
    where: { id: { in: user.classroomIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    include: { school: { select: { name: true } } },
  });
}

export async function getDefaultAttendanceDayId(
  classroomId: string
): Promise<string | undefined> {
  const user = await getSessionUser();
  const selectedYear = user ? await getSelectedAcademicYear(user) : null;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { schoolId: true },
  });
  if (!classroom) return undefined;

  const activeYear = await resolveAcademicYearForSchool(
    classroom.schoolId,
    selectedYear
  );
  if (!activeYear) return undefined;

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: {
      academicYearId: activeYear.id,
      deletedAt: null,
      sessionType: { in: ATTENDANCE_MARKABLE_SESSION_TYPES },
    },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });

  return selectDefaultCalendarDayId(calendarDays);
}

export async function redirectTeacherToAttendance() {
  const user = await getSessionUser();
  if (!user || getPrimaryRole(user.roles) !== "TEACHER") return;

  const classroomId = await getTeacherPrimaryClassroomId(user);
  if (!classroomId) return;

  const dayId = await getDefaultAttendanceDayId(classroomId);
  redirect(`/teacher/attendance/${classroomId}${dayId ? `?day=${dayId}` : ""}`);
}

export async function redirectTeacherToAssessments() {
  const user = await getSessionUser();
  if (!user || getPrimaryRole(user.roles) !== "TEACHER") return;

  const classroomId = await getTeacherPrimaryClassroomId(user);
  if (!classroomId) return;

  redirect(`/teacher/assessments/${classroomId}`);
}
