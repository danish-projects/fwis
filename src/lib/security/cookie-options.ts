import { isHttpsAppUrl } from "@/lib/security/env";

export type AppCookieOptions = {
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
};

const secure = isHttpsAppUrl();

/** Shared defaults for app-set cookies (session, academic year, etc.). */
export function appCookieOptions(
  overrides: Partial<AppCookieOptions> = {}
): AppCookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure,
    httpOnly: true,
    ...overrides,
  };
}
