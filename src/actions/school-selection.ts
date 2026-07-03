"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { SCHOOL_COOKIE } from "@/lib/school/constants";
import { resolveSelectedSchool } from "@/lib/school/resolve-school";
import { appCookieOptions } from "@/lib/security/cookie-options";

async function writeSchoolCookie(schoolId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    SCHOOL_COOKIE,
    schoolId,
    appCookieOptions({ maxAge: 60 * 60 * 24 * 365 })
  );
}

export async function ensureSchoolCookie(schoolId: string) {
  const user = await requireUser();
  const cookieStore = await cookies();
  if (cookieStore.get(SCHOOL_COOKIE)?.value) {
    return { success: true, skipped: true as const };
  }

  const resolved = await resolveSelectedSchool(user, schoolId);
  if (!resolved) {
    throw new Error("Invalid school selection");
  }

  await writeSchoolCookie(resolved.id);
  return { success: true, skipped: false as const, schoolId: resolved.id };
}

export async function setSelectedSchool(schoolId: string) {
  const user = await requireUser();
  const resolved = await resolveSelectedSchool(user, schoolId);
  if (!resolved) {
    throw new Error("Invalid school selection");
  }

  await writeSchoolCookie(resolved.id);

  revalidatePath("/", "layout");
  return { success: true, schoolId: resolved.id };
}
