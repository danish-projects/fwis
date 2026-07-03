import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseCookieOptions } from "@/lib/security/cookie-options";
import { publicUrl } from "@/lib/security/request-origin";

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
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // Supabase unreachable (offline, bad env, etc.) — treat as signed out.
  }

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = request.nextUrl.pathname === "/";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    const { data: appUser, error } = await supabase
      .from("app_users")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && appUser && !appUser.is_active) {
      await supabase.auth.signOut();
      const url = publicUrl(request, "/login");
      url.searchParams.set("error", "inactive");
      return NextResponse.redirect(url);
    }
  }

  if (!user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    const url = publicUrl(request, "/login");
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(publicUrl(request, "/dashboard"));
  }

  return supabaseResponse;
}
