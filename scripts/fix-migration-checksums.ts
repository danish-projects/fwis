/**
 * Sync _prisma_migrations.checksum with on-disk migration.sql files.
 * Use when Prisma reports migrations were "modified after they were applied"
 * but the database schema is already correct (e.g. line-ending or comment edits).
 *
 * Usage: npx dotenv -e .env.local -- tsx scripts/fix-migration-checksums.ts
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "path";
import { createPrismaClient } from "../src/lib/prisma";

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

function checksumForMigration(migrationName: string): string {
  const filePath = path.join(migrationsDir, migrationName, "migration.sql");
  const content = fs.readFileSync(filePath, "utf8");
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function main() {
  const prisma = createPrismaClient();
  const rows = await prisma.$queryRaw<
    Array<{ migration_name: string; checksum: string }>
  >`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY finished_at`;

  console.log("Current migration checksums in database:\n");
  for (const row of rows) {
    const onDisk = checksumForMigration(row.migration_name);
    const match = onDisk === row.checksum;
    console.log(`${match ? "OK" : "MISMATCH"} ${row.migration_name}`);
    if (!match) {
      console.log(`  db:   ${row.checksum}`);
      console.log(`  disk: ${onDisk}`);
      await prisma.$executeRaw`
        UPDATE _prisma_migrations
        SET checksum = ${onDisk}
        WHERE migration_name = ${row.migration_name}
      `;
      console.log("  -> updated");
    }
  }

  await prisma.$disconnect();
  console.log("\nDone. Run: npm run db:migrate");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
