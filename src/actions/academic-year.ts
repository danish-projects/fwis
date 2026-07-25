"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { ACADEMIC_YEAR_COOKIE } from "@/lib/academic-year/constants";
import { canSwitchAcademicYear } from "@/lib/academic-year/can-switch-year";
import { resolveSelectedAcademicYear } from "@/lib/academic-year/resolve-year";
import { appCookieOptions } from "@/lib/security/cookie-options";

async function writeAcademicYearCookie(academicYearId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    ACADEMIC_YEAR_COOKIE,
    academicYearId,
    appCookieOptions({ maxAge: 60 * 60 * 24 * 365 })
  );
}

export async function ensureAcademicYearCookie(academicYearId: string) {
  const user = await requireUser();
  if (!canSwitchAcademicYear(user.roles)) {
    // Still persist current year for cookie sync, but ignore any prior selection.
    const current = await resolveSelectedAcademicYear(user, null);
    if (!current) {
      throw new Error("No current academic year available");
    }
    await writeAcademicYearCookie(current.id);
    return { success: true, skipped: false as const, academicYearId: current.id };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(ACADEMIC_YEAR_COOKIE)?.value) {
    return { success: true, skipped: true as const };
  }

  const resolved = await resolveSelectedAcademicYear(user, academicYearId);
  if (!resolved) {
    throw new Error("Invalid academic year selection");
  }

  await writeAcademicYearCookie(resolved.id);
  return { success: true, skipped: false as const, academicYearId: resolved.id };
}

export async function setSelectedAcademicYear(academicYearId: string) {
  const user = await requireUser();
  if (!canSwitchAcademicYear(user.roles)) {
    throw new Error("Teachers and substitutes cannot switch academic years");
  }

  const resolved = await resolveSelectedAcademicYear(user, academicYearId);
  if (!resolved) {
    throw new Error("Invalid academic year selection");
  }

  await writeAcademicYearCookie(resolved.id);

  revalidatePath("/", "layout");
  return { success: true, academicYearId: resolved.id };
}
