import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface FingerprintRawLog {
  pin: string; // ID / PIN di mesin fingerprint Solution (deviceUserId)
  timestamp: string | Date; // Waktu tap sidik jari
  status?: number; // 0: Check-In, 1: Check-Out, 4: Overtime In, 5: Overtime Out, dll (opsional dari ZK)
  verifyType?: number; // 1: Fingerprint, 2: Password, 3: Card, dll
}

export interface ProcessSyncResult {
  totalRecords: number;
  insertedCount: number;
  updatedCount: number;
  ignoredCount: number;
  unmappedPins: string[];
  message: string;
}

/**
 * Generate a random cryptographically secure API Key for Madrasah machine integration
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(24).toString("hex");
  return `fp_sec_${random}`;
}

/**
 * Get or initialize Fingerprint configuration for a Madrasah
 */
export async function getFingerprintConfig(madrasahId: string) {
  const madrasah = await prisma.madrasah.findUnique({
    where: { id: madrasahId },
    select: {
      id: true,
      name: true,
      nsm: true,
      fingerprintApiKey: true,
      fingerprintIp: true,
      fingerprintPort: true,
      fingerprintLastSync: true,
    },
  });

  if (!madrasah) {
    throw new Error("Madrasah tidak ditemukan.");
  }

  // Jika belum punya API key, buatkan otomatis
  if (!madrasah.fingerprintApiKey) {
    const newKey = generateApiKey();
    const updated = await prisma.madrasah.update({
      where: { id: madrasahId },
      data: { fingerprintApiKey: newKey },
      select: {
        id: true,
        name: true,
        nsm: true,
        fingerprintApiKey: true,
        fingerprintIp: true,
        fingerprintPort: true,
        fingerprintLastSync: true,
      },
    });
    return updated;
  }

  return madrasah;
}

/**
 * Regenerate API Key for Madrasah
 */
export async function regenerateFingerprintApiKey(madrasahId: string) {
  const newKey = generateApiKey();
  return await prisma.madrasah.update({
    where: { id: madrasahId },
    data: { fingerprintApiKey: newKey },
    select: {
      id: true,
      fingerprintApiKey: true,
    },
  });
}

/**
 * Update IP & Port konfigurasi mesin lokal madrasah
 */
export async function updateFingerprintNetworkConfig(
  madrasahId: string,
  ip: string,
  port: number
) {
  return await prisma.madrasah.update({
    where: { id: madrasahId },
    data: {
      fingerprintIp: ip.trim(),
      fingerprintPort: port || 4370,
    },
  });
}

/**
 * Get all teachers with their assigned fingerprint PIN for mapping
 */
export async function getTeachersForFingerprintMapping(madrasahId: string) {
  return await prisma.user.findMany({
    where: {
      madrasahId,
      role: "TEACHER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      nip: true,
      nik: true,
      fingerprintPin: true,
      avatarUrl: true,
      position: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { fingerprintPin: "asc" },
      { name: "asc" },
    ],
  });
}

/**
 * Update PIN fingerprint seorang guru
 */
export async function updateTeacherFingerprintPin(
  madrasahId: string,
  teacherId: string,
  pin: string | null
) {
  const cleanedPin = pin && pin.trim().length > 0 ? pin.trim() : null;

  if (cleanedPin) {
    // Cek apakah PIN sudah digunakan guru lain di madrasah yang sama
    const duplicate = await prisma.user.findFirst({
      where: {
        madrasahId,
        fingerprintPin: cleanedPin,
        id: { not: teacherId },
      },
      select: { id: true, name: true },
    });

    if (duplicate) {
      throw new Error(
        `PIN "${cleanedPin}" sudah digunakan oleh guru lain (${duplicate.name}). Harap gunakan PIN berbeda.`
      );
    }
  }

  return await prisma.user.update({
    where: { id: teacherId },
    data: { fingerprintPin: cleanedPin },
  });
}

/**
 * Auto-assign sequential PIN (1, 2, 3, ...) ke guru yang belum punya PIN
 */
