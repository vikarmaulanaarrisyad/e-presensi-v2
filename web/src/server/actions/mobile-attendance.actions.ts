"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isWithinGeofence } from "@/lib/geo";
import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";
import { uploadAttendancePhotoToDrive } from "@/lib/google-drive";
import { requireAuth } from "@/server/utils/auth-guard";
import { toUtcMidnight, getMonthUtcRange } from "@/lib/date-utils";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore when called outside of Next.js request context (e.g. testing)
  }
}

export interface MobileAttendancePayload {
  userId?: string;
  type: "CHECK_IN" | "CHECK_OUT" | "FULL";
  lat?: number;
  lng?: number;
  distance?: number;
  photoBase64?: string;
  notes?: string;
  dateStr?: string; // YYYY-MM-DD for backdated/retroactive attendance
  customCheckInTime?: string; // HH:mm
  customCheckOutTime?: string; // HH:mm
}

/**
 * Standardized upsert for attendance logs using strict UTC midnight for @db.Date
 */
async function upsertAttendanceRecord({
  logId,
  madrasahId,
  userId,
  date,
  data,
}: {
  logId?: string | null;
  madrasahId: string;
  userId: string;
  date: Date;
  data: any;
}) {
  const dateUtc = toUtcMidnight(date);

  if (logId) {
    try {
      return await prisma.attendanceLog.update({
        where: { id: logId },
        data,
      });
    } catch {
      // Fall through to upsert
    }
  }

  return await prisma.attendanceLog.upsert({
    where: {
      userId_date: {
        userId,
        date: dateUtc,
      },
    },
    create: {
      madrasahId,
      userId,
      date: dateUtc,
      ...data,
    },
    update: data,
  });
}

/**
 * Fetch teacher profile, madrasah geofence settings, today's attendance status, and holiday status
 */
