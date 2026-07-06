import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SCHOOL_COOKIE, type SchoolSummary } from "@/lib/school/constants";
import { listSchoolsForUser } from "@/lib/school/list-schools";

async function assertUserCanAccessSchool(
  user: AuthUser,
  schoolId: string
): Promise<SchoolSummary | null> {
  if (
    !user.roles.includes("SUPER_ADMIN") &&
    !user.schoolIds.includes(schoolId)
  ) {
    return null;
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId, deletedAt: null, isActive: true },
    select: { id: true, name: true },
  });

  return school;
}

function defaultSchoolForUser(
  user: AuthUser,
  available: SchoolSummary[]
): SchoolSummary | null {
  if (available.length === 0) return null;

  const primaryId = user.schoolIds[0];
  if (primaryId) {
    const match = available.find((school) => school.id === primaryId);
    if (match) return match;
  }

  return available[0];
}

export async function resolveSelectedSchool(
  user: AuthUser,
  cookieSchoolId?: string | null
): Promise<SchoolSummary | null> {
  const available = await listSchoolsForUser(user);
  if (available.length === 0) return null;

  if (cookieSchoolId) {
    const allowed = await assertUserCanAccessSchool(user, cookieSchoolId);
    if (allowed) {
      const match = available.find((school) => school.id === allowed.id);
      if (match) return match;
    }
  }

  return defaultSchoolForUser(user, available);
}

export async function getSelectedSchool(
  user: AuthUser
): Promise<SchoolSummary | null> {
  const cookieStore = await cookies();
  const cookieSchoolId = cookieStore.get(SCHOOL_COOKIE)?.value;
  return resolveSelectedSchool(user, cookieSchoolId);
}

/** School scope for list pages (teachers, grades, etc.) — honors URL override, then sidebar selection. */
export async function resolveListSchoolId(
  user: AuthUser,
  explicitSchoolId?: string | null
): Promise<string | null> {
  if (explicitSchoolId) {
    const allowed = await assertUserCanAccessSchool(user, explicitSchoolId);
    if (allowed) return allowed.id;
  }

  const selected = await getSelectedSchool(user);
  if (selected) return selected.id;

  if (!user.roles.includes("SUPER_ADMIN") && user.schoolIds[0]) {
    return user.schoolIds[0];
  }

  return null;
}
