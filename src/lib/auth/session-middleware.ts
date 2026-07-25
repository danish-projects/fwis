import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/security/request-origin";
import {
  clearSessionCookie,
  readSessionFromRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-cookie";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const session = await readSessionFromRequest(request);

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const isPublicRoute = pathname === "/";
  const isApiRoute = pathname.startsWith("/api/");

  if (!session && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    const url = publicUrl(request, "/login");
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (session && isAuthRoute) {
    const url = publicUrl(request, "/dashboard");
    return NextResponse.redirect(url);
  }

  return response;
}

export function clearSessionOnResponse(request: NextRequest, response: NextResponse) {
  request.cookies.delete(SESSION_COOKIE_NAME);
  clearSessionCookie(response);
}