export async function getTeacherMobileDashboardData(explicitUserId?: string) {
  try {
    const user = await requireAuth();

    let targetUserId = user.id;
    if (user.role === "TEACHER") {
      targetUserId = user.id;
    } else if (user.role === "ADMIN_MADRASAH") {
      if (explicitUserId && explicitUserId.trim()) {
        const check = await prisma.user.findFirst({
          where: { id: explicitUserId.trim(), madrasahId: user.madrasahId },
          select: { id: true },
        });
        if (!check) {
          return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
        }
        targetUserId = check.id;
      }
    } else if (user.role === "SUPERADMIN") {
      if (explicitUserId && explicitUserId.trim()) {
        targetUserId = explicitUserId.trim();
      }
    }

    const userId = targetUserId;

    let teacher: any = null;
    try {
      teacher = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          position: true,
          madrasah: {
            include: {
              settings: true,
            },
          },
        },
      });
    } catch {
      teacher = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          madrasah: {
            include: {
              settings: true,
            },
          },
        },
      });
    }

    if (!teacher) {
      return { error: "Data pengguna tidak ditemukan." };
    }

    // If the logged-in user is an ADMIN / SUPERADMIN testing the mobile portal:
    if (teacher.role !== "TEACHER") {
      const targetMadrasahId = teacher.madrasahId;
      let previewTeacher: any = null;

      if (targetMadrasahId) {
        try {
          previewTeacher = await prisma.user.findFirst({
            where: { madrasahId: targetMadrasahId, role: "TEACHER", isActive: true },
            include: {
              position: true,
              madrasah: {
                include: { settings: true },
              },
            },
            orderBy: { name: "asc" },
          });
        } catch {
          previewTeacher = await prisma.user.findFirst({
            where: { madrasahId: targetMadrasahId, role: "TEACHER", isActive: true },
            include: {
              madrasah: {
                include: { settings: true },
              },
            },
            orderBy: { name: "asc" },
          });
        }
      }

      if (!previewTeacher && teacher.role === "SUPERADMIN") {
        try {
          previewTeacher = await prisma.user.findFirst({
            where: { role: "TEACHER", isActive: true },
            include: {
              position: true,
              madrasah: {
                include: { settings: true },
              },
            },
            orderBy: { name: "asc" },
          });
        } catch {
          previewTeacher = await prisma.user.findFirst({
            where: { role: "TEACHER", isActive: true },
            include: {
              madrasah: {
                include: { settings: true },
              },
            },
            orderBy: { name: "asc" },
          });
        }
      }

      if (previewTeacher) {
        teacher = previewTeacher;
      }
    }

    if (!teacher || !teacher.madrasah) {
      return { error: "Data guru atau madrasah tidak ditemukan." };
    }

    const madrasahId = teacher.madrasah.id;
    const settings = teacher.madrasah.settings ?? {
      latitude: -6.2615,
      longitude: 106.8106,
      radiusMeters: 50,
      workStartTime: "07:00",
      lateThreshold: "07:15",
      workEndTime: "14:00",
      workDays: "1,2,3,4,5,6",
      requireSelfie: true,
    };

    // Standardized today UTC midnight and monthly range
    const todayUtc = toUtcMidnight();
    const { startDate: startOfMonth, endDate: endOfMonth } = getMonthUtcRange(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth() + 1
    );

    // 1. Fetch Today's Attendance Log (exact UTC midnight match for @db.Date)
    const todayLog = await prisma.attendanceLog.findFirst({
      where: {
        userId: teacher.id,
        madrasahId,
        date: todayUtc,
      },
    });

    // 2. Check if Today is Holiday (Single or Multi-day / Semester break)
    const holiday = await prisma.holiday.findFirst({
      where: {
        madrasahId,
        OR: [
          {
            endDate: null,
            date: todayUtc,
          },
          {
            date: { lte: todayUtc },
            endDate: { gte: todayUtc },
          },
        ],
      },
    });

    // 3. Check day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = todayUtc.getUTCDay().toString();
    const activeWorkDays = (settings.workDays || "1,2,3,4,5,6").split(",");
    const isWeekend = !activeWorkDays.includes(dayOfWeek);

    const monthlyLogs = await prisma.attendanceLog.findMany({
      where: {
        userId: teacher.id,
        madrasahId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        status: true,
        checkInTime: true,
        checkOutTime: true,
      },
    });

    const presentMonth = monthlyLogs.filter((l) => l.status === "PRESENT").length;
    const lateMonth = monthlyLogs.filter((l) => l.status === "LATE").length;
    const permitMonth = monthlyLogs.filter((l) => l.status === "PERMIT").length;
    const sickMonth = monthlyLogs.filter((l) => l.status === "SICK").length;
    const absentMonth = monthlyLogs.filter((l) => l.status === "ABSENT").length;
    const totalMonth = monthlyLogs.length;

    let totalWorkMinutes = 0;
    monthlyLogs.forEach((l) => {
      if (l.checkInTime && l.checkOutTime) {
        const diffMs = new Date(l.checkOutTime).getTime() - new Date(l.checkInTime).getTime();
        if (diffMs > 0) {
          totalWorkMinutes += Math.round(diffMs / (1000 * 60));
        }
      } else if (l.checkInTime && (l.status === "PRESENT" || l.status === "LATE")) {
        totalWorkMinutes += 360; // 6 hours
      }
    });

    const totalWorkHours = (totalWorkMinutes / 60).toFixed(1);
    const disciplineRate = totalMonth > 0
      ? Math.min(100, Math.round(((presentMonth + lateMonth) / totalMonth) * 100))
      : 100;

    return {
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        nip: teacher.nip ?? "-",
        email: teacher.email,
        phone: teacher.phone ?? "-",
        avatarUrl: teacher.avatarUrl,
        positionName: (teacher as any).position?.name || "Guru Madrasah",
        isHeadmaster: (teacher as any).position?.isHeadmaster || false,
        madrasahName: teacher.madrasah.name,
        madrasahAddress: teacher.madrasah.address ?? "",
      },
      settings: {
        latitude: settings.latitude,
        longitude: settings.longitude,
        radiusMeters: settings.radiusMeters,
        workStartTime: settings.workStartTime,
        lateThreshold: settings.lateThreshold,
        workEndTime: settings.workEndTime,
        requireSelfie: settings.requireSelfie,
        allowBackdatedAttendance: (settings as any).allowBackdatedAttendance ?? false,
      },
      todayLog: todayLog
        ? {
            id: todayLog.id,
            status: todayLog.status,
            checkInTime: todayLog.checkInTime ? todayLog.checkInTime.toISOString() : null,
            checkInDistance: todayLog.checkInDistance,
            checkInPhotoUrl: todayLog.checkInPhotoUrl,
            checkInLat: todayLog.checkInLat,
            checkInLng: todayLog.checkInLng,
            checkOutTime: todayLog.checkOutTime ? todayLog.checkOutTime.toISOString() : null,
            checkOutDistance: todayLog.checkOutDistance,
            checkOutPhotoUrl: todayLog.checkOutPhotoUrl,
            notes: todayLog.notes,
          }
        : null,
      holiday: holiday
        ? {
            name: holiday.name,
            isNational: holiday.isNational,
            description: holiday.description,
          }
        : null,
      isWeekend,
      monthlyStats: {
        presentMonth,
        lateMonth,
        permitMonth,
        sickMonth,
        absentMonth,
        totalMonth,
        totalWorkHours,
        disciplineRate,
      },
    };
  } catch (error: any) {
    console.error("Gagal memuat data mobile guru:", error);
    return { error: error.message || "Gagal memuat data presensi mobile." };
  }
}

