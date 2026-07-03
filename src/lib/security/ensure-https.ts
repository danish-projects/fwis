import { NextResponse, type NextRequest } from "next/server";
import { isHttpsAppUrl, isProduction } from "@/lib/security/env";
import { applySecurityHeaders } from "@/lib/security/security-headers";
import { getPublicOrigin, isInternalHost } from "@/lib/security/request-origin";

/**
 * Redirect HTTP to HTTPS when behind a reverse proxy (Vercel, nginx, etc.).
 * Skips HTTP-only hosts (e.g. SmarterASP dtempurl.com) and IIS internal localhost ports.
 */
export function ensureHttpsRedirect(request: NextRequest): NextResponse | null {
  if (!isProduction() || !isHttpsAppUrl()) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (!forwardedProto || forwardedProto === "https") return null;

  const origin = getPublicOrigin(request);
  const hostname = new URL(origin).hostname;
  if (isInternalHost(hostname)) return null;

  const url = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    origin
  );
  url.protocol = "https:";
  return applySecurityHeaders(NextResponse.redirect(url, 308));
}
