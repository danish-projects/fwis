/**
 * Permanently delete specific schools and all related operational data.
 *
 * Default targets are duplicate seed schools (HO1, HO2, CH1, CH2, NE1, NE2).
 *
 * Usage:
 *   npm run db:delete-schools -- --dry-run
 *   npm run db:delete-schools -- --yes
 *   npm run db:delete-schools -- --id 46f214b9-a42c-479e-bbdc-15243ffebd92 --yes
 */
import { config } from "dotenv";
import path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPrismaClient } from "../src/lib/prisma";
import {
  formatPurgeCounts,
  purgeSchool,
  sumPurgeCounts,
  type PurgeCounts,
} from "./lib/purge-school";

const rootDir = process.cwd();
config({ path: path.join(rootDir, ".env.local") });
config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL is missing. Configure .env.local before running."
  );
}

const prisma = createPrismaClient(databaseUrl);

/** Duplicate schools to remove — prefix matches full UUID. */
const DEFAULT_SCHOOL_TARGETS = [
  { prefix: "46f214b9", label: "Houston (46f214b9)" },
  { prefix: "cb10b6b4", label: "Houston (cb10b6b4)" },
  { prefix: "91a4e7b0", label: "Chicago (91a4e7b0)" },
  { prefix: "9f35efcd", label: "Chicago (9f35efcd)" },
  { prefix: "cd6d714b", label: "New York (cd6d714b)" },
  { prefix: "d8b7c8a8", label: "New York (d8b7c8a8)" },
] as const;

type ResolvedSchool = {
  id: string;
  name: string;
  city: string;
  state: string;
  cityCode: string;
  label: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let yes = false;
  const explicitIds: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--yes" || arg === "-y") yes = true;
    else if (arg === "--id") explicitIds.push(args[++i]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return { dryRun, yes, explicitIds };
}

function printHelp() {
  console.log(`
Usage:
  npm run db:delete-schools -- [--dry-run] [--yes]
  npm run db:delete-schools -- --id <school-uuid> [--id <school-uuid>] [--yes]

Deletes each school and all related data:
  enrollments, attendance, assessments, final grades, teachers, classrooms,
  academic years, calendar days, audit logs, user-school links, and orphan students.

Default targets (no --id):
  Houston  46f214b9, cb10b6b4
  Chicago  91a4e7b0, 9f35efcd
  New York cd6d714b, d8b7c8a8

Options:
  --dry-run   Show schools that would be deleted without making changes
  --yes, -y   Skip confirmation prompt
  --id        Full or partial school UUID (repeatable; overrides defaults)
`);
}

async function confirmDelete(message: string): Promise<boolean> {
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

async function resolveSchoolByPrefix(
  prefix: string,
  label: string
): Promise<ResolvedSchool> {
  const normalizedPrefix = prefix.toLowerCase();
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, city: true, state: true, cityCode: true },
  });
  const matches = schools.filter((school) =>
    school.id.toLowerCase().startsWith(normalizedPrefix)
  );

  if (matches.length === 0) {
    throw new Error(`No school found matching prefix "${prefix}" (${label})`);
  }
  if (matches.length > 1) {
    const ids = matches.map((m) => m.id).join(", ");
    throw new Error(
      `Prefix "${prefix}" matches multiple schools: ${ids}. Use --id with full UUID.`
    );
  }

  const school = matches[0];
  return { ...school, label };
}

async function resolveSchoolById(idOrPrefix: string): Promise<ResolvedSchool> {
  const exact = await prisma.school.findUnique({
    where: { id: idOrPrefix },
    select: { id: true, name: true, city: true, state: true, cityCode: true },
  });
  if (exact) {
    return {
      ...exact,
      label: `${exact.city} (${exact.id.slice(0, 8)})`,
    };
  }

  return resolveSchoolByPrefix(idOrPrefix, idOrPrefix);
}

async function resolveTargets(explicitIds: string[]): Promise<ResolvedSchool[]> {
  if (explicitIds.length > 0) {
    const schools: ResolvedSchool[] = [];
    for (const id of explicitIds) {
      schools.push(await resolveSchoolById(id));
    }
    return schools;
  }

  const schools: ResolvedSchool[] = [];
  for (const target of DEFAULT_SCHOOL_TARGETS) {
    schools.push(await resolveSchoolByPrefix(target.prefix, target.label));
  }
  return schools;
}

async function previewSchool(school: ResolvedSchool) {
  const [
    enrollments,
    teachers,
    classrooms,
    academicYears,
    userSchools,
  ] = await Promise.all([
    prisma.studentEnrollment.count({ where: { schoolId: school.id } }),
    prisma.teacher.count({ where: { schoolId: school.id } }),
    prisma.classroom.count({ where: { schoolId: school.id } }),
    prisma.academicYear.count({ where: { schoolId: school.id } }),
    prisma.userSchool.count({ where: { schoolId: school.id } }),
  ]);

  console.log(`  ${school.label}`);
  console.log(`    ID:       ${school.id}`);
  console.log(`    Name:     ${school.name}`);
  console.log(`    Location: ${school.city}, ${school.state} (${school.cityCode})`);
  console.log(
    `    Records:  ${enrollments} enrollments, ${teachers} teachers, ${classrooms} classrooms, ${academicYears} years, ${userSchools} user links`
  );
}

async function main() {
  const { dryRun, yes, explicitIds } = parseArgs();
  const schools = await resolveTargets(explicitIds);

  console.log("");
  console.log("FWIS delete schools");
  console.log("===================");
  console.log(`Targets: ${schools.length} school(s)`);
  console.log("");

  for (const school of schools) {
    await previewSchool(school);
    console.log("");
  }

  if (dryRun) {
    console.log("Dry run — no changes made.");
    return;
  }

  if (!yes) {
    const ok = await confirmDelete(
      "This permanently deletes the schools above and all related data."
    );
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  const totals: PurgeCounts[] = [];
  for (const school of schools) {
    console.log(`Deleting ${school.name} (${school.id})...`);
    const counts = await purgeSchool(prisma, school.id);
    totals.push(counts);
  }

  console.log("");
  console.log("Delete complete (totals):");
  console.log(formatPurgeCounts(sumPurgeCounts(totals)));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
