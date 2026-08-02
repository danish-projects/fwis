import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type LogLevel = "query" | "info" | "warn" | "error";

/** Structural pool options — avoid @types/pg vs @prisma/adapter-pg PoolConfig mismatch. */
type PgPoolOptions = {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
  max?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  allowExitOnIdle?: boolean;
  /** Passed to libpq — forces CURRENT_TIMESTAMP into school timezone for naive timestamps. */
  options?: string;
};

function isRemoteHostedPostgres(url: string): boolean {
  return url.includes("site4now.net");
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

function schoolPgTimeZoneOption(): string {
  const zone = process.env.SCHOOL_TIMEZONE?.trim() || "America/Chicago";
  // libpq options: -c TimeZone=America/Chicago
  return `-c TimeZone=${zone}`;
}

function createPgPoolConfig(rawUrl: string): PgPoolOptions {
  const timeZoneOption = schoolPgTimeZoneOption();

  if (!isRemoteHostedPostgres(rawUrl)) {
    return { connectionString: rawUrl, options: timeZoneOption };
  }

  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";
  // SmarterASP shared plans allow few concurrent connections; keep the pool small.
  const max = Number(process.env.DATABASE_POOL_MAX ?? 5);
  const connectionTimeoutMillis = Number(
    process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 15_000
  );

  return {
    connectionString: stripSslQueryParams(rawUrl),
    ssl: { rejectUnauthorized },
    max: Number.isFinite(max) && max > 0 ? max : 5,
    // Fail fast instead of hanging when the host/port is unreachable (e.g. :5432).
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis)
      ? connectionTimeoutMillis
      : 15_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
    options: timeZoneOption,
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

/** Bump when schema/runtime client shape changes so HMR does not reuse a stale client. */
const PRISMA_CLIENT_CACHE_KEY = "fwis-prisma-20250802-school-tz";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaCacheKey?: string;
};

function resolvePrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaCacheKey === PRISMA_CLIENT_CACHE_KEY
  ) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaCacheKey = PRISMA_CLIENT_CACHE_KEY;
  }
  return client;
}

export const prisma = resolvePrismaClient();
