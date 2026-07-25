import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { ensureSchoolDefaultLogins } from "../src/lib/school/default-logins";
import {
  SEED_ACADEMIC_YEAR,
  SEED_ACADEMIC_YEAR_SCHOOLS,
  SEED_CALENDAR_DAYS,
  SEED_HOLIDAYS,
  SEED_SCHOOLS,
} from "./seed-data/foundation";

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function seedFoundationFromProd(prisma: PrismaClient) {
  console.log("Seeding schools, academic year, calendars, and grade links…");

  for (const school of SEED_SCHOOLS) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: {
        code: school.code,
        name: school.name,
        address: school.address,
        city: school.city,
        cityCode: school.cityCode,
        state: school.state,
        zipCode: school.zipCode,
        isActive: school.isActive,
        deletedAt: null,
      },
      create: {
        id: school.id,
        code: school.code,
        name: school.name,
        address: school.address,
        city: school.city,
        cityCode: school.cityCode,
        state: school.state,
        zipCode: school.zipCode,
        isActive: school.isActive,
      },
    });
  }
  console.log(`  Schools: ${SEED_SCHOOLS.length}`);

  await prisma.academicYear.upsert({
    where: { id: SEED_ACADEMIC_YEAR.id },
    update: {
      name: SEED_ACADEMIC_YEAR.name,
      startDate: dateOnly(SEED_ACADEMIC_YEAR.startDate),
      endDate: dateOnly(SEED_ACADEMIC_YEAR.endDate),
      deletedAt: null,
    },
    create: {
      id: SEED_ACADEMIC_YEAR.id,
      name: SEED_ACADEMIC_YEAR.name,
      startDate: dateOnly(SEED_ACADEMIC_YEAR.startDate),
      endDate: dateOnly(SEED_ACADEMIC_YEAR.endDate),
    },
  });
  console.log(`  Academic year: ${SEED_ACADEMIC_YEAR.name}`);

  for (const link of SEED_ACADEMIC_YEAR_SCHOOLS) {
    await prisma.academicYearSchool.upsert({
      where: { id: link.id },
      update: {
        academicYearId: link.academicYearId,
        schoolId: link.schoolId,
        isActive: link.isActive,
        deletedAt: null,
      },
      create: {
        id: link.id,
        academicYearId: link.academicYearId,
        schoolId: link.schoolId,
        isActive: link.isActive,
      },
    });
  }
  console.log(`  Academic year ↔ school links: ${SEED_ACADEMIC_YEAR_SCHOOLS.length}`);

  for (const holiday of SEED_HOLIDAYS) {
    await prisma.academicYearHoliday.upsert({
      where: { id: holiday.id },
      update: {
        academicYearId: holiday.academicYearId,
        date: dateOnly(holiday.date),
        name: holiday.name,
        deletedAt: null,
      },
      create: {
        id: holiday.id,
        academicYearId: holiday.academicYearId,
        date: dateOnly(holiday.date),
        name: holiday.name,
      },
    });
  }
  console.log(`  Holidays: ${SEED_HOLIDAYS.length}`);

  // Master classrooms come from seed-lookups (Grade × Section).
  const classrooms = await prisma.classroom.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
  });
  if (classrooms.length === 0) {
    throw new Error(
      "No classrooms found. seedLookupTables must run before seedFoundationFromProd."
    );
  }

  let classroomSchoolLinks = 0;
  for (const school of SEED_SCHOOLS) {
    for (const classroom of classrooms) {
      await prisma.classroomSchool.upsert({
        where: {
          classroomId_schoolId: {
            classroomId: classroom.id,
            schoolId: school.id,
          },
        },
        update: { isActive: true, deletedAt: null },
        create: {
          classroomId: classroom.id,
          schoolId: school.id,
          isActive: true,
        },
      });
      classroomSchoolLinks++;
    }
  }
  console.log(`  Classroom ↔ school links: ${classroomSchoolLinks}`);

  let calendarDays = 0;
  for (const yearSchool of SEED_ACADEMIC_YEAR_SCHOOLS) {
    for (const day of SEED_CALENDAR_DAYS) {
      const existing = await prisma.academicCalendarDay.findFirst({
        where: {
          academicYearSchoolId: yearSchool.id,
          date: dateOnly(day.date),
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.academicCalendarDay.update({
          where: { id: existing.id },
          data: {
            sessionType: day.sessionType,
            lessonPlanNumber: day.lessonPlanNumber,
            deletedAt: null,
          },
        });
      } else {
        await prisma.academicCalendarDay.create({
          data: {
            id: randomUUID(),
            academicYearSchoolId: yearSchool.id,
            date: dateOnly(day.date),
            sessionType: day.sessionType,
            lessonPlanNumber: day.lessonPlanNumber,
          },
        });
      }
      calendarDays++;
    }
  }
  console.log(`  Calendar days: ${calendarDays}`);
}

export async function seedDefaultLoginsForSeedSchools(prisma: PrismaClient) {
  console.log("Seeding 17 default app users per school…");

  for (const school of SEED_SCHOOLS) {
    const result = await ensureSchoolDefaultLogins(prisma, {
      schoolId: school.id,
      cityCode: school.cityCode,
      city: school.loginCityLabel,
    });
    console.log(
      `  ${school.cityCode}: ${result.created} created, ${result.existing} existing (${result.logins.length} logins)`
    );
  }
}
