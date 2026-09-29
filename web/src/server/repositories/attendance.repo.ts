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

  // 5. Weekly trend data for Monday - Friday of the current week from database
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyLogs = await prisma.attendanceLog.findMany({
    where: {
      madrasahId,
      date: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
  });

  const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const weeklyData = dayNames.map((name, idx) => {
    const curDate = new Date(startOfWeek);
    curDate.setDate(startOfWeek.getDate() + idx);
    const curDateStr = curDate.toISOString().split("T")[0];

    const logsForDay = weeklyLogs.filter((l) => {
      const logDateStr = new Date(l.date).toISOString().split("T")[0];
      return logDateStr === curDateStr;
    });

    const hadir = logsForDay.filter((l) => l.status === "PRESENT").length;
    const terlambat = logsForDay.filter((l) => l.status === "LATE").length;
    const izin = logsForDay.filter((l) => l.status === "PERMIT" || l.status === "SICK").length;

    return {
      day: name,
      hadir,
      terlambat,
      izin,
    };
  });

  // 6. Real Geofence breakdown from today's attendance logs
  const maxRadius = madrasah?.settings?.radiusMeters || 50;
  let zoneInti = 0;
  let zoneLuar = 0;
  let zoneKritis = 0;
  let zoneLuarRadius = 0;

  todayLogs.forEach((l) => {
    const dist = l.checkInDistance;
    if (dist !== null && dist !== undefined) {
      if (dist <= 25) {
        zoneInti++;
      } else if (dist <= 40) {
        zoneLuar++;
      } else if (dist <= maxRadius) {
        zoneKritis++;
      } else {
        zoneLuarRadius++;
      }
    }
  });

  const totalLogsCount = todayLogs.length || 1;
  const geofenceZones = [
    {
      label: "Zona Inti (0 - 25m)",
      count: `${zoneInti} Guru`,
      percent: todayLogs.length > 0 ? Math.round((zoneInti / totalLogsCount) * 100) : 0,
      color: "bg-emerald-500",
    },
    {
      label: "Zona Luar (25 - 40m)",
      count: `${zoneLuar} Guru`,
      percent: todayLogs.length > 0 ? Math.round((zoneLuar / totalLogsCount) * 100) : 0,
      color: "bg-teal-500",
    },
    {
      label: `Batas Kritis (40 - ${maxRadius}m)`,
      count: `${zoneKritis} Guru`,
      percent: todayLogs.length > 0 ? Math.round((zoneKritis / totalLogsCount) * 100) : 0,
      color: "bg-amber-500",
    },
    {
      label: `Di Luar Radius (> ${maxRadius}m)`,
      count: `${zoneLuarRadius} Guru`,
      percent: todayLogs.length > 0 ? Math.round((zoneLuarRadius / totalLogsCount) * 100) : 0,
      color: "bg-rose-500",
    },
  ];

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
    weeklyData,
    geofenceZones,
  };
}

export interface TeacherWithAttendance {
  id: string;
  name: string;
  email: string;
  nip: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  attendanceLog: {
    id: string;
    status: "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";
    checkInTime: Date | null;
    checkInDistance: number | null;
    checkInLat: number | null;
    checkInLng: number | null;
    checkOutTime: Date | null;
    notes: string | null;
    date: Date;
  } | null;
}

/**
 * Fetch all active teachers in a madrasah and their attendance record for a specific date (YYYY-MM-DD)
 */
