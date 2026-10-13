import { NextRequest, NextResponse } from "next/server";
import {
  generateSolutionUserDat,
  getMadrasahByApiKey,
} from "@/server/repositories/fingerprint.repo";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const headerKey = request.headers.get("x-api-key");
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("apiKey");

    let apiKey = headerKey;
    if (!apiKey && authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.replace("Bearer ", "").trim();
    }
    if (!apiKey && queryKey) {
      apiKey = queryKey.trim();
    }

    let targetMadrasahId: string | null = null;

    if (apiKey) {
      const madrasah = await getMadrasahByApiKey(apiKey);
      if (madrasah) {
        targetMadrasahId = madrasah.id;
      }
    }

    if (!targetMadrasahId) {
      const session = await auth();
      if (session?.user?.madrasahId) {
        targetMadrasahId = session.user.madrasahId;
      }
    }

    if (!targetMadrasahId) {
      return NextResponse.json(
        { error: "Akses ditolak: Autentikasi sesi atau API Key diperlukan." },
        { status: 401 }
      );
    }

    const content = await generateSolutionUserDat(targetMadrasahId);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="user.dat"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("API Export Users Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
