import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeAndConnectMadrasah } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateMadrasahId = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL(request.url).origin;

  if (error || !code || !stateMadrasahId) {
    console.error("Google Drive OAuth Callback Error:", error);
    return NextResponse.redirect(
      `${baseUrl}/admin/settings?drive_status=cancelled`
    );
  }

  try {
    await exchangeCodeAndConnectMadrasah(code, stateMadrasahId);
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
