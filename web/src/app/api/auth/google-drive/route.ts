import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleDriveAuthUrl } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user || (user.role !== "ADMIN_MADRASAH" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    let targetMadrasahId = user.madrasahId;

    if (user.role === "SUPERADMIN") {
      const queryMadrasahId = searchParams.get("madrasahId");
      if (queryMadrasahId && queryMadrasahId.trim().length > 0) {
        targetMadrasahId = queryMadrasahId.trim();
      }
    } else if (user.role === "ADMIN_MADRASAH") {
      // BOLA/IDOR protection: Admin Madrasah hanya boleh menghubungkan madrasah miliknya sendiri
      targetMadrasahId = user.madrasahId;
    }

    if (!targetMadrasahId) {
      return NextResponse.json(
        { error: "Madrasah ID diperlukan." },
        { status: 400 }
      );
    }

    // Periksa apakah Google Client ID & Secret sudah diset di .env
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/admin/settings?drive_error=missing_credentials", request.url)
      );
    }

    const authUrl = getGoogleDriveAuthUrl(targetMadrasahId, user.id);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google Drive Auth Route Error:", error);
    return NextResponse.redirect(
      new URL("/admin/settings?drive_error=auth_failed", request.url)
    );
  }
}
