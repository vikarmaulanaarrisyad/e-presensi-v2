import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Session cookie detection (compatible with both http and https NextAuth v5 cookies)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthPage = pathname === "/login";
  const isProtectedPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin");

  // If this is a Server Action request, bypass page-level redirect so Next.js receives a valid RSC payload
  // Server Actions handle authentication and return structured error messages via requireAuth()
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  // If visiting protected admin/superadmin page without any session cookie, redirect to /login
  if (isProtectedPage && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting web admin /login, redirect to /admin
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/login",
  ],
};
