import type { PrismaClient } from "@prisma/client";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type EnsureClassroomResult = {
  classroomId: string;
  classroomSchoolId: string;
  name: string;
  createdClassroom: boolean;
  createdLink: boolean;
};

/** Find or create shared Classroom (grade+section) and link it to a school. */
export async function ensureClassroomForSchool(
  prisma: Db,
  input: {
    schoolId: string;
    gradeId: number;
    sectionId: number;
    name?: string;
    isActive?: boolean;
  }
): Promise<EnsureClassroomResult> {
  const [grade, section] = await Promise.all([
    prisma.grade.findUnique({ where: { id: input.gradeId } }),
    prisma.section.findUnique({ where: { id: input.sectionId } }),
  ]);
  if (!grade || !section) {
    throw new Error("Invalid grade level or section");
  }

  const name = input.name?.trim() || `${grade.name} ${section.name}`;
  let createdClassroom = false;
  let createdLink = false;

  let classroom = await prisma.classroom.findFirst({
    where: {
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      deletedAt: null,
    },
  });

  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        gradeId: input.gradeId,
        sectionId: input.sectionId,
        name,
        isActive: input.isActive ?? true,
      },
    });
    createdClassroom = true;
  }

  let link = await prisma.classroomSchool.findFirst({
    where: {
      classroomId: classroom.id,
      schoolId: input.schoolId,
    },
  });

  if (!link) {
    link = await prisma.classroomSchool.create({
      data: {
        classroomId: classroom.id,
        schoolId: input.schoolId,
        isActive: input.isActive ?? true,
      },
    });
    createdLink = true;
  } else if (link.deletedAt || link.isActive === false) {
    link = await prisma.classroomSchool.update({
      where: { id: link.id },
      data: {
        deletedAt: null,
        isActive: input.isActive ?? true,
      },
    });
    createdLink = true;
  }

  return {
    classroomId: classroom.id,
    classroomSchoolId: link.id,
    name: classroom.name,
    createdClassroom,
    createdLink,
  };
}

export async function classroomBelongsToSchool(
  prisma: Db,
  classroomId: string,
  schoolId: string
): Promise<boolean> {
  const link = await prisma.classroomSchool.findFirst({
    where: {
      classroomId,
      schoolId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  return Boolean(link);
}

/** School IDs that offer this classroom (active links). */
export async function schoolIdsForClassroom(
  prisma: Db,
  classroomId: string
): Promise<string[]> {
  const links = await prisma.classroomSchool.findMany({
    where: { classroomId, deletedAt: null, isActive: true },
    select: { schoolId: true },
  });
  return links.map((link) => link.schoolId);
}

/** Prefer a school from preferredIds, else the first link. */
export function pickSchoolLink<T extends { schoolId: string }>(
  links: T[],
  preferredSchoolIds: string[] = []
): T | undefined {
  if (preferredSchoolIds.length > 0) {
    const match = links.find((link) => preferredSchoolIds.includes(link.schoolId));
    if (match) return match;
  }
  return links[0];
}
