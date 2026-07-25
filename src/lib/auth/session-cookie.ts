import type { NextRequest, NextResponse } from "next/server";
import { appCookieOptions } from "@/lib/security/cookie-options";

export const SESSION_COOKIE_NAME = "fwis_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type SessionPayload = {
  userId: string;
  exp: number;
};

function getSessionSecret(): string | null {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function signPayload(encodedPayload: string): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(encodedPayload)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(userId: string): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error(
      "AUTH_SESSION_SECRET must be set to a random string of at least 32 characters"
    );
  }

  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(encoded);
  if (!signature) {
    throw new Error(
      "AUTH_SESSION_SECRET must be set to a random string of at least 32 characters"
    );
  }
  return `${encoded}.${signature}`;
}

export async function parseSessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = await signPayload(encoded);
  if (!expected) return null;

  const signatureBytes = base64UrlToBytes(signature);
  const expectedBytes = base64UrlToBytes(expected);
  if (!timingSafeEqualBytes(signatureBytes, expectedBytes)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      textDecoder.decode(base64UrlToBytes(encoded))
    ) as SessionPayload;
    if (!payload.userId || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  return parseSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createSessionToken(userId),
    appCookieOptions({ maxAge: SESSION_MAX_AGE_SECONDS })
  );
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    appCookieOptions({ maxAge: 0 })
  );
}
