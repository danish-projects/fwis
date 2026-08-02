import type { UserRoleCode } from "@prisma/client";
import type { AuthUser } from "@/lib/auth/session";

export const IDS = {
  schoolHou: "a1000000-0000-4000-8000-000000000001",
  schoolChi: "a1000000-0000-4000-8000-000000000002",
  year2025: "b2000000-0000-4000-8000-000000000001",
  yearSchoolHou: "c3000000-0000-4000-8000-000000000001",
  classroomG1Boys: "d4000000-0000-4000-8000-000000000001",
  teacher: "e5000000-0000-4000-8000-000000000001",
  student: "f6000000-0000-4000-8000-000000000001",
  enrollment: "f7000000-0000-4000-8000-000000000001",
} as const;

export const MOCK_SCHOOLS = {
  houston: {
    id: IDS.schoolHou,
    name: "Faizan Weekend School Houston",
    code: "FWIS-HOU",
    cityCode: "HOU",
    city: "Houston",
    state: "TX",
  },
  chicago: {
    id: IDS.schoolChi,
    name: "Faizan Weekend School Chicago",
    code: "FWIS-CHI",
    cityCode: "CHI",
    city: "Chicago",
    state: "IL",
  },
} as const;

export const MOCK_YEAR = {
  id: IDS.year2025,
  name: "2025-2026",
  startDate: new Date("2025-08-01"),
  endDate: new Date("2026-06-30"),
} as const;

export function mockUser(
  roles: UserRoleCode[],
  overrides: Partial<AuthUser> = {}
): AuthUser {
  return {
    id: "u0000000-0000-4000-8000-000000000001",
    userId: "test.user",
    fullName: "Test User",
    staffFullName: null,
    roles,
    schoolIds: roles.includes("NIGRA") ? [] : [IDS.schoolHou],
    classroomIds: roles.includes("TEACHER") ? [IDS.classroomG1Boys] : [],
    gender: roles.includes("TEACHER") ? "MALE" : null,
    isSubstituteTeacher: false,
    ...overrides,
  };
}

export const PERFECT_SCORES = {
  attendancePct: 100,
  behaviorPct: 100,
  scores: {
    QUIZ_1: 100,
    QUIZ_2: 100,
    QUIZ_3: 100,
    QUIZ_4: 100,
    QUIZ_5: 100,
    MIDTERM_PROJECT: 100,
    FINAL_EXAM: 100,
  },
} as const;
