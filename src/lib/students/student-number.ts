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