export async function autoAssignFingerprintPins(madrasahId: string) {
  const teachers = await prisma.user.findMany({
    where: {
      madrasahId,
      role: "TEACHER",
      isActive: true,
    },
    select: { id: true, name: true, fingerprintPin: true },
    orderBy: { name: "asc" },
  });

  const usedPins = new Set<number>();
  teachers.forEach((t) => {
    if (t.fingerprintPin) {
      const num = parseInt(t.fingerprintPin, 10);
      if (!isNaN(num)) usedPins.add(num);
    }
  });

  let nextPin = 1;
  const updates: Array<{ id: string; pin: string }> = [];

  for (const t of teachers) {
    if (!t.fingerprintPin) {
      while (usedPins.has(nextPin)) {
        nextPin++;
      }
      usedPins.add(nextPin);
      updates.push({ id: t.id, pin: String(nextPin) });
      nextPin++;
    }
  }

  // Lakukan update secara batch/sequential
  for (const item of updates) {
    await prisma.user.update({
      where: { id: item.id },
      data: { fingerprintPin: item.pin },
    });
  }

  return { assignedCount: updates.length };
}

/**
 * Ambil riwayat sync log mesin fingerprint
 */
export async function getFingerprintSyncLogs(madrasahId: string, limit = 20) {
  return await prisma.fingerprintSyncLog.findMany({
    where: { madrasahId },
    orderBy: { syncedAt: "desc" },
    take: limit,
  });
}

/**
 * Cari madrasah berdasarkan fingerprint API key
 */
export async function getMadrasahByApiKey(apiKey: string) {
  if (!apiKey || apiKey.trim().length === 0) return null;
  return await prisma.madrasah.findUnique({
    where: { fingerprintApiKey: apiKey.trim() },
    include: {
      settings: true,
    },
  });
}

/**
 * Inti Logika: Memproses batch data scan dari Mesin Solution
 * Menerima list tap sidik jari, mencocokkan PIN ke User, dan meng-upsert AttendanceLog
 */
