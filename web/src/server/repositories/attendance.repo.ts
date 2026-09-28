import { prisma } from "@/lib/prisma";

export interface AttendanceFilters {
  date?: Date;
  status?: string;
  search?: string;
}

export async function getMadrasahDashboardData(madrasahId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Get Madrasah & Geofence settings
  const madrasah = await prisma.madrasah.findUnique({
    where: { id: madrasahId },
    include: {
      settings: true,
    },
  });

  // 2. Total active teachers
  const totalTeachers = await prisma.user.count({
    where: {
      madrasahId,
      role: "TEACHER",
      isActive: true,
    },
  });

  // 3. Today's attendance logs
  const todayLogs = await prisma.attendanceLog.findMany({
    where: {
      madrasahId,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nip: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      checkInTime: "asc",
    },
  });

  // 4. Calculate KPI statistics
  const presentCount = todayLogs.filter((l) => l.status === "PRESENT").length;
  const lateCount = todayLogs.filter((l) => l.status === "LATE").length;
  const permitCount = todayLogs.filter((l) => l.status === "PERMIT").length;
  const sickCount = todayLogs.filter((l) => l.status === "SICK").length;
  const absentCount = Math.max(
    0,
    totalTeachers - (presentCount + lateCount + permitCount + sickCount)
  );

  return {
    madrasah,
    stats: {
      totalTeachers,
      presentCount,
      lateCount,
      permitCount,
      sickCount,
      absentCount,
      attendancePercentage:
        totalTeachers > 0
          ? Math.round(((presentCount + lateCount) / totalTeachers) * 100)
          : 0,
    },
    todayLogs,
  };
}
