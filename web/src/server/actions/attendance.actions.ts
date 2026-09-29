"use server";

import { 
  getMadrasahDashboardData,
  getTeachersAttendanceByDate,
  bulkRecordAttendance,
  deleteAttendanceLog,
  singleRecordAttendance,
  type BulkAttendanceInput
} from "@/server/repositories/attendance.repo";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function resolveMadrasahId(madrasahId?: string): Promise<string | null> {
  if (madrasahId) return madrasahId;

  const session = await auth();
  const sessionUser = session?.user as unknown as { madrasahId?: string | null } | undefined;
  if (sessionUser?.madrasahId) {
    return sessionUser.madrasahId;
  }

  const firstMadrasah = await prisma.madrasah.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  return firstMadrasah?.id ?? null;
}

export async function fetchAdminDashboardData(madrasahId?: string) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);

    if (!targetMadrasahId) {
      return { error: "Data madrasah tidak ditemukan." };
    }

    const data = await getMadrasahDashboardData(targetMadrasahId);
    return { data };
  } catch (error) {
    console.error("Gagal mengambil data dashboard:", error);
    return { error: "Gagal memuat data dashboard presensi." };
  }
}

/**
 * Fetch teachers and their attendance for a specific date (YYYY-MM-DD)
 */
export async function fetchTeachersAttendanceByDateAction(
  dateStr: string,
  madrasahId?: string
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);

    if (!targetMadrasahId) {
      return { error: "Data madrasah tidak ditemukan." };
    }

    const data = await getTeachersAttendanceByDate(targetMadrasahId, dateStr);
    return { success: true, data };
  } catch (error: any) {
    console.error("Gagal mengambil data presensi guru:", error);
    return { error: error.message || "Gagal memuat data kehadiran guru pada tanggal tersebut." };
  }
}

/**
 * Bulk record attendance for selected teachers
 */
export async function bulkRecordAttendanceAction(
  input: Omit<BulkAttendanceInput, "madrasahId"> & { madrasahId?: string }
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(input.madrasahId);

    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    if (!input.teacherIds || input.teacherIds.length === 0) {
      return { error: "Pilih setidaknya satu guru untuk melakukan presensi massal." };
    }

    const result = await bulkRecordAttendance({
      ...input,
      madrasahId: targetMadrasahId,
    });

    if (!result.success) {
      return { error: result.error || "Gagal memproses presensi massal." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/bulk-attendance");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Gagal mencatat presensi massal:", error);
    return { error: error.message || "Terjadi kesalahan pada sistem saat mencatat presensi massal." };
  }
}

/**
 * Delete a single attendance log
 */
export async function deleteAttendanceLogAction(
  logId: string,
  madrasahId?: string
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);

    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    await deleteAttendanceLog(logId, targetMadrasahId);

    revalidatePath("/admin");
    revalidatePath("/admin/bulk-attendance");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");

    return { success: true };
  } catch (error: any) {
    console.error("Gagal menghapus presensi:", error);
    return { error: error.message || "Gagal menghapus data presensi." };
  }
}

/**
 * Single teacher attendance record
 */
export async function singleRecordAttendanceAction(
  input: {
    madrasahId?: string;
    userId: string;
    dateStr: string;
    status: "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";
    checkInTime?: string | null;
    checkOutTime?: string | null;
    notes?: string | null;
  }
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(input.madrasahId);

    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const result = await singleRecordAttendance({
      ...input,
      madrasahId: targetMadrasahId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/bulk-attendance");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Gagal memperbarui presensi guru:", error);
    return { error: error.message || "Gagal memperbarui data presensi guru." };
  }
}

/**
 * Bulk record attendance for a DATE RANGE (start → end date, inclusive)
 * Skips Sundays and holidays automatically. Saturday is included by default.
 */
