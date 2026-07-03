import type { CookieOptions } from "@supabase/ssr";
import { isHttpsAppUrl } from "@/lib/security/env";

const secure = isHttpsAppUrl();

/** Shared defaults for app-set cookies (academic year, etc.). */
export function appCookieOptions(
  overrides: Partial<CookieOptions> = {}
): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure,
    httpOnly: true,
    ...overrides,
  };
}

/** Supabase Auth session cookies — must be readable by the browser client. */
export function supabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure,
  };
}
