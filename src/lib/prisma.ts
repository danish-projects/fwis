import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type LogLevel = "query" | "info" | "warn" | "error";

/** Structural pool options — avoid @types/pg vs @prisma/adapter-pg PoolConfig mismatch. */
type PgPoolOptions = {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
};

function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.com") || url.includes("supabase.co");
}

/** Remove sslmode params so pg uses the explicit `ssl` config instead. */
function stripSslQueryParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&])sslmode=[^&]*(?=&|$)/g, "$1")
      .replace(/([?&])uselibpqcompat=[^&]*(?=&|$)/g, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

function createPgPoolConfig(rawUrl: string): PgPoolOptions {
  if (!isSupabaseUrl(rawUrl)) {
    return { connectionString: rawUrl };
  }

  const connectionString = stripSslQueryParams(rawUrl);
  // Supabase pooler certs often fail strict verification on shared Windows hosts.
  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

  return {
    connectionString,
    ssl: { rejectUnauthorized },
  };
}

export function createPrismaClient(connectionString?: string) {
  const rawUrl =
    connectionString ?? process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL is not set");
  }

  const adapter = new PrismaPg(
    createPgPoolConfig(rawUrl) as ConstructorParameters<typeof PrismaPg>[0]
  );
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