export async function getTeachersAttendanceByDate(
  madrasahId: string,
  dateStr: string
) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  const [madrasah, teachers, logs] = await Promise.all([
    prisma.madrasah.findUnique({
      where: { id: madrasahId },
      include: {
        settings: true,
      },
    }),
    prisma.user.findMany({
      where: {
        madrasahId,
        role: "TEACHER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.attendanceLog.findMany({
      where: {
        madrasahId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        checkInTime: true,
        checkInDistance: true,
        checkInLat: true,
        checkInLng: true,
        checkOutTime: true,
        notes: true,
        date: true,
      },
    }),
  ]);

  const logMap = new Map<string, (typeof logs)[0]>();
  for (const log of logs) {
    logMap.set(log.userId, log);
  }

  const teachersWithAttendance: TeacherWithAttendance[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    nip: t.nip,
    phone: t.phone,
    avatarUrl: t.avatarUrl,
    isActive: t.isActive,
    attendanceLog: logMap.get(t.id) || null,
  }));

  // Summary counts
  let recordedCount = 0;
  let presentCount = 0;
  let lateCount = 0;
  let permitCount = 0;
  let sickCount = 0;
  let absentCount = 0;

  for (const t of teachersWithAttendance) {
    if (t.attendanceLog) {
      recordedCount++;
      switch (t.attendanceLog.status) {
        case "PRESENT":
          presentCount++;
          break;
        case "LATE":
          lateCount++;
          break;
        case "PERMIT":
          permitCount++;
          break;
        case "SICK":
          sickCount++;
          break;
        case "ABSENT":
          absentCount++;
          break;
      }
    }
  }

  const unrecordedCount = teachers.length - recordedCount;

  return {
    madrasah,
    teachers: teachersWithAttendance,
    summary: {
      totalTeachers: teachers.length,
      recordedCount,
      unrecordedCount,
      presentCount,
      lateCount,
      permitCount,
      sickCount,
      absentCount,
      percentage:
        teachers.length > 0
          ? Math.round(((presentCount + lateCount) / teachers.length) * 100)
          : 0,
    },
    dateStr,
  };
}

export interface BulkAttendanceInput {
  madrasahId: string;
  teacherIds: string[];
  dateStr: string; // YYYY-MM-DD
  status: "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";
  checkInTime?: string | null; // e.g. "07:00"
  checkOutTime?: string | null; // e.g. "14:00"
  setCheckOut?: boolean;
  notes?: string | null;
  overwriteExisting?: boolean; // false = skip if already has attendance
  randomizeTime?: boolean; // acak waktu presensi agar alami & bervariasi di cetakan PDF
  checkInTimeStart?: string | null; // e.g. "06:38"
  checkInTimeEnd?: string | null; // e.g. "06:56"
  checkOutTimeStart?: string | null; // e.g. "14:02"
  checkOutTimeEnd?: string | null; // e.g. "14:25"
}

/**
 * Generate natural, slightly randomized coordinates and distance within the madrasah geofence radius
 */
function generateRealisticCoords(centerLat: number, centerLng: number, maxRadius = 50) {
  const safeMax = Math.max(12, Math.min(maxRadius - 8, 34));
  const distance = Math.round((8.5 + Math.random() * (safeMax - 8.5)) * 10) / 10;
  
  const angle = Math.random() * 2 * Math.PI;
  const latOffset = (distance * Math.cos(angle)) / 111111;
  const lngOffset = (distance * Math.sin(angle)) / (111111 * Math.cos((centerLat * Math.PI) / 180));

  return {
    lat: Number((centerLat + latOffset).toFixed(6)),
    lng: Number((centerLng + lngOffset).toFixed(6)),
    distance,
  };
}

/**
 * Generate randomized, distinct arrival/departure timestamps across a given time window
 */
function generateRandomTimes(
  startHHMM: string,
  endHHMM: string,
  count: number,
  year: number,
  month: number,
  day: number
): Date[] {
  const [sH, sM] = startHHMM.split(":").map(Number);
  const [eH, eM] = endHHMM.split(":").map(Number);

  let startTotalSec = sH * 3600 + sM * 60;
  let endTotalSec = eH * 3600 + eM * 60;

  if (endTotalSec <= startTotalSec) {
    endTotalSec = startTotalSec + 20 * 60; // 20 min range
  }

  const rangeSec = Math.max(endTotalSec - startTotalSec, 60);

  const results: Date[] = [];
  const usedSeconds = new Set<number>();

  for (let i = 0; i < count; i++) {
    let secOffset = Math.floor(Math.random() * rangeSec);
    let attempts = 0;
    while (usedSeconds.has(secOffset) && attempts < 25) {
      secOffset = Math.floor(Math.random() * rangeSec);
      attempts++;
    }
    usedSeconds.add(secOffset);

    const totalSec = startTotalSec + secOffset;
    const h = Math.floor(totalSec / 3600) % 24;
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    results.push(new Date(year, month - 1, day, h, m, s, 0));
  }

  // Shuffle order so teachers don't arrive in strict alphabetical sequence
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return results;
}

