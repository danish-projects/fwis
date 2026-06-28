import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export const RATE_LIMITS = {
  signIn: { limit: 10, windowMs: 15 * 60 * 1000 },
  loginPage: { limit: 60, windowMs: 15 * 60 * 1000 },
  authCallback: { limit: 30, windowMs: 15 * 60 * 1000 },
  export: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size <= 10_000) return;

  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

function resolveRateLimitConfig(
  pathname: string,
  method: string
): RateLimitConfig | null {
  if (pathname === "/api/auth/sign-in" && method === "POST") {
    return RATE_LIMITS.signIn;
  }
  if (pathname === "/login") return RATE_LIMITS.loginPage;
  if (pathname === "/auth/callback") return RATE_LIMITS.authCallback;
  if (pathname.startsWith("/api/export/")) return RATE_LIMITS.export;
  return null;
}

export function rateLimitRequest(request: NextRequest): NextResponse | null {
  const config = resolveRateLimitConfig(
    request.nextUrl.pathname,
    request.method
  );
  if (!config) return null;

  const ip = getClientIp(request);
  const key = `${request.nextUrl.pathname}:${ip}`;
  const result = checkRateLimit(key, config);

  if (result.allowed) return null;

  return new NextResponse("Too many requests. Please try again later.", {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSec ?? 60),
    },
  });
}
