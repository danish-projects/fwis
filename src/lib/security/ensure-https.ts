import { NextResponse, type NextRequest } from "next/server";
import { isProduction } from "@/lib/security/env";
import { applySecurityHeaders } from "@/lib/security/security-headers";

/**
 * Redirect HTTP to HTTPS when behind a reverse proxy (Vercel, nginx, etc.).
 * Local `npm run dev` stays on http://localhost.
 */
export function ensureHttpsRedirect(request: NextRequest): NextResponse | null {
  if (!isProduction()) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto && forwardedProto !== "https") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return applySecurityHeaders(NextResponse.redirect(url, 308));
  }

  return null;
}
