import type { PrismaClient } from "@prisma/client";
import { formatSchoolCode } from "@/lib/school/format-school-code";
import { deriveCityCode } from "@/lib/students/student-number";

export type SchoolSetupRow = {
  school_name: string;
  city: string;
  state: string;
  academic_year: string;
  year_start_date: string;
  year_end_date: string;
};

export async function findSchoolByCityState(
  prisma: PrismaClient,
  city: string,
  state: string
) {
  return prisma.school.findFirst({
    where: {
      city: city.trim(),
      state: state.trim().toUpperCase(),
      deletedAt: null,
    },
  });
}

/** Require school + academic year link already in DB — never create. */
export async function requireExistingSchoolYear(
  prisma: PrismaClient,
  city: string,
  state: string,
  academicYearName: string
) {
  const school = await findSchoolByCityState(prisma, city, state);
  if (!school) {
    throw new Error(
      `School does not exist for city "${city.trim()}" / state "${state.trim().toUpperCase()}". ` +
        `Create the school in the app (Setup → Schools) before importing.`
    );
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: { name: academicYearName.trim(), deletedAt: null },
    select: { id: true, name: true },
  });
  if (!academicYear) {
    throw new Error(
      `Academic year "${academicYearName.trim()}" does not exist. ` +
        `Create it in the app (Setup → Academic Years) before importing.`
    );
  }

  const schoolLink = await findAcademicYearSchool(
    prisma,
    school.id,
    academicYearName
  );
  if (!schoolLink) {
    throw new Error(
      `Academic year "${academicYearName.trim()}" exists but is not linked to ${school.name}. ` +
        `Link the year to this school in the app before importing.`
    );
  }

  return { school, schoolLink, academicYear: schoolLink.academicYear };
}

export async function resolveOrCreateSchool(
  prisma: PrismaClient,
  setup: SchoolSetupRow,
  options: { create: boolean }
) {
  const city = setup.city.trim();
  const state = setup.state.trim().toUpperCase();

  const existing = await prisma.school.findFirst({
    where: { city, state, deletedAt: null },
  });
  if (existing) return existing;

  if (!options.create) return null;

  const cityCode = deriveCityCode(city);
  return prisma.school.create({
    data: {
      name: setup.school_name.trim() || `Faizan Weekend Islamic School ${city}`,
      city,
      state,
      cityCode,
      code: formatSchoolCode(cityCode),
      isActive: true,
    },
  });
}

export async function resolveOrCreateAcademicYearSchool(
  prisma: PrismaClient,
  schoolId: string,
  setup: SchoolSetupRow,
  yearStart: Date,
  yearEnd: Date
) {
  const academicYearName = setup.academic_year.trim();

  let academicYear = await prisma.academicYear.findFirst({
    where: { name: academicYearName, deletedAt: null },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: academicYearName,
        startDate: yearStart,
        endDate: yearEnd,
      },
    });
  } else {
    academicYear = await prisma.academicYear.update({
      where: { id: academicYear.id },
      data: { startDate: yearStart, endDate: yearEnd },
    });
  }

  let schoolLink = await prisma.academicYearSchool.findFirst({
    where: {
      schoolId,
      academicYearId: academicYear.id,
      deletedAt: null,
    },
  });

  if (!schoolLink) {
    schoolLink = await prisma.academicYearSchool.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        isActive: true,
      },
    });
  } else if (!schoolLink.isActive) {
    schoolLink = await prisma.academicYearSchool.update({
      where: { id: schoolLink.id },
      data: { isActive: true },
    });
  }

  await prisma.academicYearSchool.updateMany({
    where: { schoolId, deletedAt: null, id: { not: schoolLink.id } },
    data: { isActive: false },
  });

  return { academicYear, schoolLink };
}

export async function findAcademicYearSchool(
  prisma: PrismaClient,
  schoolId: string,
  academicYearName: string
) {
  return prisma.academicYearSchool.findFirst({
    where: {
      schoolId,
      deletedAt: null,
      academicYear: { name: academicYearName.trim(), deletedAt: null },
    },
    include: {
      academicYear: true,
      school: true,
    },
  });
}
