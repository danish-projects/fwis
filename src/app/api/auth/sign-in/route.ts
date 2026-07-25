import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { applySecurityHeaders } from "@/lib/security/security-headers";
import {
  LOGIN_USER_ID_REGEX,
  toLoginUserId,
} from "@/lib/auth/login-user-id";

const signInSchema = z.object({
  userId: z
    .string()
    .min(2)
    .transform(toLoginUserId)
    .refine((value) => LOGIN_USER_ID_REGEX.test(value), "Invalid user id"),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid request" }, { status: 400 })
    );
  }

  // Accept legacy `{ email }` payloads during transition.
  const raw =
    body && typeof body === "object"
      ? {
          userId:
            "userId" in body
              ? (body as { userId?: unknown }).userId
              : (body as { email?: unknown }).email,
          password: (body as { password?: unknown }).password,
        }
      : body;

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid user id or password" }, { status: 400 })
    );
  }

  const userId = parsed.data.userId;
  const appUser = await prisma.appUser.findUnique({ where: { userId } });

  if (!appUser?.isActive || !appUser.passwordHash) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid user id or password" }, { status: 401 })
    );
  }

  const valid = await verifyPassword(parsed.data.password, appUser.passwordHash);
  if (!valid) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid user id or password" }, { status: 401 })
    );
  }

  const response = NextResponse.json({ success: true });
  await setSessionCookie(response, appUser.id);
  return applySecurityHeaders(response);
}
