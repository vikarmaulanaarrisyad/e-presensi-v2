import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeAndConnectMadrasah, verifyOAuthState } from "@/lib/google-drive";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL(request.url).origin;

  if (error || !code || !state) {
    console.error("Google Drive OAuth Callback Error:", error);
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?drive_status=cancelled`
    );
  }

  // 1. Verifikasi Cryptographic HMAC CSRF State Token
  const verifiedState = verifyOAuthState(state);
  if (!verifiedState) {
    console.error("Google Drive OAuth Callback: Token CSRF state tidak valid atau kadaluarsa.");
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?drive_status=error&msg=${encodeURIComponent("Token keamanan CSRF tidak valid atau telah kadaluarsa (maksimal 15 menit).")}`
    );
  }

  // 2. Verifikasi Sesi Pengguna & Otorisasi Lembaga
  const session = await auth();
  const sessionUser = session?.user as any;

  if (!sessionUser) {
    return NextResponse.redirect(
      `${baseUrl}/login?callbackUrl=${encodeURIComponent("/admin/settings")}`
    );
  }

  if (
    sessionUser.role !== "SUPERADMIN" &&
    (sessionUser.madrasahId !== verifiedState.madrasahId || sessionUser.id !== verifiedState.userId)
  ) {
    console.error("Google Drive OAuth Callback: Mismatch session vs state madrasah.");
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?drive_status=error&msg=${encodeURIComponent("Akses ditolak: Sesi akun Anda tidak sesuai dengan otorisasi madrasah ini.")}`
    );
  }

  try {
    await exchangeCodeAndConnectMadrasah(code, verifiedState.madrasahId);
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?drive_status=connected`
    );
  } catch (err: any) {
    console.error("Gagal menukar kode Google Drive:", err);
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?drive_status=error&msg=${encodeURIComponent(err.message || "Gagal menghubungkan")}`
    );
  }
}
