"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isWithinGeofence } from "@/lib/geo";
import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";

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
  lat: number;
  lng: number;
  distance: number;
  photoBase64?: string;
  notes?: string;
  dateStr?: string; // YYYY-MM-DD for backdated/retroactive attendance
  customCheckInTime?: string; // HH:mm
  customCheckOutTime?: string; // HH:mm
}

/**
 * Bulletproof helper to save attendanceLog without Unique constraint failed on (user_id, date)
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

  try {
    return await prisma.attendanceLog.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      create: {
        madrasahId,
        userId,
        date,
        ...data,
      },
      update: data,
    });
  } catch (err: any) {
    const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 0, 0, 0);
    const dEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 23, 59, 59);

    const existing = await prisma.attendanceLog.findFirst({
      where: {
        userId,
        date: { gte: dStart, lte: dEnd },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return await prisma.attendanceLog.update({
        where: { id: existing.id },
        data,
      });
    }

    throw err;
  }
}

/**
 * Fetch teacher profile, madrasah geofence settings, today's attendance status, and holiday status
 */
export async function getTeacherMobileDashboardData(explicitUserId?: string) {
  try {
    let userId = explicitUserId;

    if (!userId) {
      const session = await auth();
      userId = session?.user?.id;
    }

    // Fallback: If still no userId (e.g. testing mode or direct access), pick first teacher
    let teacher: any = null;
    if (userId) {
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
    }

    if (!teacher) {
      try {
        teacher = await prisma.user.findFirst({
          where: { role: "TEACHER", isActive: true },
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
        teacher = await prisma.user.findFirst({
          where: { role: "TEACHER", isActive: true },
          include: {
            madrasah: {
              include: {
                settings: true,
              },
            },
          },
        });
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

    // Calculate today's midnight UTC and range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Fetch Today's Attendance Log
    const todayLog = await prisma.attendanceLog.findFirst({
      where: {
        userId: teacher.id,
        madrasahId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 2. Check if Today is Holiday (Single or Multi-day / Semester break)
    const holiday = await prisma.holiday.findFirst({
      where: {
        madrasahId,
        OR: [
          {
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          {
            date: { lte: todayEnd },
            endDate: { gte: todayStart },
          },
        ],
      },
    });

    // 3. Check day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = now.getDay().toString();
    const activeWorkDays = (settings.workDays || "1,2,3,4,5,6").split(",");
    const isWeekend = !activeWorkDays.includes(dayOfWeek);

    // 4. Calculate real monthly statistics for this teacher from database
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyLogs = await prisma.attendanceLog.findMany({
      where: {
        userId: teacher.id,
        madrasahId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
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
    let sessionUser: { id: string; role?: string } | undefined;
    try {
      const session = await auth();
      sessionUser = session?.user as unknown as { id: string; role?: string } | undefined;
    } catch {
      // Allow fallback if outside Next.js request context (e.g. testing)
    }

    if (!sessionUser?.id && !payload.userId) {
      return { error: "Sesi pengguna tidak valid. Silakan login kembali." };
    }

    // Proxy Attendance Prevention:
    // Regular teachers MUST only record attendance for themselves.
    // Only Admin/Superadmin may explicitly specify a different userId.
    const isPrivileged = sessionUser?.role === "ADMIN_MADRASAH" || sessionUser?.role === "SUPERADMIN";
    const userId = (isPrivileged && payload.userId) || sessionUser?.id || payload.userId!;

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
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let targetDateStart: Date = todayMidnight;
    let targetDateEnd: Date = todayEnd;
    let isBackdated = false;

    if (payload.dateStr) {
      const [y, m, d] = payload.dateStr.split("-").map(Number);
      const targetDate = new Date(y, m - 1, d, 0, 0, 0, 0);

      if (targetDate > todayMidnight) {
        return { error: "Tidak dapat melakukan presensi untuk tanggal di masa depan." };
      }

      if (targetDate < todayMidnight) {
        isBackdated = true;
        const allowBackdated = (settings as any).allowBackdatedAttendance ?? false;
        if (!allowBackdated) {
          return {
            error: "Fitur presensi tanggal terlewat sedang dinonaktifkan oleh Admin Madrasah.",
          };
        }
      }

      targetDateStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      targetDateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
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

    // Find existing log on the target date (broad timezone check)
    let log = await prisma.attendanceLog.findFirst({
      where: {
        userId: teacher.id,
        OR: [
          {
            date: {
              gte: new Date(targetDateStart.getFullYear(), targetDateStart.getMonth(), targetDateStart.getDate() - 1, 0, 0, 0),
              lte: new Date(targetDateStart.getFullYear(), targetDateStart.getMonth(), targetDateStart.getDate() + 1, 23, 59, 59),
            },
          },
          { date: targetDateStart },
        ],
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
          targetDateStart.getFullYear(),
          targetDateStart.getMonth(),
          targetDateStart.getDate(),
          inH,
          inM,
          0,
          0
        );
        const checkOutTimestamp = new Date(
          targetDateStart.getFullYear(),
          targetDateStart.getMonth(),
          targetDateStart.getDate(),
          outH,
          outM,
          0,
          0
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
          date: targetDateStart,
          data: {
            checkInTime: checkInTimestamp,
            checkInLat: effectiveLat,
            checkInLng: effectiveLng,
            checkInDistance: effectiveDistance,
            checkInPhotoUrl: payload.photoBase64 || log?.checkInPhotoUrl || null,
            checkOutTime: checkOutTimestamp,
            checkOutLat: effectiveLat,
            checkOutLng: effectiveLng,
            checkOutDistance: effectiveDistance,
            checkOutPhotoUrl: payload.photoBase64 || log?.checkOutPhotoUrl || null,
            status,
            notes: defaultNote,
          },
        });

        safeRevalidatePath("/guru");
safeRevalidatePath("/admin");
safeRevalidatePath("/admin/reports");

        return {
          success: true,
          message: `Presensi Lengkap susulan untuk tanggal ${payload.dateStr} berhasil dicatat!`,
          log,
        };
      }

      if (payload.type === "CHECK_IN") {
        const inTimeStr = payload.customCheckInTime || settings.workStartTime || "07:00";
        const [inH, inM] = inTimeStr.split(":").map(Number);
        const checkInTimestamp = new Date(
          targetDateStart.getFullYear(),
          targetDateStart.getMonth(),
          targetDateStart.getDate(),
          inH,
          inM,
          0,
          0
        );

        const [threshH, threshM] = (settings.lateThreshold || "07:15").split(":").map(Number);
        const isLate = inH > threshH || (inH === threshH && inM > threshM);
        const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        const defaultNote = `Presensi susulan tanggal terlewat (${inTimeStr} WIB)`;

        log = await upsertAttendanceRecord({
          logId: log?.id,
          madrasahId: teacher.madrasah.id,
          userId: teacher.id,
          date: targetDateStart,
          data: {
            checkInTime: checkInTimestamp,
            checkInLat: effectiveLat,
            checkInLng: effectiveLng,
            checkInDistance: effectiveDistance,
            checkInPhotoUrl: payload.photoBase64 || log?.checkInPhotoUrl || null,
            status,
            notes: payload.notes || log?.notes || defaultNote,
          },
        });

        safeRevalidatePath("/guru");
safeRevalidatePath("/admin");
safeRevalidatePath("/admin/reports");

        return {
          success: true,
          message: `Presensi Masuk susulan untuk tanggal ${payload.dateStr} berhasil dicatat!`,
          log,
        };
      } else if (payload.type === "CHECK_OUT") {
        const outTimeStr = payload.customCheckOutTime || settings.workEndTime || "14:00";
        const [outH, outM] = outTimeStr.split(":").map(Number);
        const checkOutTimestamp = new Date(
          targetDateStart.getFullYear(),
          targetDateStart.getMonth(),
          targetDateStart.getDate(),
          outH,
          outM,
          0,
          0
        );

        if (log) {
          log = await prisma.attendanceLog.update({
            where: { id: log.id },
            data: {
              checkOutTime: checkOutTimestamp,
              checkOutLat: effectiveLat,
              checkOutLng: effectiveLng,
              checkOutDistance: effectiveDistance,
              checkOutPhotoUrl: payload.photoBase64 || log.checkOutPhotoUrl,
              notes: payload.notes || log.notes || `Presensi pulang susulan tanggal terlewat (${outTimeStr} WIB)`,
            },
          });
        } else {
          const inTimeStr = payload.customCheckInTime || settings.workStartTime || "07:00";
          const [inH, inM] = inTimeStr.split(":").map(Number);
          const checkInTimestamp = new Date(
            targetDateStart.getFullYear(),
            targetDateStart.getMonth(),
            targetDateStart.getDate(),
            inH,
            inM,
            0,
            0
          );

          log = await upsertAttendanceRecord({
            madrasahId: teacher.madrasah.id,
            userId: teacher.id,
            date: targetDateStart,
            data: {
              checkInTime: checkInTimestamp,
              checkInLat: effectiveLat,
              checkInLng: effectiveLng,
              checkInDistance: effectiveDistance,
              checkInPhotoUrl: payload.photoBase64 || null,
              checkOutTime: checkOutTimestamp,
              checkOutLat: effectiveLat,
              checkOutLng: effectiveLng,
              checkOutDistance: effectiveDistance,
              checkOutPhotoUrl: payload.photoBase64 || null,
              status: AttendanceStatus.PRESENT,
              notes: payload.notes || `Presensi susulan tanggal terlewat (${inTimeStr} - ${outTimeStr} WIB)`,
            },
          });
        }

        safeRevalidatePath("/guru");
safeRevalidatePath("/admin");
safeRevalidatePath("/admin/reports");

        return {
          success: true,
          message: `Presensi Pulang susulan untuk tanggal ${payload.dateStr} berhasil dicatat!`,
          log,
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
        date: targetDateStart,
        data: {
          checkInTime: now,
          checkInLat: payload.lat,
          checkInLng: payload.lng,
          checkInDistance: payload.distance,
          checkInPhotoUrl: payload.photoBase64 || null,
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
          checkOutPhotoUrl: payload.photoBase64 || null,
        },
      });
    }

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/reports");

    return {
      success: true,
      message:
        payload.type === "CHECK_IN"
          ? "Presensi Masuk berhasil dicatat!"
          : "Presensi Pulang berhasil dicatat!",
      log,
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
    let userId = explicitUserId;
    if (!userId) {
      const session = await auth();
      userId = session?.user?.id;
    }
    if (!userId) {
      return { error: "Sesi tidak valid." };
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    const log = await prisma.attendanceLog.findFirst({
      where: {
        userId,
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    });

    const holiday = await prisma.holiday.findFirst({
      where: {
        OR: [
          { date: { gte: dateStart, lte: dateEnd } },
          { date: { lte: dateEnd }, endDate: { gte: dateStart } },
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
  year: number
) {
  try {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, madrasahId: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Guru tidak ditemukan." };
    }

    const [logs, holidays] = await Promise.all([
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
      }),
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

    // Calculate Summary
    const stats = {
      present: logs.filter((l) => l.status === "PRESENT").length,
      late: logs.filter((l) => l.status === "LATE").length,
      permit: logs.filter((l) => l.status === "PERMIT").length,
      sick: logs.filter((l) => l.status === "SICK").length,
      absent: logs.filter((l) => l.status === "ABSENT").length,
      total: logs.length,
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
    const teacher = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, madrasahId: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Guru tidak ditemukan." };
    }

    const start = new Date(payload.startDate);
    const end = payload.endDate ? new Date(payload.endDate) : start;

    // Loop through date range and create/update logs
    const cur = new Date(start);
    while (cur <= end) {
      const curDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0);

      const existing = await prisma.attendanceLog.findFirst({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
          date: curDate,
        },
      });

      await upsertAttendanceRecord({
        logId: existing?.id,
        madrasahId: teacher.madrasahId,
        userId: teacher.id,
        date: curDate,
        data: {
          status: payload.status as AttendanceStatus,
          notes: payload.notes,
          checkInPhotoUrl: payload.attachmentBase64 || existing?.checkInPhotoUrl || null,
        },
      });

      cur.setDate(cur.getDate() + 1);
    }

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin/reports");

    return {
      success: true,
      message: `Pengajuan ${payload.status === "SICK" ? "Sakit" : "Izin"} berhasil dikirim!`,
    };
  } catch (error: any) {
    console.error("Gagal mengirim izin:", error);
    return { error: error.message || "Gagal memproses pengajuan izin." };
  }
}