export async function processFingerprintAttendanceBatch(
  madrasahId: string,
  rawLogs: FingerprintRawLog[],
  source: "AGENT" | "MANUAL_USB" | "ADMS" = "AGENT"
): Promise<ProcessSyncResult> {
  if (!rawLogs || rawLogs.length === 0) {
    return {
      totalRecords: 0,
      insertedCount: 0,
      updatedCount: 0,
      ignoredCount: 0,
      unmappedPins: [],
      message: "Tidak ada data scan yang diterima.",
    };
  }

  // 1. Ambil pengaturan jam kerja madrasah
  const madrasah = await prisma.madrasah.findUnique({
    where: { id: madrasahId },
    include: { settings: true },
  });

  if (!madrasah) {
    throw new Error("Madrasah tidak valid.");
  }

  const defaultLateThreshold = madrasah.settings?.lateThreshold || "07:15";
  const defaultWorkEndTime = madrasah.settings?.workEndTime || "14:00";

  // Parse daily schedules jika ada
  let dailyScheduleMap: Record<number, { lateThreshold?: string; workEndTime?: string }> = {};
  if (madrasah.settings?.dailySchedules) {
    try {
      const parsed = JSON.parse(madrasah.settings.dailySchedules);
      if (Array.isArray(parsed)) {
        parsed.forEach((d: any) => {
          if (d.day !== undefined) {
            dailyScheduleMap[d.day] = {
              lateThreshold: d.lateThreshold,
              workEndTime: d.workEndTime,
            };
          }
        });
      }
    } catch {
      // Abaikan parse error, gunakan default
    }
  }

  // 2. Ambil semua guru di madrasah ini untuk mapping PIN / NIP / NIK
  const teachers = await prisma.user.findMany({
    where: {
      madrasahId,
      role: "TEACHER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      nip: true,
      nik: true,
      fingerprintPin: true,
    },
  });

  // Buat lookup map: pin -> userId
  const pinToUserMap = new Map<string, (typeof teachers)[0]>();
  teachers.forEach((t) => {
    if (t.fingerprintPin) {
      pinToUserMap.set(t.fingerprintPin.trim(), t);
      // Dukung zero-padded jika di mesin tersimpan misal 001 vs 1
      const numVal = parseInt(t.fingerprintPin.trim(), 10);
      if (!isNaN(numVal)) {
        pinToUserMap.set(String(numVal), t);
      }
    }
    // Fallback NIP atau NIK jika user menyetel PIN mesin sama dengan NIP/NIK
    if (t.nip) pinToUserMap.set(t.nip.trim(), t);
    if (t.nik) pinToUserMap.set(t.nik.trim(), t);
  });

  // 3. Kelompokkan log berdasarkan User dan Tanggal Kalender
  // Map key: `${userId}_${dateStr}` -> array timestamp scan
  const groupedScans = new Map<
    string,
    {
      userId: string;
      teacherName: string;
      dateObj: Date; // UTC Date midnight
      dateStr: string;
      dayOfWeek: number;
      timestamps: Date[];
    }
  >();

  let ignoredCount = 0;
  const unmappedPinsSet = new Set<string>();

  for (const log of rawLogs) {
    const rawPin = String(log.pin || "").trim();
    if (!rawPin) {
      ignoredCount++;
      continue;
    }

    const matchedUser = pinToUserMap.get(rawPin);
    if (!matchedUser) {
      ignoredCount++;
      unmappedPinsSet.add(rawPin);
      continue;
    }

    // Parse waktu scan (WIB / Local timezone)
    const scanDate = new Date(log.timestamp);
    if (isNaN(scanDate.getTime())) {
      ignoredCount++;
      continue;
    }

    // Format YYYY-MM-DD
    // Pastikan menggunakan tanggal lokal Indonesia (WIB UTC+7) jika timestamp ISO
    const localTime = new Date(scanDate.getTime() + 7 * 60 * 60 * 1000);
    const year = localTime.getUTCFullYear();
    const month = String(localTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(localTime.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = localTime.getUTCDay(); // 0: Sun, 1: Mon, ...

    // Standarisasi UTC date midnight untuk database constraint @@unique([userId, date])
    const calendarUtcDate = new Date(Date.UTC(year, parseInt(month, 10) - 1, parseInt(day, 10), 0, 0, 0, 0));

    const groupKey = `${matchedUser.id}_${dateStr}`;
    const existingGroup = groupedScans.get(groupKey);

    if (existingGroup) {
      existingGroup.timestamps.push(scanDate);
    } else {
      groupedScans.set(groupKey, {
        userId: matchedUser.id,
        teacherName: matchedUser.name,
        dateObj: calendarUtcDate,
        dateStr,
        dayOfWeek,
        timestamps: [scanDate],
      });
    }
  }

  // 4. Proses tiap user per hari ke AttendanceLog
  let insertedCount = 0;
  let updatedCount = 0;

  for (const group of Array.from(groupedScans.values())) {
    // Urutkan waktu scan dari paling awal ke paling akhir
    group.timestamps.sort((a, b) => a.getTime() - b.getTime());
    const earliestScan = group.timestamps[0];
    const latestScan = group.timestamps[group.timestamps.length - 1];

    // Cek setting ambang batas untuk hari tersebut
    const specificSchedule = dailyScheduleMap[group.dayOfWeek];
    const lateThreshold = specificSchedule?.lateThreshold || defaultLateThreshold;
    const workEndTime = specificSchedule?.workEndTime || defaultWorkEndTime;

    // Helper format HH:mm dalam WIB
    const toHhMm = (date: Date) => {
      const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      const h = String(local.getUTCHours()).padStart(2, "0");
      const m = String(local.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };

    // Ambil log yang sudah ada di database untuk user dan tanggal ini
    const existingLog = await prisma.attendanceLog.findUnique({
      where: {
        userId_date: {
          userId: group.userId,
          date: group.dateObj,
        },
      },
    });

    if (!existingLog) {
      // ==========================================
      // KASUS 1: BELUM ADA LOG PRESENSI HARI INI
      // ==========================================
      const earliestHhMm = toHhMm(earliestScan);
      
      // Tentukan status Masuk
      const isLate = earliestHhMm > lateThreshold;
      const calculatedStatus = isLate ? "LATE" : "PRESENT";

      // Cek apakah scan paling akhir cukup jauh (minimal beda 15 menit) untuk dijadikan Check-Out
      const diffMinutes = (latestScan.getTime() - earliestScan.getTime()) / (1000 * 60);
      const hasValidCheckOut = diffMinutes >= 15;

      await prisma.attendanceLog.create({
        data: {
          madrasahId,
          userId: group.userId,
          date: group.dateObj,
          checkInTime: earliestScan,
          checkOutTime: hasValidCheckOut ? latestScan : null,
          status: calculatedStatus,
          notes: `Presensi Mesin Fingerprint Solution (${source === "MANUAL_USB" ? "Import USB" : "Bridge Auto-Sync"})`,
        },
      });

      insertedCount++;
    } else {
      // ==========================================
      // KASUS 2: SUDAH ADA LOG PRESENSI HARI INI
      // ==========================================
      // Kita perbarui jika scan mesin memberikan waktu check-in yang lebih awal atau check-out yang lebih akhir
      let needsUpdate = false;
      const updateData: any = {};

      const currentIn = existingLog.checkInTime ? new Date(existingLog.checkInTime) : null;
      const currentOut = existingLog.checkOutTime ? new Date(existingLog.checkOutTime) : null;

      // 1. Perbarui Check-In jika belum ada, atau jika ada scan mesin yang lebih pagi
      if (!currentIn || earliestScan.getTime() < currentIn.getTime()) {
        updateData.checkInTime = earliestScan;
        const earliestHhMm = toHhMm(earliestScan);
        if (existingLog.status === "PRESENT" || existingLog.status === "LATE" || existingLog.status === "ABSENT") {
          updateData.status = earliestHhMm > lateThreshold ? "LATE" : "PRESENT";
        }
        needsUpdate = true;
      }

      // 2. Tentukan Check-Out
      // Jika latestScan berbeda dari checkIn dan lebih sore dari checkOut yang sudah ada
      const effectiveCheckInTime = updateData.checkInTime || currentIn || earliestScan;
      const diffFromInMinutes = (latestScan.getTime() - effectiveCheckInTime.getTime()) / (1000 * 60);

      if (diffFromInMinutes >= 15) {
        if (!currentOut || latestScan.getTime() > currentOut.getTime()) {
          updateData.checkOutTime = latestScan;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        // Tambahkan keterangan jika belum ada
        if (!existingLog.notes || !existingLog.notes.includes("Fingerprint")) {
          updateData.notes = existingLog.notes
            ? `${existingLog.notes} | Disinkronkan Mesin Fingerprint Solution`
            : `Presensi Mesin Fingerprint Solution (${source})`;
        }

        await prisma.attendanceLog.update({
          where: { id: existingLog.id },
          data: updateData,
        });

        updatedCount++;
      }
    }
  }

  const unmappedPins = Array.from(unmappedPinsSet);
  const statusSummary =
    unmappedPins.length > 0 && insertedCount === 0 && updatedCount === 0
      ? "PARTIAL"
      : "SUCCESS";

  const message = `Berhasil memproses ${rawLogs.length} data scan. ${insertedCount} baru ditambahkan, ${updatedCount} diperbarui, ${ignoredCount} diabaikan/belum terpetakan.`;

  // 5. Simpan catatan ke riwayat FingerprintSyncLog
  await prisma.fingerprintSyncLog.create({
    data: {
      madrasahId,
      totalRecords: rawLogs.length,
      insertedCount,
      updatedCount,
      ignoredCount,
      status: statusSummary,
      source,
      message: unmappedPins.length > 0
        ? `${message} (PIN yang belum terdaftar di guru: ${unmappedPins.slice(0, 5).join(", ")}${unmappedPins.length > 5 ? "..." : ""})`
        : message,
    },
  });

  // 6. Update timestamp sync terakhir madrasah
  await prisma.madrasah.update({
    where: { id: madrasahId },
    data: { fingerprintLastSync: new Date() },
  });

  return {
    totalRecords: rawLogs.length,
    insertedCount,
    updatedCount,
    ignoredCount,
    unmappedPins,
    message,
  };
}
