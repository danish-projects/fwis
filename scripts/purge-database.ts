import { config } from "dotenv";
import path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPrismaClient } from "../src/lib/prisma";
import {
  formatPurgeCounts,
  purgeSchool,
  type PurgeCounts,
} from "./lib/purge-school";

const rootDir = process.cwd();
config({ path: path.join(rootDir, ".env.local") });
config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL is missing. Configure .env.local before running purge."
  );
}

const prisma = createPrismaClient(databaseUrl);

function parseArgs() {
  const args = process.argv.slice(2);
  let all = false;
  let yes = false;
  let city: string | undefined;
  let state: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") all = true;
    else if (arg === "--yes" || arg === "-y") yes = true;
    else if (arg === "--city") city = args[++i];
    else if (arg === "--state") state = args[++i];
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (all && (city || state)) {
    console.error("Use either --all or --city/--state, not both.");
    process.exit(1);
  }

  if (!all && !(city && state)) {
    console.error("Specify --all or both --city and --state.");
    printHelp();
    process.exit(1);
  }

  return { all, yes, city, state };
}

function printHelp() {
  console.log(`
Usage:
  npm run db:purge -- --all [--yes]
  npm run db:purge -- --city Houston --state TX [--yes]

Deletes operational data while preserving setup / lookup tables:
  grades, sections, genders, enrollment_statuses, attendance_statuses,
  behavior_values, session_types, assessment_types, roles, app_users, user_roles

Options:
  --all              Purge all schools and operational data
  --city <city>      Purge one school by city (requires --state)
  --state <state>    Purge one school by state (requires --city)
  --yes, -y          Skip confirmation prompt
`);
}

async function confirmPurge(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `${message}\nType "yes" to continue, or anything else to cancel: `
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "yes" || normalized === "y";
  } finally {
    rl.close();
  }
}

async function deleteEnrollmentScopedData(
  enrollmentIds: string[]
): Promise<Pick<
  PurgeCounts,
  "attendance" | "assessments" | "finalGrades" | "enrollments"
>> {
  if (enrollmentIds.length === 0) {
    return {
      attendance: 0,
      assessments: 0,
      finalGrades: 0,
      enrollments: 0,
    };
  }

  const attendance = (
    await prisma.attendance.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    })
  ).count;
  const assessments = (
    await prisma.assessmentScore.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    })
  ).count;
  const finalGrades = (
    await prisma.enrollmentFinalGrade.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    })
  ).count;
  const enrollments = (
    await prisma.studentEnrollment.deleteMany({
      where: { id: { in: enrollmentIds } },
    })
  ).count;

  return { attendance, assessments, finalGrades, enrollments };
}

async function purgeAll(): Promise<PurgeCounts> {
  const allEnrollments = await prisma.studentEnrollment.findMany({
    select: { id: true },
  });
  const enrollmentIds = allEnrollments.map((e) => e.id);

  const scoped = await deleteEnrollmentScopedData(enrollmentIds);

  const staffClassrooms = (await prisma.staffAssignment.deleteMany()).count;
  const staff = (await prisma.staff.deleteMany()).count;
  const classrooms = (await prisma.classroom.deleteMany()).count;
  const calendarDays = (await prisma.academicCalendarDay.deleteMany()).count;
  const academicYears = (await prisma.academicYear.deleteMany()).count;
  const auditLogs = (await prisma.auditLog.deleteMany()).count;
  const userSchools = (await prisma.userSchool.deleteMany()).count;
  const students = (await prisma.student.deleteMany()).count;
  const schools = (await prisma.school.deleteMany()).count;

  return {
    ...scoped,
    staffClassrooms,
    staff,
    classrooms,
    calendarDays,
    academicYears,
    auditLogs,
    userSchools,
    students,
    schools,
  };
}

async function main() {
  const { all, yes, city, state } = parseArgs();

  let scopeLabel: string;
  let schoolId: string | undefined;

  if (all) {
    const schoolCount = await prisma.school.count();
    scopeLabel = `ALL schools (${schoolCount} school record(s))`;
  } else {
    const school = await prisma.school.findFirst({
      where: { city: city!, state: state!, deletedAt: null },
    });
    if (!school) {
      console.error(`No active school found for ${city}, ${state}.`);
      process.exit(1);
    }
    schoolId = school.id;
    scopeLabel = `"${school.name}" (${city}, ${state})`;
  }

  console.log("");
  console.log("FWIS database purge");
  console.log("===================");
  console.log(`Scope: ${scopeLabel}`);
  console.log("");
  console.log("Setup tables preserved: grades, sections, lookup codes, roles, app users.");
  console.log("");

  if (!yes) {
    const ok = await confirmPurge(
      "This permanently deletes the operational data listed above."
    );
    if (!ok) {
      console.log("Cancelled.");
      process.exit(0);
    }
  }

  const counts = all ? await purgeAll() : await purgeSchool(prisma, schoolId!);

  console.log("");
  console.log("Purge complete:");
  console.log(formatPurgeCounts(counts));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
