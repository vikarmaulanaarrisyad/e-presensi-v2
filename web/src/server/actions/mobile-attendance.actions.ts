"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isWithinGeofence } from "@/lib/geo";
import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";

export interface MobileAttendancePayload {
  userId?: string;
  type: "CHECK_IN" | "CHECK_OUT";
  lat: number;
  lng: number;
  distance: number;
  photoBase64?: string;
  notes?: string;
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
    let teacher = null;
    if (userId) {
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

    return {
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        nip: teacher.nip ?? "-",
        email: teacher.email,
        phone: teacher.phone ?? "-",
        avatarUrl: teacher.avatarUrl,
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
    let userId = payload.userId;
    if (!userId) {
      const session = await auth();
      userId = session?.user?.id;
    }

    if (!userId) {
      return { error: "Sesi pengguna tidak valid. Silakan login kembali." };
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

    // Geofencing verification
    const geofence = isWithinGeofence(
      payload.lat,
      payload.lng,
      settings.latitude,
      settings.longitude,
      settings.radiusMeters
    );

    // Give a generous 15m GPS jitter tolerance for real-world devices
    const allowedRadius = settings.radiusMeters + 15;
    if (geofence.distance > allowedRadius) {
      return {
        error: `Anda berada ${geofence.distance.toFixed(1)} meter dari madrasah. Presensi hanya diizinkan dalam radius ${settings.radiusMeters} meter.`,
      };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Find existing log today
    let log = await prisma.attendanceLog.findFirst({
      where: {
        userId: teacher.id,
        madrasahId: teacher.madrasah.id,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (payload.type === "CHECK_IN") {
      if (log && log.checkInTime) {
        return { error: "Anda sudah melakukan presensi masuk hari ini." };
      }

      // Determine status: Late or Present based on threshold
      // E.g., threshold "07:15"
      const [threshH, threshM] = settings.lateThreshold.split(":").map(Number);
      const isLate =
        now.getHours() > threshH || (now.getHours() === threshH && now.getMinutes() > threshM);

      const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      if (log) {
        log = await prisma.attendanceLog.update({
          where: { id: log.id },
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
        log = await prisma.attendanceLog.create({
          data: {
            madrasahId: teacher.madrasah.id,
            userId: teacher.id,
            date: todayStart,
            checkInTime: now,
            checkInLat: payload.lat,
            checkInLng: payload.lng,
            checkInDistance: payload.distance,
            checkInPhotoUrl: payload.photoBase64 || null,
            status,
            notes: payload.notes || (isLate ? "Terlambat hadir" : "Hadir tepat waktu"),
          },
        });
      }
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

    revalidatePath("/guru");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");

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

      if (existing) {
        await prisma.attendanceLog.update({
          where: { id: existing.id },
          data: {
            status: payload.status as AttendanceStatus,
            notes: payload.notes,
          },
        });
      } else {
        await prisma.attendanceLog.create({
          data: {
            madrasahId: teacher.madrasahId,
            userId: teacher.id,
            date: curDate,
            status: payload.status as AttendanceStatus,
            notes: payload.notes,
          },
        });
      }

      cur.setDate(cur.getDate() + 1);
    }

    revalidatePath("/guru");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message: `Pengajuan ${payload.status === "SICK" ? "Sakit" : "Izin"} berhasil dikirim!`,
    };
  } catch (error: any) {
    console.error("Gagal mengirim izin:", error);
    return { error: error.message || "Gagal memproses pengajuan izin." };
  }
}
