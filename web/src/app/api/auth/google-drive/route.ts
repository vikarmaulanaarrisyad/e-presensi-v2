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
    const madrasahId = searchParams.get("madrasahId") || user.madrasahId;

    if (!madrasahId) {
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

    const authUrl = getGoogleDriveAuthUrl(madrasahId);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google Drive Auth Route Error:", error);
    return NextResponse.redirect(
      new URL("/admin/settings?drive_error=auth_failed", request.url)
    );
  }
}