/**
 * Record Check-In or Check-Out with Geofencing and Selfie
 */
export async function recordMobileAttendanceAction(payload: MobileAttendancePayload) {
  try {
    const sessionUser = await requireAuth();

    let userId = sessionUser.id;
    if (sessionUser.role === "TEACHER") {
      userId = sessionUser.id; // Regular teachers can ONLY record attendance for themselves
    } else if (sessionUser.role === "ADMIN_MADRASAH") {
      if (payload.userId && payload.userId !== sessionUser.id) {
        const check = await prisma.user.findFirst({
          where: { id: payload.userId, madrasahId: sessionUser.madrasahId },
          select: { id: true },
        });
        if (!check) {
          return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
        }
        userId = check.id;
      }
    } else if (sessionUser.role === "SUPERADMIN") {
      if (payload.userId) {
        userId = payload.userId;
      }
    }

    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        madrasah: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!teacher || !teacher.madrasah) {
      return { error: "Data guru tidak terdaftar pada madrasah." };
    }

    const settings = teacher.madrasah.settings;
    if (!settings) {
      return { error: "Pengaturan koordinat madrasah belum dikonfigurasi oleh admin." };
    }

    // 1. Check Target Date & Backdated / Retroactive Mode
    const now = new Date();
    const todayUtc = toUtcMidnight();

    let targetDateUtc: Date = todayUtc;
    let isBackdated = false;

    if (payload.dateStr) {
      const targetDate = toUtcMidnight(payload.dateStr);

      if (targetDate > todayUtc) {
        return { error: "Tidak dapat melakukan presensi untuk tanggal di masa depan." };
      }

      if (targetDate < todayUtc) {
        isBackdated = true;
        const allowBackdated = (settings as any).allowBackdatedAttendance ?? false;
        if (!allowBackdated) {
          return {
            error: "Fitur presensi tanggal terlewat sedang dinonaktifkan oleh Admin Madrasah.",
          };
        }
      }

      targetDateUtc = targetDate;
    }

    // 2. Check Selfie Requirement (only enforced for live real-time attendance)
    if (!isBackdated && settings.requireSelfie && !payload.photoBase64) {
      return { error: "Foto wajah verifikasi diperlukan untuk melakukan presensi." };
    }

    // 3. Geofencing verification (strictly enforced for real-time attendance)
    const geofence = isWithinGeofence(
      payload.lat || settings.latitude,
      payload.lng || settings.longitude,
      settings.latitude,
      settings.longitude,
      settings.radiusMeters
    );

    if (!isBackdated) {
      // Give a generous 15m GPS jitter tolerance for real-world devices
      const allowedRadius = settings.radiusMeters + 15;
      if (geofence.distance > allowedRadius) {
        return {
          error: `Anda berada ${geofence.distance.toFixed(1)} meter dari madrasah. Presensi hanya diizinkan dalam radius ${settings.radiusMeters} meter.`,
        };
      }
    }

    // Upload foto selfie ke Google Drive Madrasah jika madrasah mengaktifkan Google Drive
    let processedPhotoUrl: string | null = payload.photoBase64 || null;
    if (payload.photoBase64 && teacher?.madrasah?.id) {
      try {
        const driveUrl = await uploadAttendancePhotoToDrive({
          madrasahId: teacher.madrasah.id,
          photoBase64: payload.photoBase64,
          teacherName: teacher.name || "Guru",
          dateStr: payload.dateStr || new Date().toISOString().slice(0, 10),
          type: payload.type === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN",
        });
        if (driveUrl) {
          processedPhotoUrl = driveUrl;
        }
      } catch (driveErr) {
        console.warn("Upload Google Drive gagal, menggunakan foto langsung:", driveErr);
      }
    }

    // Find existing log on the target date (exact UTC midnight match for @db.Date)
    let log = await prisma.attendanceLog.findFirst({
      where: {
        userId: teacher.id,
        madrasahId: teacher.madrasah.id,
        date: targetDateUtc,
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Handle Backdated / Retroactive Submission
    if (isBackdated) {
      const effectiveLat = payload.lat || settings.latitude;
      const effectiveLng = payload.lng || settings.longitude;
      const effectiveDistance = payload.distance || 0;

      if (payload.type === "FULL") {
        const inTimeStr = payload.customCheckInTime || settings.workStartTime || "07:00";
        const outTimeStr = payload.customCheckOutTime || settings.workEndTime || "14:00";
        const [inH, inM] = inTimeStr.split(":").map(Number);
        const [outH, outM] = outTimeStr.split(":").map(Number);

        const checkInTimestamp = new Date(
          `${payload.dateStr}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00+07:00`
        );
        const checkOutTimestamp = new Date(
          `${payload.dateStr}T${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}:00+07:00`
        );

        const [threshH, threshM] = (settings.lateThreshold || "07:15").split(":").map(Number);
        const isLate = inH > threshH || (inH === threshH && inM > threshM);
        const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        const defaultNote =
          payload.notes || `Presensi susulan tanggal terlewat (${inTimeStr} - ${outTimeStr} WIB)`;

        log = await upsertAttendanceRecord({
          logId: log?.id,
          madrasahId: teacher.madrasah.id,
          userId: teacher.id,
          date: targetDateUtc,
          data: {
            checkInTime: checkInTimestamp,
            checkInLat: effectiveLat,
            checkInLng: effectiveLng,
            checkInDistance: effectiveDistance,
            checkInPhotoUrl: processedPhotoUrl || log?.checkInPhotoUrl || null,
            checkOutTime: checkOutTimestamp,
            checkOutLat: effectiveLat,
            checkOutLng: effectiveLng,
            checkOutDistance: effectiveDistance,
            checkOutPhotoUrl: processedPhotoUrl || log?.checkOutPhotoUrl || null,
            status,
            notes: defaultNote,
          },
        });

        safeRevalidatePath("/guru");
        safeRevalidatePath("/admin");

        return {
          success: true,
          message: `Presensi Lengkap susulan untuk tanggal ${payload.dateStr} berhasil dicatat!`,
          log: {
            id: log.id,
            date: log.date,
            checkInTime: log.checkInTime,
            checkOutTime: log.checkOutTime,
            status: log.status,
          },
        };
      }

      if (payload.type === "CHECK_IN") {
        const inTimeStr = payload.customCheckInTime || settings.workStartTime || "07:00";
        const [inH, inM] = inTimeStr.split(":").map(Number);
        const checkInTimestamp = new Date(
          `${payload.dateStr}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00+07:00`
        );

        const [threshH, threshM] = (settings.lateThreshold || "07:15").split(":").map(Number);
        const isLate = inH > threshH || (inH === threshH && inM > threshM);
        const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        const defaultNote = `Presensi susulan tanggal terlewat (${inTimeStr} WIB)`;

        log = await upsertAttendanceRecord({
          logId: log?.id,
          madrasahId: teacher.madrasah.id,
          userId: teacher.id,
          date: targetDateUtc,
          data: {
            checkInTime: checkInTimestamp,
            checkInLat: effectiveLat,
            checkInLng: effectiveLng,
            checkInDistance: effectiveDistance,
            checkInPhotoUrl: processedPhotoUrl || log?.checkInPhotoUrl || null,
            status,
            notes: payload.notes || log?.notes || defaultNote,
          },
        });

        safeRevalidatePath("/guru");
        safeRevalidatePath("/admin");

        return {
          success: true,
          message: `Presensi Masuk susulan untuk tanggal ${payload.dateStr} berhasil dicatat!`,
          log: {
            id: log.id,
            date: log.date,
            checkInTime: log.checkInTime,
            status: log.status,
          },
        };
      } else if (payload.type === "CHECK_OUT") {
        const outTimeStr = payload.customCheckOutTime || settings.workEndTime || "14:00";
        const [outH, outM] = outTimeStr.split(":").map(Number);
        const checkOutTimestamp = new Date(
          `${payload.dateStr}T${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}:00+07:00`
        );

        if (log) {
          log = await prisma.attendanceLog.update({
            where: { id: log.id },
            data: {
              checkOutTime: checkOutTimestamp,
              checkOutLat: effectiveLat,
              checkOutLng: effectiveLng,
              checkOutDistance: effectiveDistance,
              checkOutPhotoUrl: processedPhotoUrl || log.checkOutPhotoUrl,
              notes: payload.notes || log.notes || `Presensi pulang susulan tanggal terlewat (${outTimeStr} WIB)`,
            },
          });
        } else {
          const inTimeStr = payload.customCheckInTime || settings.workStartTime || "07:00";
          const [inH, inM] = inTimeStr.split(":").map(Number);
          const checkInTimestamp = new Date(
            `${payload.dateStr}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00+07:00`
          );

          log = await upsertAttendanceRecord({
            madrasahId: teacher.madrasah.id,
            userId: teacher.id,
            date: targetDateUtc,
            data: {
              checkInTime: checkInTimestamp,
              checkInLat: effectiveLat,
              checkInLng: effectiveLng,
              checkInDistance: effectiveDistance,
              checkInPhotoUrl: processedPhotoUrl || null,
              checkOutTime: checkOutTimestamp,
              checkOutLat: effectiveLat,
              checkOutLng: effectiveLng,
              checkOutDistance: effectiveDistance,
              checkOutPhotoUrl: processedPhotoUrl || null,
              status: AttendanceStatus.PRESENT,
              notes: payload.notes || `Presensi susulan tanggal terlewat (${inTimeStr} - ${outTimeStr} WIB)`,
            },
          });
        }

        safeRevalidatePath("/guru");
        safeRevalidatePath("/admin");

        return {
          success: true,
          message: `Presensi Pulang susulan untuk tanggal ${payload.dateStr} berhasil dicatat!`,
          log: {
            id: log.id,
            date: log.date,
            checkOutTime: log.checkOutTime,
            status: log.status,
          },
        };
      }
    }

    // 5. Handle Live Today's Attendance
    if (payload.type === "CHECK_IN") {
      if (log && log.checkInTime) {
        return { error: "Anda sudah melakukan presensi masuk hari ini." };
      }

      // Determine status: Late or Present based on threshold
      const [threshH, threshM] = settings.lateThreshold.split(":").map(Number);
      const isLate =
        now.getHours() > threshH || (now.getHours() === threshH && now.getMinutes() > threshM);

      const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      log = await upsertAttendanceRecord({
        logId: log?.id,
        madrasahId: teacher.madrasah.id,
        userId: teacher.id,
        date: targetDateUtc,
        data: {
          checkInTime: now,
          checkInLat: payload.lat,
          checkInLng: payload.lng,
          checkInDistance: payload.distance,
          checkInPhotoUrl: processedPhotoUrl || null,
          status,
          notes: payload.notes || (isLate ? "Terlambat hadir" : "Hadir tepat waktu"),
        },
      });
    } else {
      // CHECK_OUT
      if (!log || !log.checkInTime) {
        return { error: "Anda belum melakukan presensi masuk hari ini." };
      }
      if (log.checkOutTime) {
        return { error: "Anda sudah melakukan presensi pulang hari ini." };
      }

      log = await prisma.attendanceLog.update({
        where: { id: log.id },
        data: {
          checkOutTime: now,
          checkOutLat: payload.lat,
          checkOutLng: payload.lng,
          checkOutDistance: payload.distance,
          checkOutPhotoUrl: processedPhotoUrl || null,
        },
      });
    }

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin");

    return {
      success: true,
      message:
        payload.type === "CHECK_IN"
          ? "Presensi Masuk berhasil dicatat!"
          : "Presensi Pulang berhasil dicatat!",
      log: {
        id: log.id,
        date: log.date,
        checkInTime: log.checkInTime,
        checkOutTime: log.checkOutTime,
        status: log.status,
      },
    };
  } catch (error: any) {
    console.error("Gagal merekam presensi:", error);
    return { error: error.message || "Gagal menyimpan presensi ke database." };
  }
}

/**
 * Check attendance status for a specific date (used by teacher for retroactive / backdated attendance)
 */
export async function getTeacherAttendanceForDateAction(
  dateStr: string,
  explicitUserId?: string
) {
  try {
    const user = await requireAuth();
    let targetUserId = user.id;

    if (user.role === "TEACHER") {
      targetUserId = user.id;
    } else if (user.role === "ADMIN_MADRASAH") {
      if (explicitUserId && explicitUserId.trim()) {
        const check = await prisma.user.findFirst({
          where: { id: explicitUserId.trim(), madrasahId: user.madrasahId },
          select: { id: true },
        });
        if (!check) {
          return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
        }
        targetUserId = check.id;
      }
    } else if (user.role === "SUPERADMIN") {
      if (explicitUserId && explicitUserId.trim()) {
        targetUserId = explicitUserId.trim();
      }
    }

    const userId = targetUserId;

    const targetDateUtc = toUtcMidnight(dateStr);

    const log = await prisma.attendanceLog.findFirst({
      where: {
        userId,
        date: targetDateUtc,
      },
    });

    const holiday = await prisma.holiday.findFirst({
      where: {
        madrasahId: user.madrasahId || undefined,
        OR: [
          { endDate: null, date: targetDateUtc },
          { date: { lte: targetDateUtc }, endDate: { gte: targetDateUtc } },
        ],
      },
    });

    return {
      success: true,
      log: log
        ? {
            id: log.id,
            status: log.status,
            checkInTime: log.checkInTime ? log.checkInTime.toISOString() : null,
            checkOutTime: log.checkOutTime ? log.checkOutTime.toISOString() : null,
            notes: log.notes,
          }
        : null,
      holiday: holiday ? { name: holiday.name } : null,
    };
  } catch (error: any) {
    return { error: error.message || "Gagal memuat status presensi tanggal." };
  }
}

/**
 * Fetch monthly attendance history for a teacher
 */
export async function getTeacherMonthlyHistoryAction(
  userId: string,
  month: number, // 1 - 12
  year: number,
  page?: number,
  pageSize?: number
) {
  try {
    const sessionUser = await requireAuth();

    if (sessionUser.role === "TEACHER" && userId !== sessionUser.id) {
      return { error: "Akses ditolak: Anda hanya dapat melihat riwayat kehadiran Anda sendiri." };
    }

    if (sessionUser.role === "ADMIN_MADRASAH") {
      const check = await prisma.user.findFirst({
        where: { id: userId, madrasahId: sessionUser.madrasahId },
        select: { id: true },
      });
      if (!check) {
        return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
      }
    }
    const { startDate, endDate } = getMonthUtcRange(year, month);

    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, madrasahId: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Guru tidak ditemukan." };
    }

    const currentPage = page && page > 0 ? Number(page) : 1;
    const limit = pageSize && pageSize > 0 ? Number(pageSize) : undefined;
    const skip = limit !== undefined ? (currentPage - 1) * limit : undefined;
    const take = limit;

    const [statusAggregates, totalCount, logs, holidays] = await Promise.all([
      // 1. SQL GroupBy for accurate full-month stats regardless of pagination
      prisma.attendanceLog.groupBy({
        by: ["status"],
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          status: true,
        },
      }),

      // 2. Total count of logs for the month
      prisma.attendanceLog.count({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // 3. Paginated logs with SQL take & skip
      prisma.attendanceLog.findMany({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "desc",
        },
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
      }),

      // 4. Holidays for the month
      prisma.holiday.findMany({
        where: {
          madrasahId: teacher.madrasahId,
          OR: [
            {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
            {
              date: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      }),
    ]);

    // Calculate Summary from SQL groupBy aggregates
    const statusCountMap = new Map<string, number>();
    statusAggregates.forEach((item) => {
      statusCountMap.set(item.status, item._count.status);
    });

    const stats = {
      present: statusCountMap.get("PRESENT") ?? 0,
      late: statusCountMap.get("LATE") ?? 0,
      permit: statusCountMap.get("PERMIT") ?? 0,
      sick: statusCountMap.get("SICK") ?? 0,
      absent: statusCountMap.get("ABSENT") ?? 0,
      total: totalCount,
    };

    return {
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        date: l.date.toISOString(),
        status: l.status,
        checkInTime: l.checkInTime ? l.checkInTime.toISOString() : null,
        checkInDistance: l.checkInDistance,
        checkInPhotoUrl: l.checkInPhotoUrl,
        checkOutTime: l.checkOutTime ? l.checkOutTime.toISOString() : null,
        checkOutDistance: l.checkOutDistance,
        checkOutPhotoUrl: l.checkOutPhotoUrl,
        notes: l.notes,
      })),
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date.toISOString(),
        endDate: h.endDate ? h.endDate.toISOString() : null,
        isNational: h.isNational,
      })),
      stats,
      pagination: {
        total: totalCount,
        page: currentPage,
        pageSize: limit || totalCount,
        totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      },
    };
  } catch (error: any) {
    console.error("Gagal memuat riwayat presensi:", error);
    return { error: error.message || "Gagal mengambil data riwayat presensi." };
  }
}

