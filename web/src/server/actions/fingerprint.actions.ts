"use server";

import {
  getFingerprintConfig,
  regenerateFingerprintApiKey,
  updateFingerprintNetworkConfig,
  getTeachersForFingerprintMapping,
  updateTeacherFingerprintPin,
  autoAssignFingerprintPins,
  getFingerprintSyncLogs,
  processFingerprintAttendanceBatch,
  type FingerprintRawLog,
} from "@/server/repositories/fingerprint.repo";
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";
import { revalidatePath } from "next/cache";

export async function fetchFingerprintData(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const [config, teachers, syncLogs] = await Promise.all([
      getFingerprintConfig(targetMadrasahId),
      getTeachersForFingerprintMapping(targetMadrasahId),
      getFingerprintSyncLogs(targetMadrasahId, 15),
    ]);

    return {
      success: true,
      data: {
        config,
        teachers,
        syncLogs,
      },
    };
  } catch (error: any) {
    console.error("Gagal memuat data integrasi fingerprint:", error);
    return { error: error?.message || "Gagal memuat data integrasi mesin fingerprint." };
  }
}

export async function regenerateApiKeyAction(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const updated = await regenerateFingerprintApiKey(targetMadrasahId);
    revalidatePath("/admin/fingerprint");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal generate ulang API Key:", error);
    return { error: error?.message || "Gagal memperbarui API Key." };
  }
}

export async function saveFingerprintNetworkAction(
  madrasahId: string,
  ip: string,
  port: number
) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const updated = await updateFingerprintNetworkConfig(targetMadrasahId, ip, port);
    revalidatePath("/admin/fingerprint");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal menyimpan konfigurasi IP mesin:", error);
    return { error: error?.message || "Gagal menyimpan konfigurasi IP mesin." };
  }
}

export async function saveTeacherPinAction(
  madrasahId: string,
  teacherId: string,
  pin: string | null
) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const updated = await updateTeacherFingerprintPin(targetMadrasahId, teacherId, pin);
    revalidatePath("/admin/fingerprint");
    revalidatePath("/admin/teachers");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal menyimpan PIN guru:", error);
    return { error: error?.message || "Gagal menyimpan PIN guru." };
  }
}

export async function autoAssignPinsAction(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const result = await autoAssignFingerprintPins(targetMadrasahId);
    revalidatePath("/admin/fingerprint");
    revalidatePath("/admin/teachers");

    return { success: true, count: result.assignedCount };
  } catch (error: any) {
    console.error("Gagal auto-assign PIN guru:", error);
    return { error: error?.message || "Gagal membuat PIN otomatis untuk guru." };
  }
}

/**
 * Server Action untuk mengimpor file export USB Flashdisk dari mesin Solution
 * Mendukung format teks/DAT/CSV standar mesin Solution / ZKTeco:
 * Baris: PIN \t YYYY-MM-DD HH:mm:ss \t Status
 * Atau: PIN, YYYY-MM-DD HH:mm:ss
 */
export async function uploadManualUsbLogAction(
  madrasahId: string,
  fileContent: string
) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    if (!fileContent || fileContent.trim().length === 0) {
      return { error: "File log kosong atau tidak terbaca." };
    }

    const lines = fileContent.split(/\r?\n/);
    const parsedLogs: FingerprintRawLog[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || line.toLowerCase().startsWith("pin") || line.toLowerCase().startsWith("user")) {
        continue;
      }

      // Deteksi delimiter: tab, koma, spasi ganda, titik koma
      let parts: string[] = [];
      if (line.includes("\t")) {
        parts = line.split("\t");
      } else if (line.includes(",")) {
        parts = line.split(",");
      } else if (line.includes(";")) {
        parts = line.split(";");
      } else {
        // Space separated
        parts = line.split(/\s+/);
      }

      parts = parts.map((p) => p.trim()).filter(Boolean);

      if (parts.length >= 2) {
        const pin = parts[0];
        // Tanggal dan waktu bisa terpisah oleh spasi jika delimiter koma/tab
        let timestampStr = parts[1];
        if (parts.length >= 3 && parts[1].length === 10 && parts[2].includes(":")) {
          timestampStr = `${parts[1]} ${parts[2]}`;
        }

        const dateTest = new Date(timestampStr);
        if (!isNaN(dateTest.getTime())) {
          parsedLogs.push({
            pin,
            timestamp: timestampStr,
          });
        }
      }
    }

    if (parsedLogs.length === 0) {
      return {
        error:
          "Format file tidak dikenali. Pastikan file berisi kolom PIN dan Tanggal Jam presensi (misal: '1\\t2026-10-13 07:15:00').",
      };
    }

    const result = await processFingerprintAttendanceBatch(
      targetMadrasahId,
      parsedLogs,
      "MANUAL_USB"
    );

    revalidatePath("/admin/fingerprint");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/bulk-attendance");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Gagal mengimpor file log USB:", error);
    return { error: error?.message || "Gagal memproses file presensi USB." };
  }
}
