import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ensureHttpsRedirect } from "@/lib/security/ensure-https";
import { applySecurityHeaders } from "@/lib/security/security-headers";
import { rateLimitRequest } from "@/lib/security/rate-limit";

export async function middleware(request: NextRequest) {
  const rateLimited = rateLimitRequest(request);
  if (rateLimited) return applySecurityHeaders(rateLimited);

  const httpsRedirect = ensureHttpsRedirect(request);
  if (httpsRedirect) return httpsRedirect;

  const response = await updateSession(request);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
