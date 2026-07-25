import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { applySecurityHeaders } from "@/lib/security/security-headers";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return applySecurityHeaders(response);
}
