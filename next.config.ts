import type { NextConfig } from "next";

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

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Do not send `X-Powered-By: Next.js` (reduces stack fingerprinting). */
  poweredByHeader: false,
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
