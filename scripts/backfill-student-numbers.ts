/**
 * Backfills city codes on schools and student numbers for existing students.
 *
 * Usage: npx dotenv -e .env.local -- tsx scripts/backfill-student-numbers.ts
 */
import { config } from "dotenv";
import { createPrismaClient } from "../src/lib/prisma";
import {
  deriveCityCode,
  ensureStudentNumber,
} from "../src/lib/students/student-number";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL or DIRECT_URL");

const prisma = createPrismaClient(url);

async function backfillCityCodes() {
  const schools = await prisma.school.findMany({
    select: { id: true, city: true, cityCode: true },
    orderBy: { createdAt: "asc" },
  });

  const usedCodes = new Set(
    schools.map((s) => s.cityCode).filter((c): c is string => Boolean(c))
  );

  for (const school of schools) {
    if (school.cityCode) continue;

    let cityCode = deriveCityCode(school.city);
    let suffix = 1;
    while (usedCodes.has(cityCode)) {
      cityCode = `${deriveCityCode(school.city).slice(0, 2)}${suffix}`;
      suffix++;
    }

    await prisma.school.update({
      where: { id: school.id },
      data: { cityCode },
    });
    usedCodes.add(cityCode);
    console.log(`School ${school.id}: city code ${cityCode}`);
  }

  const [{ count: remaining }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM schools WHERE city_code IS NULL
  `;
  if (remaining > 0n) {
    throw new Error(`${remaining} schools still missing city_code after backfill`);
  }
}

async function backfillStudentNumbers() {
  const students = await prisma.student.findMany({
    where: { deletedAt: null, studentNumber: null },
    select: {
      id: true,
      gender: true,
      createdAt: true,
      enrollments: {
        where: { deletedAt: null },
        select: { schoolId: true, enrollmentDate: true },
        orderBy: { enrollmentDate: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let assigned = 0;
  for (const student of students) {
    const schoolId = student.enrollments[0]?.schoolId;
    if (!schoolId) {
      console.warn(`Skipping student ${student.id} — no enrollment`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await ensureStudentNumber(tx, student.id, schoolId);
    });
    assigned++;
  }

  console.log(`Assigned student numbers: ${assigned}`);
}

async function syncSequencesFromExisting() {
  const students = await prisma.student.findMany({
    where: { studentNumber: { not: null } },
    select: { studentNumber: true },
  });

  const maxByKey = new Map<string, number>();
  for (const { studentNumber } of students) {
    if (!studentNumber) continue;
    const match = studentNumber.match(/^([A-Z]{3})-([BG])(\d+)$/);
    if (!match) continue;
    const [, cityCode, genderPrefix, seqStr] = match;
    const seq = Number(seqStr);
    const key = `${cityCode}:${genderPrefix}`;
    maxByKey.set(key, Math.max(maxByKey.get(key) ?? 0, seq));
  }

  for (const [key, lastNumber] of maxByKey) {
    const [cityCode, genderPrefix] = key.split(":");
    await prisma.studentNumberSequence.upsert({
      where: { cityCode_genderPrefix: { cityCode, genderPrefix } },
      create: { cityCode, genderPrefix, lastNumber },
      update: { lastNumber: { set: lastNumber } },
    });
  }

  console.log(`Synced ${maxByKey.size} sequence rows`);
}

async function main() {
  console.log("Backfilling city codes...");
  await backfillCityCodes();

  console.log("Backfilling student numbers...");
  await backfillStudentNumbers();

  console.log("Syncing sequence counters...");
  await syncSequencesFromExisting();

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
