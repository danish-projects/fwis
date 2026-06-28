import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js uses .env.local for Supabase; Prisma CLI only reads .env by default.
loadEnv({ path: path.resolve(".env") });
loadEnv({ path: path.resolve(".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI (migrate, db push) needs a direct connection — not the Supabase pooler.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
