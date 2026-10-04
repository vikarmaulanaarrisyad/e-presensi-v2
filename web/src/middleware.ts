import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Session cookie detection (compatible with both http and https NextAuth v5 cookies)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthPage = pathname === "/login";
  const isGuruAuthPage = pathname === "/guru/login";
  const isProtectedAdminPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin");
  const isProtectedGuruPage =
    pathname.startsWith("/guru") && !pathname.startsWith("/guru/login");

  // If this is a Server Action request, bypass page-level redirect so Next.js receives a valid RSC payload
  // Server Actions handle authentication and return structured error messages via requireAuth()
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  // Developer testing override via query param ?nip=
  if (searchParams.has("nip")) {
    return NextResponse.next();
  }

  // If visiting protected admin/superadmin page without any session cookie, redirect to /login
  if (isProtectedAdminPage && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If visiting protected guru mobile page without any session cookie, redirect to /guru/login
  if (isProtectedGuruPage && !sessionToken) {
    const loginUrl = new URL("/guru/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting web admin /login, redirect to /admin
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // If already logged in and visiting /guru/login, redirect to /guru
  if (isGuruAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/guru", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/login",
    "/guru/:path*",
    "/guru",
  ],
};
