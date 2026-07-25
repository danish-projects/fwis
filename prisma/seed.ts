import { config } from "dotenv";
import path from "node:path";
import { UserRoleCode } from "@prisma/client";
import { createPrismaClient } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { toLoginUserId } from "../src/lib/auth/login-user-id";
import { seedLookupTables } from "./seed-lookups";
import {
  seedDefaultLoginsForSeedSchools,
  seedFoundationFromProd,
} from "./seed-foundation";
import { SUPER_ADMIN_ID } from "../scripts/demo-users";
import { resolveRoleDefaultPassword } from "../src/lib/school/default-login-specs";

const rootDir = process.cwd();
// Preserve URLs already set by dotenv-cli (e.g. `dotenv -e .env.stage -- …`).
const cliDirectUrl = process.env.DIRECT_URL;
const cliDatabaseUrl = process.env.DATABASE_URL;
config({ path: path.join(rootDir, ".env") });
config({ path: path.join(rootDir, ".env.local"), override: true });
if (cliDirectUrl) process.env.DIRECT_URL = cliDirectUrl;
if (cliDatabaseUrl) process.env.DATABASE_URL = cliDatabaseUrl;

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL is missing. Configure .env.local before running the seed."
  );
}

const prisma = createPrismaClient(databaseUrl);

async function seedSuperAdmin() {
  const loginUserId = toLoginUserId(
    process.env.SEED_SUPER_ADMIN_USER_ID ??
      process.env.SEED_SUPER_ADMIN_EMAIL ??
      "majlis"
  );
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      `SEED_SUPER_ADMIN_PASSWORD is required. Suggested default: ${resolveRoleDefaultPassword("NIGRA")}`
    );
  }

  const passwordHash = await hashPassword(password);
  const superAdminRole = await prisma.role.findUnique({
    where: { code: "NIGRA" },
  });
  if (!superAdminRole) {
    throw new Error("NIGRA role missing after role seed.");
  }

  await prisma.appUser.upsert({
    where: { id: SUPER_ADMIN_ID },
    update: {
      userId: loginUserId,
      fullName: "FWIS Nigran",
      passwordHash,
      isActive: true,
    },
    create: {
      id: SUPER_ADMIN_ID,
      userId: loginUserId,
      fullName: "FWIS Nigran",
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: SUPER_ADMIN_ID, roleId: superAdminRole.id },
    },
    update: {},
    create: { userId: SUPER_ADMIN_ID, roleId: superAdminRole.id },
  });

  console.log(`Super admin ready: ${loginUserId}`);
}

async function main() {
  console.log("Seeding FWIS database...");

  await seedLookupTables(prisma);

  await Promise.all(
    (
      [
        ["NIGRA", "Nigran"],
        ["PRINCIPAL", "Principal"],
        ["SCHOOL_ADMIN", "School Admin"],
        ["TEACHER", "Teacher"],
        ["SUBSTITUTE", "Substitute"],
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

  await seedSuperAdmin();
  await seedFoundationFromProd(prisma);
  await seedDefaultLoginsForSeedSchools(prisma);

  console.log("Seed complete.");
  console.log(
    "Foundation: 5 schools, 2026-2027 year, calendars, Grade 1–6 links, 17 default users/school."
  );
  console.log("Use npm run import:school to load students and staff.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
