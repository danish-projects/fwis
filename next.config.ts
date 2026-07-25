import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Duplicated here (not imported from src/) so next.config.ts loads without path aliases. */
const SECURITY_HEADERS: { key: string; value: string }[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const isProduction = process.env.NODE_ENV === "production";
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || readPackageVersion();
function resolveAppEnv(): string {
  const raw = (
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    ""
  )
    .trim()
    .toLowerCase();
  if (raw === "stage" || raw === "staging") return "stage";
  if (raw === "prod" || raw === "production") return "prod";
  if (raw === "local" || raw === "development" || raw === "dev") return "local";
  // Legacy hosting files used NODE_ENV=stage
  if (process.env.NODE_ENV === "stage" || process.env.NODE_ENV === "staging") {
    return "stage";
  }
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "local"
  ) {
    return "local";
  }
  return "prod";
}

const appEnv = resolveAppEnv();

const nextConfig: NextConfig = {
  output: "standalone",
  /** Do not send `X-Powered-By: Next.js` (reduces stack fingerprinting). */
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_APP_ENV: appEnv,
  },
  outputFileTracingIncludes: {
    "/*": [
      "./src/generated/prisma/**/*",
      "./public/certificates/**/*",
      "./src/assets/rankings/**/*",
    ],
  },
  typescript: {
    ignoreBuildErrors: process.env.FWIS_HOSTING_BUILD === "1",
  },
  async headers() {
    if (!isProduction) return [];

    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
