import type { PrismaClient } from "@prisma/client";
import {
  ASSESSMENT_TYPE_ROWS,
  ATTENDANCE_STATUS_ROWS,
  BEHAVIOR_RATING_ROWS,
  ENROLLMENT_STATUS_ROWS,
  GENDER_ROWS,
  GRADE_ROWS,
  SECTION_NAMES,
  SESSION_TYPE_ROWS,
} from "./lookup-data";

export async function seedLookupTables(prisma: PrismaClient) {
  for (const row of GRADE_ROWS) {
    await prisma.grade.upsert({
      where: { name: row.name },
      update: { sortOrder: row.sortOrder },
      create: { name: row.name, sortOrder: row.sortOrder },
    });
  }

  for (const name of SECTION_NAMES) {
    await prisma.section.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const row of GENDER_ROWS) {
    await prisma.gender.upsert({
      where: { code: row.code },
      update: { label: row.label },
      create: row,
    });
  }

  for (const row of ENROLLMENT_STATUS_ROWS) {
    await prisma.enrollmentStatus.upsert({
      where: { code: row.code },
      update: { label: row.label },
      create: row,
    });
  }

  for (const row of ATTENDANCE_STATUS_ROWS) {
    await prisma.attendanceStatus.upsert({
      where: { code: row.code },
      update: { label: row.label },
      create: row,
    });
  }

  for (const row of BEHAVIOR_RATING_ROWS) {
    await prisma.behaviorRating.upsert({
      where: { code: row.code },
      update: { label: row.label, sortOrder: row.sortOrder },
      create: row,
    });
  }

  for (const row of SESSION_TYPE_ROWS) {
    await prisma.sessionType.upsert({
      where: { code: row.code },
      update: { label: row.label, sortOrder: row.sortOrder },
      create: row,
    });
  }

  for (const row of ASSESSMENT_TYPE_ROWS) {
    await prisma.assessmentType.upsert({
      where: { code: row.code },
      update: { label: row.label, sortOrder: row.sortOrder },
      create: row,
    });
  }
}
