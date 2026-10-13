import { NextRequest, NextResponse } from "next/server";
import {
  getMadrasahByApiKey,
  processFingerprintAttendanceBatch,
  type FingerprintRawLog,
} from "@/server/repositories/fingerprint.repo";

function extractApiKey(request: NextRequest): string | null {
  // 1. Cek header x-api-key
  const headerKey = request.headers.get("x-api-key");
  if (headerKey && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  // 2. Cek Authorization: Bearer <key>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  // 3. Cek query parameter ?apiKey=...
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("apiKey");
  if (queryKey && queryKey.trim().length > 0) {
    return queryKey.trim();
  }

  return null;
}

/**
 * GET /api/fingerprint/sync
 * Endpoint Healthcheck & Test Koneksi Bridge Agent
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key diperlukan. Gunakan header 'x-api-key' atau 'Authorization: Bearer <KEY>'.",
        },
        { status: 401 }
      );
    }

    const madrasah = await getMadrasahByApiKey(apiKey);
    if (!madrasah) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key tidak valid atau madrasah tidak ditemukan.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Koneksi Bridge Agent ke Cloud E-Presensi Berhasil!",
      madrasah: {
        id: madrasah.id,
        name: madrasah.name,
        nsm: madrasah.nsm,
        lastSync: (madrasah as any).fingerprintLastSync || null,
        settings: {
          workStartTime: (madrasah as any).settings?.workStartTime || "07:00",
          lateThreshold: (madrasah as any).settings?.lateThreshold || "07:15",
          workEndTime: (madrasah as any).settings?.workEndTime || "14:00",
        },
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("API Fingerprint GET Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fingerprint/sync
 * Menerima Batch Log Presensi dari Bridge Agent di PC lokal sekolah
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key diperlukan. Gunakan header 'x-api-key' atau 'Authorization: Bearer <KEY>'.",
        },
        { status: 401 }
      );
    }

    const madrasah = await getMadrasahByApiKey(apiKey);
    if (!madrasah) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key tidak valid atau madrasah tidak ditemukan.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Payload request body JSON tidak valid." },
        { status: 400 }
      );
    }

    // Normalisasi format logs
    let rawLogs: FingerprintRawLog[] = [];
    let source: "AGENT" | "MANUAL_USB" | "ADMS" = "AGENT";

    if (Array.isArray(body)) {
      rawLogs = body;
    } else if (body.logs && Array.isArray(body.logs)) {
      rawLogs = body.logs;
      if (body.source) source = body.source;
    } else if (body.pin && body.timestamp) {
      // Single log scan
      rawLogs = [body];
    }

    if (rawLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada data log yang perlu disinkronkan.",
        result: {
          totalRecords: 0,
          insertedCount: 0,
          updatedCount: 0,
          ignoredCount: 0,
          unmappedPins: [],
        },
      });
    }

    // Eksekusi pemrosesan presensi
    const result = await processFingerprintAttendanceBatch(
      madrasah.id,
      rawLogs,
      source
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      result,
    });
  } catch (error: any) {
    console.error("API Fingerprint POST Sync Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