/**
 * Record attendance in bulk for a list of teachers with natural jitter support
 */
export async function bulkRecordAttendance(input: BulkAttendanceInput) {
  if (!input.teacherIds || input.teacherIds.length === 0) {
    return {
      success: false as const,
      error: "Tidak ada guru yang dipilih untuk presensi massal.",
    };
  }

  const count = input.teacherIds.length;
  const [year, month, day] = input.dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  // Fetch madrasah settings to get default coordinates and work hours
  const madrasah = await prisma.madrasah.findUnique({
    where: { id: input.madrasahId },
    include: { settings: true },
  });

  const settings = madrasah?.settings;
  const madrasahLat = settings?.latitude ?? -6.2615;
  const madrasahLng = settings?.longitude ?? 106.8106;
  const radiusMeters = settings?.radiusMeters ?? 50.0;

  const isPresentOrLate =
    input.status === "PRESENT" || input.status === "LATE";
  const shouldRandomize = input.randomizeTime !== false;

  // Pre-generate arrays of timestamps if PRESENT or LATE
  let checkInDates: (Date | null)[] = [];
  let checkOutDates: (Date | null)[] = [];

  if (isPresentOrLate) {
    if (shouldRandomize) {
      // Natural randomized time window
      const inStart = input.checkInTimeStart || (input.status === "LATE" ? "07:16" : "06:38");
      const inEnd = input.checkInTimeEnd || (input.status === "LATE" ? "07:35" : "06:56");
      checkInDates = generateRandomTimes(inStart, inEnd, count, year, month, day);

      if (input.setCheckOut) {
        const outStart = input.checkOutTimeStart || "14:03";
        const outEnd = input.checkOutTimeEnd || "14:26";
        checkOutDates = generateRandomTimes(outStart, outEnd, count, year, month, day);
      }
    } else {
      // Fixed uniform time
      let fixedIn: Date | null = null;
      if (input.checkInTime) {
        const [inH, inM] = input.checkInTime.split(":").map(Number);
        fixedIn = new Date(year, month - 1, day, inH, inM, 0, 0);
      } else {
        const defaultStart = settings?.workStartTime || "07:00";
        const [inH, inM] = defaultStart.split(":").map(Number);
        fixedIn = new Date(year, month - 1, day, inH, inM, 0, 0);
      }
      checkInDates = Array(count).fill(fixedIn);

      if (input.setCheckOut && input.checkOutTime) {
        const [outH, outM] = input.checkOutTime.split(":").map(Number);
        const fixedOut = new Date(year, month - 1, day, outH, outM, 0, 0);
        checkOutDates = Array(count).fill(fixedOut);
      }
    }
  }

  // Format notes: if randomized / clean mode is used and user didn't enter notes, keep it empty
  // so PDF printout doesn't show "Presensi Massal Operator"
  let finalNotes: string | null = null;
  if (input.notes && input.notes.trim().length > 0) {
    finalNotes = input.notes.trim();
  } else if (!shouldRandomize) {
    // Only in non-randomized mode set a default note
    switch (input.status) {
      case "PRESENT":
        finalNotes = "Hadir tepat waktu";
        break;
      case "LATE":
        finalNotes = "Terlambat";
        break;
      case "PERMIT":
        finalNotes = "Izin Dinas";
        break;
      case "SICK":
        finalNotes = "Sakit";
        break;
      case "ABSENT":
        finalNotes = "Alpa / Tanpa Keterangan";
        break;
    }
  } else if (input.status === "LATE") {
    finalNotes = "Terlambat";
  } else if (input.status === "PERMIT") {
    finalNotes = "Izin Dinas";
  } else if (input.status === "SICK") {
    finalNotes = "Sakit";
  } else if (input.status === "ABSENT") {
    finalNotes = "Alpa";
  } else {
    finalNotes = null; // Clean empty note for Hadir Tepat Waktu!
  }

  // Find all existing logs for this date for the selected teachers
  const existingLogs = await prisma.attendanceLog.findMany({
    where: {
      madrasahId: input.madrasahId,
      userId: { in: input.teacherIds },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const existingMap = new Map<string, (typeof existingLogs)[0]>();
  for (const log of existingLogs) {
    existingMap.set(log.userId, log);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < input.teacherIds.length; i++) {
    const teacherId = input.teacherIds[i];
    const existing = existingMap.get(teacherId);

    // Generate realistic distinct coords per teacher if PRESENT / LATE
    const coords = isPresentOrLate
      ? (shouldRandomize ? generateRealisticCoords(madrasahLat, madrasahLng, radiusMeters) : { lat: madrasahLat, lng: madrasahLng, distance: 0.0 })
      : { lat: null, lng: null, distance: null };

    const checkInDateTime = checkInDates[i] || null;
    const checkOutDateTime = checkOutDates[i] || null;

    if (existing) {
      if (!input.overwriteExisting) {
        skippedCount++;
        continue;
      }

      await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          checkInTime: checkInDateTime,
          checkInLat: coords.lat,
          checkInLng: coords.lng,
          checkInDistance: coords.distance,
          checkOutTime: checkOutDateTime,
          checkOutLat: checkOutDateTime ? coords.lat : existing.checkOutLat,
          checkOutLng: checkOutDateTime ? coords.lng : existing.checkOutLng,
          checkOutDistance: checkOutDateTime ? coords.distance : existing.checkOutDistance,
          notes: finalNotes,
        },
      });
      updatedCount++;
    } else {
      await prisma.attendanceLog.create({
        data: {
          madrasahId: input.madrasahId,
          userId: teacherId,
          date: startOfDay,
          status: input.status,
          checkInTime: checkInDateTime,
          checkInLat: coords.lat,
          checkInLng: coords.lng,
          checkInDistance: coords.distance,
          checkOutTime: checkOutDateTime,
          checkOutLat: checkOutDateTime ? coords.lat : null,
          checkOutLng: checkOutDateTime ? coords.lng : null,
          checkOutDistance: checkOutDateTime ? coords.distance : null,
          notes: finalNotes,
        },
      });
      createdCount++;
    }
  }

  return {
    success: true as const,
    totalRequested: input.teacherIds.length,
    processedCount: createdCount + updatedCount,
    createdCount,
    updatedCount,
    skippedCount,
    status: input.status,
    dateStr: input.dateStr,
    randomized: shouldRandomize,
  };
}

/**
 * Delete a specific attendance log record
 */
export async function deleteAttendanceLog(
  logId: string,
  madrasahId: string
) {
  return await prisma.attendanceLog.delete({
    where: {
      id: logId,
      madrasahId,
    },
  });
}

/**
 * Record or update a single teacher's attendance record
 */
export async function singleRecordAttendance(input: {
  madrasahId: string;
  userId: string;
  dateStr: string;
  status: "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
}) {
  return await bulkRecordAttendance({
    madrasahId: input.madrasahId,
    teacherIds: [input.userId],
    dateStr: input.dateStr,
    status: input.status,
    checkInTime: input.checkInTime,
    checkOutTime: input.checkOutTime,
    setCheckOut: Boolean(input.checkOutTime),
    notes: input.notes,
    overwriteExisting: true,
  });
}
