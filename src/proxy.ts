import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refreshes the session if expired — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A Server Action posts to the page it was called from, and expects an RSC action result
  // back. Answering with a redirect hands the client an HTML document instead — which is the
  // "An unexpected response was received from the server." the browser reports, with the
  // action never running. Every action validates its own auth and redirects through
  // next/navigation, which the client does understand, so they are let past the two redirects
  // below. The getUser() above has already refreshed the session onto `response`.
  if (request.headers.get("next-action")) return response;

  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  // /join = invite links: the route handler captures the token for signed-out
  // visitors (sets a cookie, sends to signup), so it must not be forced to login.
  const isPublicPath = pathname.startsWith("/home") || pathname.startsWith("/join");

  if (
    !user &&
    !isAuthPath &&
    !isPublicPath &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/_next")
  ) {
    const url = request.nextUrl.clone();
    // Root routes to the landing; anything else asks for login.
    url.pathname = pathname === "/" ? "/home" : "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and images.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
