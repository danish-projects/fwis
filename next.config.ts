import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/security-headers";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
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