/**
 * Submit Permit or Sick Request
 */
export async function submitTeacherPermitAction(payload: {
  userId: string;
  status: "PERMIT" | "SICK";
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  notes: string;
  attachmentBase64?: string;
}) {
  try {
    const sessionUser = await requireAuth();

    let targetUserId = sessionUser.id;
    if (sessionUser.role === "TEACHER") {
      targetUserId = sessionUser.id; // teacher cannot submit on behalf of others
    } else if (sessionUser.role === "ADMIN_MADRASAH") {
      if (payload.userId && payload.userId !== sessionUser.id) {
        const check = await prisma.user.findFirst({
          where: { id: payload.userId, madrasahId: sessionUser.madrasahId },
          select: { id: true },
        });
        if (!check) {
          return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
        }
        targetUserId = check.id;
      }
    } else if (sessionUser.role === "SUPERADMIN") {
      if (payload.userId) {
        targetUserId = payload.userId;
      }
    }

    const teacher = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, madrasahId: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Guru tidak ditemukan." };
    }

    const start = toUtcMidnight(payload.startDate);
    const end = payload.endDate ? toUtcMidnight(payload.endDate) : start;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { error: "Format tanggal tidak valid." };
    }
    if (start > end) {
      return { error: "Tanggal mulai harus sebelum atau sama dengan tanggal selesai." };
    }
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 30) {
      return { error: "Rentang pengajuan izin/sakit maksimal 30 hari dalam satu permohonan." };
    }

    // 1. Kumpulkan seluruh tanggal UTC midnight dalam rentang izin
    const datesToProcess: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      datesToProcess.push(new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), 0, 0, 0, 0)));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // 2. Ambil log yang sudah ada secara batch dalam 1 query efisien
    const existingLogs = await prisma.attendanceLog.findMany({
      where: {
        userId: teacher.id,
        madrasahId: teacher.madrasahId,
        date: { in: datesToProcess },
      },
      select: {
        id: true,
        date: true,
        checkInPhotoUrl: true,
      },
    });

    const existingMap = new Map<string, (typeof existingLogs)[0]>();
    for (const log of existingLogs) {
      existingMap.set(log.date.toISOString().slice(0, 10), log);
    }

    // 3. Susun operasi batch upsert/update dalam 1 transaksi database atomik
    const permitStatus = payload.status as AttendanceStatus;
    const notes = payload.notes || `Pengajuan ${payload.status === "SICK" ? "Sakit" : "Izin"} Mandiri`;

    const batchOperations = datesToProcess.map((d) => {
      const dateKey = d.toISOString().slice(0, 10);
      const existing = existingMap.get(dateKey);
      const checkInPhotoUrl = payload.attachmentBase64 || existing?.checkInPhotoUrl || null;

      if (existing) {
        return prisma.attendanceLog.update({
          where: { id: existing.id },
          data: {
            status: permitStatus,
            notes,
            checkInPhotoUrl,
          },
        });
      } else {
        return prisma.attendanceLog.upsert({
          where: {
            userId_date: {
              userId: teacher.id,
              date: d,
            },
          },
          create: {
            madrasahId: teacher.madrasahId!,
            userId: teacher.id,
            date: d,
            status: permitStatus,
            notes,
            checkInPhotoUrl,
          },
          update: {
            status: permitStatus,
            notes,
            checkInPhotoUrl,
          },
        });
      }
    });

    if (batchOperations.length > 0) {
      await prisma.$transaction(batchOperations);
    }

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `Pengajuan ${payload.status === "SICK" ? "Sakit" : "Izin"} berhasil dikirim!`,
    };
  } catch (error: any) {
    console.error("Gagal mengirim izin:", error);
    return { error: error.message || "Gagal memproses pengajuan izin." };
  }
}
