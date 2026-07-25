import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Capture URLs already set by the shell / dotenv-cli (e.g. `dotenv -e .env.stage -- …`)
// before file loads, then restore them so .env.local cannot clobber an explicit target.
const cliDirectUrl = process.env.DIRECT_URL;
const cliDatabaseUrl = process.env.DATABASE_URL;

loadEnv({ path: path.resolve(".env") });
loadEnv({
  path: path.resolve(process.env.PRISMA_ENV_FILE ?? ".env.local"),
  override: true,
});

if (cliDirectUrl) process.env.DIRECT_URL = cliDirectUrl;
if (cliDatabaseUrl) process.env.DATABASE_URL = cliDatabaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI (migrate, db push) uses DIRECT_URL from env.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
