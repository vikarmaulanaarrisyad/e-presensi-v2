import { NextRequest, NextResponse } from "next/server";
import {
  getMadrasahByApiKey,
  getTeachersForFingerprintMapping,
} from "@/server/repositories/fingerprint.repo";

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

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key diperlukan." },
        { status: 401 }
      );
    }

    const madrasah = await getMadrasahByApiKey(apiKey);
    if (!madrasah) {
      return NextResponse.json(
        { error: "API Key tidak valid." },
        { status: 403 }
      );
    }

    const teachers = await getTeachersForFingerprintMapping(madrasah.id);

    return NextResponse.json({
      success: true,
      madrasah: {
        id: madrasah.id,
        name: madrasah.name,
      },
      teachers: teachers.map((t: any) => ({
        id: t.id,
        name: t.name,
        nip: t.nip,
        pin: t.fingerprintPin || null,
        position: t.position?.name || "-",
      })),
    });
  } catch (error: any) {
    console.error("API Fingerprint Teachers Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