export async function bulkRecordAttendanceRangeAction(
  input: Omit<BulkAttendanceInput, "madrasahId" | "dateStr"> & {
    madrasahId?: string;
    startDateStr: string; // YYYY-MM-DD
    endDateStr: string;   // YYYY-MM-DD
    skipSunday?:   boolean; // default true  — skip hari Minggu
    skipSaturday?: boolean; // default false — Sabtu tetap diproses
    skipHolidays?: boolean; // default true
  }
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(input.madrasahId);
    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    if (!input.teacherIds || input.teacherIds.length === 0) {
      return { error: "Pilih setidaknya satu guru untuk presensi massal rentang tanggal." };
    }

    const [sY, sM, sD] = input.startDateStr.split("-").map(Number);
    const [eY, eM, eD] = input.endDateStr.split("-").map(Number);
    const startDate = new Date(sY, sM - 1, sD);
    const endDate   = new Date(eY, eM - 1, eD);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { error: "Format tanggal tidak valid." };
    }
    if (startDate > endDate) {
      return { error: "Tanggal mulai harus sebelum atau sama dengan tanggal akhir." };
    }

    // Max range guard: 92 days (~3 months) to prevent runaway server tasks
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 92) {
      return { error: "Rentang tanggal maksimal 92 hari (±3 bulan) per sekali proses." };
    }

    // Skip options — Sabtu default TIDAK dilewati, Minggu default dilewati
    const skipSunday   = input.skipSunday   !== false;   // default true
    const skipSaturday = input.skipSaturday === true;    // default false
    const skipHolidays = input.skipHolidays !== false;   // default true

    let holidayDates: Set<string> = new Set();
    if (skipHolidays) {
      const holidays = await prisma.holiday.findMany({
        where: {
          madrasahId: targetMadrasahId,
          OR: [
            { date: { gte: startDate, lte: endDate } },
            {
              date: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      });

      // Expand multi-day holidays into individual dates
      for (const h of holidays) {
        const hStart = new Date(h.date);
        const hEnd   = h.endDate ? new Date(h.endDate) : new Date(h.date);
        const cur    = new Date(hStart);
        while (cur <= hEnd) {
          holidayDates.add(
            `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
          );
          cur.setDate(cur.getDate() + 1);
        }
      }
    }

    // Iterate each date in range
    let totalProcessed = 0;
    let totalCreated   = 0;
    let totalUpdated   = 0;
    let totalSkipped   = 0;
    let totalDays      = 0;
    let skippedDays    = 0;
    const processedDates: string[] = [];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dow     = cur.getDay(); // 0=Sun, 6=Sat
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;

      if (skipSunday   && dow === 0) { skippedDays++; cur.setDate(cur.getDate() + 1); continue; }
      if (skipSaturday && dow === 6) { skippedDays++; cur.setDate(cur.getDate() + 1); continue; }
      if (skipHolidays && holidayDates.has(dateStr)) {
        skippedDays++;
        cur.setDate(cur.getDate() + 1);
        continue;
      }

      // Process this day
      const dayResult = await bulkRecordAttendance({
        ...input,
        madrasahId: targetMadrasahId,
        dateStr,
      });

      totalDays++;
      if (dayResult.success) {
        totalProcessed += dayResult.processedCount ?? 0;
        totalCreated   += dayResult.createdCount   ?? 0;
        totalUpdated   += dayResult.updatedCount   ?? 0;
        totalSkipped   += dayResult.skippedCount   ?? 0;
        processedDates.push(dateStr);
      }

      cur.setDate(cur.getDate() + 1);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/bulk-attendance");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");

    return {
      success: true,
      data: {
        totalDays,
        skippedDays,
        processedDates,
        totalProcessed,
        totalCreated,
        totalUpdated,
        totalSkipped,
        teacherCount: input.teacherIds.length,
      },
    };
  } catch (error: any) {
    console.error("Gagal presensi massal rentang tanggal:", error);
    return { error: error.message || "Gagal memproses presensi massal rentang tanggal." };
  }
}
