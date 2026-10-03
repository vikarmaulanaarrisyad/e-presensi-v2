"use server";

import { 
  getMadrasahDashboardData,
  getTeachersAttendanceByDate,
  bulkRecordAttendance,
  deleteAttendanceLog,
  singleRecordAttendance,
  getHolidayInfoForDate,
  type BulkAttendanceInput
} from "@/server/repositories/attendance.repo";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";

export async function fetchAdminDashboardData(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);
    const data = await getMadrasahDashboardData(targetMadrasahId);
    return { data };
  } catch (error: any) {
    console.error("Gagal mengambil data dashboard:", error);
    return { error: error?.message || "Gagal memuat data dashboard presensi." };
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
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);
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
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(input.madrasahId);

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
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

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
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(input.madrasahId);

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
    scheduleMode?: "per_day" | "uniform";
    dailySchedulesConfig?: Array<{
      day: number;
      dayName: string;
      isActive: boolean;
      checkInTime: string;
      checkInTimeStart: string;
      checkInTimeEnd: string;
      setCheckOut: boolean;
      checkOutTime: string;
      checkOutTimeStart: string;
      checkOutTimeEnd: string;
      notes?: string;
    }>;
    saveAsMadrasahDefault?: boolean;
  }
) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(input.madrasahId);

    if (!input.teacherIds || input.teacherIds.length === 0) {
      return { error: "Pilih setidaknya satu guru untuk presensi massal rentang tanggal." };
    }

    const [sY, sM, sD] = input.startDateStr.split("-").map(Number);
    const [eY, eM, eD] = input.endDateStr.split("-").map(Number);
    const startUtc = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
    const endUtc   = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

    if (isNaN(startUtc.getTime()) || isNaN(endUtc.getTime())) {
      return { error: "Format tanggal tidak valid." };
    }
    if (startUtc > endUtc) {
      return { error: "Tanggal mulai harus sebelum atau sama dengan tanggal akhir." };
    }

    // Save as madrasah daily schedule if requested
    if (input.saveAsMadrasahDefault && input.dailySchedulesConfig && input.dailySchedulesConfig.length > 0) {
      try {
        const mappedDaily = input.dailySchedulesConfig.map((s) => ({
          day: s.day,
          dayName: s.dayName,
          isActive: s.isActive,
          startTime: s.checkInTime,
          lateThreshold: "07:15",
          endTime: s.checkOutTime,
          notes: s.notes || "",
        }));

        const primaryDay = input.dailySchedulesConfig.find((d) => d.day === 2) || input.dailySchedulesConfig[0];

        await prisma.madrasahSetting.upsert({
          where: { madrasahId: targetMadrasahId },
          update: {
            dailySchedules: JSON.stringify(mappedDaily),
            workStartTime: primaryDay.checkInTime,
            workEndTime: primaryDay.checkOutTime,
          },
          create: {
            madrasahId: targetMadrasahId,
            latitude: -6.2615,
            longitude: 106.8106,
            workStartTime: primaryDay.checkInTime,
            workEndTime: primaryDay.checkOutTime,
            dailySchedules: JSON.stringify(mappedDaily),
          },
        });
      } catch (err) {
        console.error("Gagal menyimpan jadwal default madrasah:", err);
      }
    }

    // Max range guard: 92 days (~3 months) to prevent runaway server tasks
    const diffDays = Math.ceil((endUtc.getTime() - startUtc.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 92) {
      return { error: "Rentang tanggal maksimal 92 hari (±3 bulan) per sekali proses." };
    }

    // Skip options — Sabtu default TIDAK dilewati, Minggu default dilewati
    const skipSunday   = input.skipSunday   !== false;   // default true
    const skipSaturday = input.skipSaturday === true;    // default false
    const skipHolidays = input.skipHolidays !== false;   // default true

    const holidayDates: Set<string> = new Set();
    if (skipHolidays) {
      const holidays = await prisma.holiday.findMany({
        where: {
          madrasahId: targetMadrasahId,
          OR: [
            { date: { gte: startUtc, lte: endUtc } },
            {
              date: { lte: endUtc },
              endDate: { gte: startUtc },
            },
          ],
        },
      });

      // Expand multi-day holidays into individual dates using UTC date math
      for (const h of holidays) {
        const startStr = new Date(h.date).toISOString().substring(0, 10);
        const endStr = h.endDate ? new Date(h.endDate).toISOString().substring(0, 10) : startStr;
        let [hy, hm, hd] = startStr.split("-").map(Number);
        while (true) {
          const curStr = `${hy}-${String(hm).padStart(2, "0")}-${String(hd).padStart(2, "0")}`;
          holidayDates.add(curStr);
          if (curStr >= endStr) break;
          const next = new Date(Date.UTC(hy, hm - 1, hd + 1));
          hy = next.getUTCFullYear();
          hm = next.getUTCMonth() + 1;
          hd = next.getUTCDate();
        }
      }
    }

    // Iterate each date in range using UTC
    let totalProcessed = 0;
    let totalCreated   = 0;
    let totalUpdated   = 0;
    let totalSkipped   = 0;
    let totalDays      = 0;
    let skippedDays    = 0;
    const processedDates: string[] = [];

    const cur = new Date(startUtc);
    while (cur <= endUtc) {
      const dow     = cur.getUTCDay(); // 0=Sun, 6=Sat
      const dateStr = cur.toISOString().substring(0, 10);

      if (skipSunday   && dow === 0) { skippedDays++; cur.setUTCDate(cur.getUTCDate() + 1); continue; }
      if (skipSaturday && dow === 6) { skippedDays++; cur.setUTCDate(cur.getUTCDate() + 1); continue; }
      if (skipHolidays && holidayDates.has(dateStr)) {
        skippedDays++;
        cur.setUTCDate(cur.getUTCDate() + 1);
        continue;
      }

      // Determine day of week config: 0=Sun -> 7, 1=Mon -> 1, ..., 6=Sat -> 6
      const dayNum = dow === 0 ? 7 : dow;

      let dayCheckInTime = input.checkInTime;
      let dayCheckOutTime = input.checkOutTime;
      let dayCheckInStart = input.checkInTimeStart;
      let dayCheckInEnd = input.checkInTimeEnd;
      let dayCheckOutStart = input.checkOutTimeStart;
      let dayCheckOutEnd = input.checkOutTimeEnd;
      let daySetCheckOut = input.setCheckOut;

      if (input.scheduleMode !== "uniform" && input.dailySchedulesConfig && input.dailySchedulesConfig.length > 0) {
        const dayCfg = input.dailySchedulesConfig.find((d) => d.day === dayNum);
        if (dayCfg) {
          if (dayCfg.isActive === false) {
            skippedDays++;
            cur.setUTCDate(cur.getUTCDate() + 1);
            continue;
          }
          dayCheckInTime = dayCfg.checkInTime;
          dayCheckOutTime = dayCfg.checkOutTime;
          dayCheckInStart = dayCfg.checkInTimeStart;
          dayCheckInEnd = dayCfg.checkInTimeEnd;
          dayCheckOutStart = dayCfg.checkOutTimeStart;
          dayCheckOutEnd = dayCfg.checkOutTimeEnd;
          daySetCheckOut = dayCfg.setCheckOut;
        }
      }

      // Process this day
      const dayResult = await bulkRecordAttendance({
        ...input,
        madrasahId: targetMadrasahId,
        dateStr,
        checkInTime: dayCheckInTime,
        checkOutTime: dayCheckOutTime,
        checkInTimeStart: dayCheckInStart,
        checkInTimeEnd: dayCheckInEnd,
        checkOutTimeStart: dayCheckOutStart,
        checkOutTimeEnd: dayCheckOutEnd,
        setCheckOut: daySetCheckOut,
      });

      totalDays++;
      if (dayResult.success) {
        totalProcessed += dayResult.processedCount ?? 0;
        totalCreated   += dayResult.createdCount   ?? 0;
        totalUpdated   += dayResult.updatedCount   ?? 0;
        totalSkipped   += dayResult.skippedCount   ?? 0;
        processedDates.push(dateStr);
      }

      cur.setUTCDate(cur.getUTCDate() + 1);
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
