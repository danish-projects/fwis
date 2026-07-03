import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseCookieOptions } from "@/lib/security/cookie-options";
import { publicUrl } from "@/lib/security/request-origin";

function isSupabaseAuthCookie(name: string) {
  return (
    name.startsWith("sb-") &&
    (name.includes("auth-token") || name.includes("code-verifier"))
  );
}

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  const cookieOptions = supabaseCookieOptions();
  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) continue;
    request.cookies.delete(cookie.name);
    response.cookies.set(cookie.name, "", {
      ...cookieOptions,
      maxAge: 0,
    });
  }
}

/** Preserve Set-Cookie headers when returning a redirect instead of next(). */
function withSessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;

    // Stale cookies after seed/setup or revoked sessions leave a refresh token
    // that no longer exists. Clear them so the user can sign in again.
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
      clearAuthCookies(request, supabaseResponse);
      user = null;
    }
  } catch {
    // Supabase unreachable (offline, bad env, etc.) — treat as signed out.
    clearAuthCookies(request, supabaseResponse);
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const isPublicRoute = pathname === "/";
  const isApiRoute = pathname.startsWith("/api/");

  if (user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    const { data: appUser, error } = await supabase
      .from("app_users")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && appUser && !appUser.is_active) {
      await supabase.auth.signOut({ scope: "local" });
      clearAuthCookies(request, supabaseResponse);
      const url = publicUrl(request, "/login");
      url.searchParams.set("error", "inactive");
      return withSessionCookies(supabaseResponse, NextResponse.redirect(url));
    }
  }

  if (!user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    const url = publicUrl(request, "/login");
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return withSessionCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (user && isAuthRoute) {
    return withSessionCookies(
      supabaseResponse,
      NextResponse.redirect(publicUrl(request, "/dashboard"))
    );
  }

  return supabaseResponse;
}
