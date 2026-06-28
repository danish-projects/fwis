import { config } from "dotenv";
import path from "node:path";
import { UserRoleCode } from "@prisma/client";
import { createPrismaClient } from "../src/lib/prisma";
import type { AttendanceStatusCode } from "./lookup-data";
import { seedLookupTables } from "./seed-lookups";
import { seedDemoAppUsers, SUPER_ADMIN_ID } from "../scripts/demo-users";
import { defaultSessionTypeForSunday } from "../src/lib/calendar/generate-sundays";
import { isAttendanceNeeded } from "../src/lib/grades/attendance-percentage";
import {
  allocateStudentNumber,
  deriveCityCode,
} from "../src/lib/students/student-number";
import { encryptStudentPiiForDb } from "../src/lib/students/student-pii";
import { assertDevOnlyScript } from "../scripts/lib/assert-dev-only";

const rootDir = process.cwd();
config({ path: path.join(rootDir, ".env.local") });
config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL is missing. Configure .env.local before running the seed."
  );
}

const prisma = createPrismaClient(databaseUrl);

function generateSundays(start: Date, end: Date): Date[] {
  const sundays: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  while (current.getDay() !== 0) current.setDate(current.getDate() + 1);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  while (current <= endDate) {
    sundays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return sundays;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function randomAttendanceStatus(): AttendanceStatusCode {
  const roll = Math.random();
  if (roll < 0.75) return "PRESENT";
  if (roll < 0.9) return "TARDY";
  return "ABSENT";
}

/** Each entry is exactly one school per city/state location. */
const SCHOOL_LOCATIONS = [
  {
    name: "Faizan Weekend School Houston",
    city: "Houston",
    state: "TX",
    principalName: "Br. Ahmed Khan",
  },
  {
    name: "Faizan Weekend School Chicago",
    city: "Chicago",
    state: "IL",
    principalName: "Sr. Fatima Ali",
  },
  {
    name: "Faizan Weekend School New York",
    city: "New York",
    state: "NY",
    principalName: "Br. Yusuf Rahman",
  },
  {
    name: "Faizan Weekend School Dallas",
    city: "Dallas",
    state: "TX",
    principalName: "Br. Khalid Hussain",
  },
  {
    name: "Faizan Weekend School Atlanta",
    city: "Atlanta",
    state: "GA",
    principalName: "Sr. Amina Noor",
  },
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

/** Male teachers for Boys sections — Pakistani Islamic names. */
const BOYS_TEACHERS: Array<{ firstName: string; lastName: string }> = [
  { firstName: "Muhammad", lastName: "Usman Khan" },
  { firstName: "Abdullah", lastName: "Ahmed Siddiqui" },
  { firstName: "Hamza", lastName: "Ali Malik" },
  { firstName: "Yusuf", lastName: "Rahman Qureshi" },
  { firstName: "Omar", lastName: "Hassan Chaudhry" },
  { firstName: "Bilal", lastName: "Farooq Baig" },
];

/** Female teachers for Girls sections — Pakistani Islamic names. */
const GIRLS_TEACHERS: Array<{ firstName: string; lastName: string }> = [
  { firstName: "Fatima", lastName: "Ali Khan" },
  { firstName: "Aisha", lastName: "Ahmed Siddiqui" },
  { firstName: "Maryam", lastName: "Hassan Malik" },
  { firstName: "Zainab", lastName: "Rahman Qureshi" },
  { firstName: "Khadija", lastName: "Noor Chaudhry" },
  { firstName: "Hafsa", lastName: "Farooq Baig" },
];

async function upsertClassroomTeacher(
  schoolId: string,
  schoolSlug: string,
  classroom: { id: string; grade: { name: string; sortOrder: number }; section: { name: string } },
  name: { firstName: string; lastName: string },
  phoneSuffix: number,
  gender: "MALE" | "FEMALE"
) {
  const gradeSlug = slugify(classroom.grade.name);
  const sectionSlug = classroom.section.name.toLowerCase();
  const email = `${gradeSlug}.${sectionSlug}.${schoolSlug}@fwis.org`;
  const legacyEmail = `teacher.${gradeSlug}.${sectionSlug}.${schoolSlug}@fwis.org`;

  const existing = await prisma.teacher.findFirst({
    where: {
      schoolId,
      OR: [{ email }, { email: legacyEmail }],
    },
  });

  if (existing) {
    await prisma.teacher.update({
      where: { id: existing.id },
      data: {
        email,
        gender,
        firstName: name.firstName,
        lastName: name.lastName,
        isActive: true,
        deletedAt: null,
      },
    });
    await prisma.teacherClassroom.deleteMany({ where: { teacherId: existing.id } });
    await prisma.teacherClassroom.create({
      data: { teacherId: existing.id, classroomId: classroom.id },
    });
    return existing;
  }

  return prisma.teacher.create({
    data: {
      schoolId,
      gender,
      firstName: name.firstName,
      lastName: name.lastName,
      email,
      phone: `555-${String(3000 + phoneSuffix).slice(-4)}`,
      classrooms: { create: [{ classroomId: classroom.id }] },
    },
  });
}

async function retireLegacyDemoTeacher(schoolId: string, schoolSlug: string) {
  const legacyEmail = `teacher@${schoolSlug}.fwis.org`;
  const legacy = await prisma.teacher.findFirst({
    where: { schoolId, email: legacyEmail, deletedAt: null },
  });
  if (!legacy) return;

  await prisma.teacherClassroom.deleteMany({ where: { teacherId: legacy.id } });
  await prisma.teacher.update({
    where: { id: legacy.id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

async function seedTeachersForSchool(
  school: { id: string; city: string },
  classrooms: Array<{
    id: string;
    grade: { name: string; sortOrder: number };
    section: { name: string };
  }>
) {
  const schoolSlug = slugify(school.city);
  await retireLegacyDemoTeacher(school.id, schoolSlug);

  const classroomTeachers = new Map<string, string>();
  let phoneSuffix = 0;

  for (const classroom of classrooms) {
    const isBoys = classroom.section.name === "Boys";
    const gender = isBoys ? "MALE" : "FEMALE";
    const gradeIndex = classroom.grade.sortOrder - 1;
    const name = isBoys ? BOYS_TEACHERS[gradeIndex] : GIRLS_TEACHERS[gradeIndex];
    phoneSuffix++;

    const teacher = await upsertClassroomTeacher(
      school.id,
      schoolSlug,
      classroom,
      name,
      phoneSuffix,
      gender
    );
    classroomTeachers.set(classroom.id, teacher.id);
  }

  return classroomTeachers;
}

async function upsertSchoolByLocation(location: (typeof SCHOOL_LOCATIONS)[number]) {
  const existing = await prisma.school.findFirst({
    where: { city: location.city, state: location.state, deletedAt: null },
  });

  if (existing) {
    return prisma.school.update({
      where: { id: existing.id },
      data: {
        name: location.name,
        principalName: location.principalName,
        isActive: true,
        ...(existing.cityCode ? {} : { cityCode: deriveCityCode(location.city) }),
      },
    });
  }

  return prisma.school.create({
    data: {
      name: location.name,
      city: location.city,
      cityCode: deriveCityCode(location.city),
      state: location.state,
      principalName: location.principalName,
      email: `admin@${location.city.toLowerCase().replace(/\s/g, "")}.fwis.org`,
      phone: "555-0100",
      isActive: true,
    },
  });
}

async function main() {
  assertDevOnlyScript("npm run db:seed");
  console.log("Seeding FWIS database...");

  await seedLookupTables(prisma);

  const roles = await Promise.all(
    (
      [
        ["SUPER_ADMIN", "Super Admin"],
        ["SCHOOL_ADMIN", "School Admin / Principal"],
        ["TEACHER", "Teacher"],
        ["READ_ONLY", "Read Only"],
      ] as const
    ).map(([code, name]) =>
      prisma.role.upsert({
        where: { code: code as UserRoleCode },
        update: { name },
        create: { code: code as UserRoleCode, name },
      })
    )
  );

  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" } });
  const sections = await prisma.section.findMany();
  const boys = sections.find((s) => s.name === "Boys");
  const girls = sections.find((s) => s.name === "Girls");
  if (!boys || !girls) {
    throw new Error("Setup sections Boys/Girls missing after seedLookupTables.");
  }

  const schools = await Promise.all(SCHOOL_LOCATIONS.map((location) => upsertSchoolByLocation(location)));

  for (const school of schools) {
    let year = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, name: "2025-2026", deletedAt: null },
    });

    if (!year) {
      year = await prisma.academicYear.create({
        data: {
          schoolId: school.id,
          name: "2025-2026",
          startDate: new Date("2025-09-07"),
          endDate: new Date("2026-05-31"),
          isActive: true,
        },
      });

      const sundays = generateSundays(new Date("2025-09-07"), new Date("2026-05-31"));
      let weekCounter = 0;
      await prisma.academicCalendarDay.createMany({
        data: sundays.map((date, i) => {
          const sessionType = defaultSessionTypeForSunday(i + 1);
          const lessonPlanNumber = isAttendanceNeeded(sessionType)
            ? ++weekCounter
            : null;
          return {
            academicYearId: year!.id,
            date,
            lessonPlanNumber,
            sessionType,
          };
        }),
        skipDuplicates: true,
      });
    }

    for (const grade of grades) {
      for (const section of [boys, girls]) {
        await prisma.classroom.upsert({
          where: {
            schoolId_gradeId_sectionId: {
              schoolId: school.id,
              gradeId: grade.id,
              sectionId: section.id,
            },
          },
          update: { name: `${grade.name} ${section.name}`, isActive: true },
          create: {
            schoolId: school.id,
            gradeId: grade.id,
            sectionId: section.id,
            name: `${grade.name} ${section.name}`,
          },
        });
      }
    }
  }

  await prisma.appUser.upsert({
    where: { id: SUPER_ADMIN_ID },
    update: { email: "superadmin@fwis.org", fullName: "FWIS Super Admin" },
    create: {
      id: SUPER_ADMIN_ID,
      email: "superadmin@fwis.org",
      fullName: "FWIS Super Admin",
    },
  });

  const superAdminRole = roles.find((r) => r.code === "SUPER_ADMIN")!;
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: SUPER_ADMIN_ID, roleId: superAdminRole.id },
    },
    update: {},
    create: { userId: SUPER_ADMIN_ID, roleId: superAdminRole.id },
  });

  const boyFirstNames = ["Ahmed", "Yusuf", "Omar", "Hassan", "Ibrahim", "Hamza", "Ali", "Bilal"];
  const girlFirstNames = ["Fatima", "Aisha", "Maryam", "Zainab", "Khadija", "Sara", "Hafsa", "Noor"];
  const lastNames = [
    "Khan",
    "Ali",
    "Ahmed",
    "Hassan",
    "Malik",
    "Siddiqui",
    "Rahman",
    "Qureshi",
    "Farooq",
    "Baig",
    "Chaudhry",
    "Mirza",
  ];

  let studentCounter = 0;

  for (const school of schools) {
    const year = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isActive: true },
    });
    if (!year) continue;

    const classrooms = await prisma.classroom.findMany({
      where: { schoolId: school.id, deletedAt: null },
      include: { grade: true, section: true },
      orderBy: [{ grade: { sortOrder: "asc" } }, { section: { name: "asc" } }],
    });

    const classroomTeachers = await seedTeachersForSchool(school, classrooms);

    const calendarDays = await prisma.academicCalendarDay.findMany({
      where: { academicYearId: year.id, deletedAt: null },
      orderBy: { date: "asc" },
      take: 8,
    });

    const existingEnrollments = await prisma.studentEnrollment.count({
      where: { schoolId: school.id, academicYearId: year.id, deletedAt: null },
    });

    if (existingEnrollments > 0) {
      continue;
    }

    for (const grade of grades) {
      const gradeClassrooms = classrooms.filter((c) => c.gradeId === grade.id);
      const studentsInGrade = randomInt(4, 14);

      for (let i = 0; i < studentsInGrade; i++) {
        const classroom = randomItem(gradeClassrooms);
        const isBoys = classroom.section.name === "Boys";
        const firstNames = isBoys ? boyFirstNames : girlFirstNames;

        studentCounter++;
        const firstName = randomItem(firstNames);
        const lastName = randomItem(lastNames);

        const student = await prisma.$transaction(async (tx) => {
          const studentNumber = await allocateStudentNumber(
            tx,
            school.cityCode,
            isBoys ? "MALE" : "FEMALE"
          );
          const pii = encryptStudentPiiForDb({
            dateOfBirth: null,
            parentName: `${lastName} Parent`,
            parentPhone: `555-${String(1000 + studentCounter).slice(-4)}`,
            parentEmail: `parent.${school.city.toLowerCase().replace(/\s/g, "")}.${studentCounter}@email.com`,
            address: null,
            emergencyContact: null,
          });
          return tx.student.create({
            data: {
              firstName,
              lastName,
              studentNumber,
              gender: isBoys ? "MALE" : "FEMALE",
              originSchoolId: school.id,
              ...pii,
            },
          });
        });

        const teacherId = classroomTeachers.get(classroom.id);
        if (!teacherId) {
          throw new Error(`No teacher assigned for classroom ${classroom.id}`);
        }

        const enrollment = await prisma.studentEnrollment.create({
          data: {
            studentId: student.id,
            schoolId: school.id,
            academicYearId: year.id,
            classroomId: classroom.id,
            teacherId,
            status: "ACTIVE",
          },
        });

        const attendanceDays = calendarDays.slice(0, randomInt(3, calendarDays.length));
        for (const day of attendanceDays) {
          await prisma.attendance.create({
            data: {
              enrollmentId: enrollment.id,
              calendarDayId: day.id,
              status: randomAttendanceStatus(),
              recordedById: SUPER_ADMIN_ID,
            },
          });
        }
      }
    }
  }

  await seedDemoAppUsers(prisma, schools, roles);

  console.log("Seed complete.");
  console.log(`Schools seeded: ${schools.length} (one per city/state location)`);
  console.log("Teachers: one Pakistani Islamic name teacher per grade section per school");
  console.log("");
  console.log("Demo login accounts (run npm run setup to create Supabase Auth users):");
  console.log("  See scripts/demo-users.ts for local dev emails and passwords.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
