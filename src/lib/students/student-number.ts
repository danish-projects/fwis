import type { Prisma } from "@prisma/client";

export const STUDENT_NUMBER_PATTERN = /^[A-Z]{3}-[BG]\d{1,5}$/;

export function deriveCityCode(city: string): string {
  const letters = city.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  return letters.padEnd(3, "X");
}

export function genderToPrefix(gender: string): "B" | "G" {
  return gender === "FEMALE" ? "G" : "B";
}

export function formatStudentNumber(
  cityCode: string,
  gender: string,
  sequence: number
): string {
  return `${cityCode}-${genderToPrefix(gender)}${sequence}`;
}

export function isValidStudentNumber(value: string): boolean {
  return STUDENT_NUMBER_PATTERN.test(value);
}

export function parseStudentNumber(value: string): {
  cityCode: string;
  genderPrefix: "B" | "G";
  sequence: number;
} {
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^([A-Z]{3})-([BG])(\d{1,5})$/);
  if (!match) {
    throw new Error(
      `Invalid student_id "${value}". Expected format HOU-B40 (3-letter city, B/G, number).`
    );
  }
  return {
    cityCode: match[1],
    genderPrefix: match[2] as "B" | "G",
    sequence: Number(match[3]),
  };
}

/** Ensure sequence counter is at least as high as an imported/explicit student number. */
export async function adoptStudentNumberSequence(
  tx: Prisma.TransactionClient,
  studentNumber: string,
  gender: string
): Promise<void> {
  const parsed = parseStudentNumber(studentNumber);
  const expectedPrefix = genderToPrefix(gender);
  if (parsed.genderPrefix !== expectedPrefix) {
    throw new Error(
      `student_id "${studentNumber}" does not match gender ${gender} (expected ${expectedPrefix}).`
    );
  }

  const existing = await tx.studentNumberSequence.findUnique({
    where: {
      cityCode_genderPrefix: {
        cityCode: parsed.cityCode,
        genderPrefix: parsed.genderPrefix,
      },
    },
    select: { lastNumber: true },
  });

  if (!existing || existing.lastNumber < parsed.sequence) {
    await tx.studentNumberSequence.upsert({
      where: {
        cityCode_genderPrefix: {
          cityCode: parsed.cityCode,
          genderPrefix: parsed.genderPrefix,
        },
      },
      create: {
        cityCode: parsed.cityCode,
        genderPrefix: parsed.genderPrefix,
        lastNumber: parsed.sequence,
      },
      update: { lastNumber: parsed.sequence },
    });
  }
}

export async function allocateStudentNumber(
  tx: Prisma.TransactionClient,
  cityCode: string,
  gender: string
): Promise<string> {
  const genderPrefix = genderToPrefix(gender);
  const sequence = await tx.studentNumberSequence.upsert({
    where: {
      cityCode_genderPrefix: { cityCode, genderPrefix },
    },
    create: { cityCode, genderPrefix, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return formatStudentNumber(cityCode, gender, sequence.lastNumber);
}

export async function ensureStudentNumber(
  tx: Prisma.TransactionClient,
  studentId: string,
  schoolId: string
): Promise<string | null> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { studentNumber: true, gender: true },
  });
  if (!student) throw new Error("Student not found");
  if (student.studentNumber) return student.studentNumber;

  const school = await tx.school.findUnique({
    where: { id: schoolId },
    select: { cityCode: true },
  });
  if (!school?.cityCode) {
    throw new Error("School is missing a city code");
  }

  const studentNumber = await allocateStudentNumber(
    tx,
    school.cityCode,
    student.gender
  );

  await tx.student.update({
    where: { id: studentId },
    data: { studentNumber },
  });

  return studentNumber;
}

export async function resolveSchoolCityCode(
  tx: Prisma.TransactionClient,
  schoolId: string
): Promise<string> {
  const school = await tx.school.findUnique({
    where: { id: schoolId },
    select: { cityCode: true, city: true },
  });
  if (!school) throw new Error("School not found");
  if (school.cityCode) return school.cityCode;

  const cityCode = deriveCityCode(school.city);
  await tx.school.update({
    where: { id: schoolId },
    data: { cityCode },
  });
  return cityCode;
}
