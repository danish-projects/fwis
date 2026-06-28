import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type LogLevel = "query" | "info" | "warn" | "error";

function secureConnectionString(url: string): string {
  if (!url.includes("supabase.com") && !url.includes("supabase.co")) {
    return url;
  }
  if (/[?&]sslmode=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

export function createPrismaClient(connectionString?: string) {
  const rawUrl =
    connectionString ?? process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL is not set");
  }

  const url = secureConnectionString(rawUrl);
  const adapter = new PrismaPg({ connectionString: url });
  const log: LogLevel[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  return new PrismaClient({ adapter, log });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && "gradingScaleConfig" in cached) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = resolvePrismaClient();
