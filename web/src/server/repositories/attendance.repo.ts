import { prisma } from "@/lib/prisma";

export interface AttendanceFilters {
  date?: Date;
  status?: string;
  search?: string;
}

export async function getMadrasahDashboardData(madrasahId: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0));

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

  // 3. Today's attendance logs (optimized select to prevent massive base64 photo overhead)
  const todayLogs = await prisma.attendanceLog.findMany({
    where: {
      madrasahId,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      id: true,
      userId: true,
      date: true,
      status: true,
      checkInTime: true,
      checkInDistance: true,
      checkInLat: true,
      checkInLng: true,
      checkInPhotoUrl: true,
      notes: true,
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
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const startOfWeek = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
  const endOfWeek = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999));

  const weeklyLogs = await prisma.attendanceLog.findMany({
    where: {
      madrasahId,
      date: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    select: {
      id: true,
      date: true,
      status: true,
    },
  });

  const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const weeklyData = dayNames.map((name, idx) => {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + idx);
    const curDateStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;

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

export interface DateHolidayInfo {
  isHoliday: boolean;
  type: "SUNDAY" | "HOLIDAY" | null;
  name: string | null;
  description: string | null;
}

/**
 * Determine whether a date (YYYY-MM-DD) is a holiday for a madrasah.
 * Rules match the Laporan Rincian Harian: Sunday = "Libur Rutin",
 * or any Holiday record (single-day or multi-day range) covering the date.
 */
export async function getHolidayInfoForDate(
  madrasahId: string,
  dateStr: string,
  dailySchedulesRaw?: string | null
): Promise<DateHolidayInfo> {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const holidays = await prisma.holiday.findMany({
    where: {
      madrasahId,
      date: { lte: endOfDay },
      OR: [
        { endDate: null, date: { gte: startOfDay } },
        { endDate: { gte: startOfDay } },
      ],
    },
    orderBy: { date: "asc" },
  });

  for (const h of holidays) {
    const hStartStr = new Date(h.date).toISOString().substring(0, 10);
    const hEndStr = h.endDate ? new Date(h.endDate).toISOString().substring(0, 10) : hStartStr;
    if (dateStr >= hStartStr && dateStr <= hEndStr) {
      return {
        isHoliday: true,
        type: "HOLIDAY",
        name: h.name,
        description: h.description ?? null,
      };
    }
  }

  // Check Sunday (always routine holiday)
  const dateObj = new Date(year, month - 1, day);
  const jsDow = dateObj.getDay(); // 0 = Sunday
  if (jsDow === 0) {
    return {
      isHoliday: true,
      type: "SUNDAY",
      name: "Libur Rutin (Minggu)",
      description: null,
    };
  }

  // Check if dailySchedules marks this day as not active (e.g. 5-day work week where Saturday is inactive)
  if (dailySchedulesRaw) {
    try {
      const parsed = JSON.parse(dailySchedulesRaw);
      if (Array.isArray(parsed)) {
        const dayNum = jsDow === 0 ? 7 : jsDow; // 1 = Monday ... 7 = Sunday
        const daySchedule = parsed.find((item: any) => item.day === dayNum);
        if (daySchedule && daySchedule.isActive === false) {
          return {
            isHoliday: true,
            type: "SUNDAY",
            name: daySchedule.notes || `Libur Rutin (${daySchedule.dayName || "Non-Aktif"})`,
            description: null,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return { isHoliday: false, type: null, name: null, description: null };
}

/**
 * Fetch all active teachers in a madrasah and their attendance record for a specific date (YYYY-MM-DD)
 */
export async function getTeachersAttendanceByDate(
  madrasahId: string,
  dateStr: string
) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

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

  const holidayInfo = await getHolidayInfoForDate(
    madrasahId,
    dateStr,
    madrasah?.settings?.dailySchedules
  );

  const logMap = new Map<string, (typeof logs)[0]>();
  for (const log of logs) {
    const logDateStr = new Date(log.date).toISOString().substring(0, 10);
    if (logDateStr === dateStr) {
      logMap.set(log.userId, log);
    }
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

  const isHoliday = holidayInfo.isHoliday;
  const unrecordedCount = isHoliday ? 0 : Math.max(0, teachers.length - recordedCount);
  const holidayCount = isHoliday ? Math.max(0, teachers.length - recordedCount) : 0;

  return {
    madrasah,
    teachers: teachersWithAttendance,
    summary: {
      totalTeachers: teachers.length,
      recordedCount,
      unrecordedCount,
      holidayCount,
      presentCount,
      lateCount,
      permitCount,
      sickCount,
      absentCount,
      percentage: isHoliday
        ? 100
        : teachers.length > 0
        ? Math.round(((presentCount + lateCount) / teachers.length) * 100)
        : 0,
      isHoliday,
      holidayName: holidayInfo.name,
      holidayType: holidayInfo.type,
    },
    dateStr,
    holidayInfo,
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
  day: number,
  daySeed = day
): Date[] {
  const [sH, sM] = startHHMM.split(":").map(Number);
  const [eH, eM] = endHHMM.split(":").map(Number);

  let startTotalMin = sH * 60 + sM;
  let endTotalMin = eH * 60 + eM;

  if (endTotalMin <= startTotalMin) {
    endTotalMin = startTotalMin + 20; // 20 min range
  }

  let availableMinutes = endTotalMin - startTotalMin + 1;
  let effectiveStartMin = startTotalMin;
  let effectiveEndMin = endTotalMin;

  // If there are more teachers than available minutes, widen window slightly earlier
  // so each teacher can have their own distinct minute
  if (count > availableMinutes) {
    effectiveStartMin = Math.max(0, effectiveEndMin - count - 3);
    availableMinutes = effectiveEndMin - effectiveStartMin + 1;
  }

  const allMinuteOffsets: number[] = [];
  for (let m = 0; m < availableMinutes; m++) {
    allMinuteOffsets.push(m);
  }

  // Shuffle minute offsets so teachers don't arrive in strict alphabetical order
  for (let i = allMinuteOffsets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allMinuteOffsets[i], allMinuteOffsets[j]] = [allMinuteOffsets[j], allMinuteOffsets[i]];
  }

  const results: Date[] = [];
  for (let i = 0; i < count; i++) {
    let minuteOffset: number;
    if (count === 1 && availableMinutes > 1) {
      // 1 teacher day-to-day: scatter randomly and naturally across available minutes
      // so consecutive days in bulk presensi never produce identical or repetitive minutes
      minuteOffset = Math.floor(Math.random() * availableMinutes);
    } else {
      // Multiple teachers on the same date: each teacher gets a unique minute offset
      minuteOffset = allMinuteOffsets[i % allMinuteOffsets.length];
    }
    const totalMin = effectiveStartMin + minuteOffset;
    const randomSec = Math.floor(Math.random() * 60);

    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    const s = randomSec;

    results.push(new Date(year, month - 1, day, h, m, s, 0));
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

  const uniqueTeacherIds = Array.from(new Set(input.teacherIds));
  const count = uniqueTeacherIds.length;
  const [year, month, day] = input.dateStr.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

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

  // Resolve day of week to determine default day-specific work hours (1=Senin..7=Minggu)
  const dateObj = new Date(year, month - 1, day);
  const jsDow = dateObj.getDay();
  const dayNum = jsDow === 0 ? 7 : jsDow;

  let resolvedStartTime = "07:00";
  let resolvedEndTime = "14:30"; // default Senin - Kamis 14:30
  if (dayNum === 5) {
    resolvedEndTime = "11:30"; // Jumat 11:30
  } else if (dayNum === 6) {
    resolvedEndTime = "15:00"; // Sabtu 15:00
  } else if (dayNum === 7) {
    resolvedEndTime = "12:00"; // Minggu
  }

  if (settings?.dailySchedules) {
    try {
      const parsed = JSON.parse(settings.dailySchedules);
      if (Array.isArray(parsed)) {
        const found = parsed.find((p: { day?: number; startTime?: string; endTime?: string }) => p.day === dayNum);
        if (found) {
          if (found.startTime) resolvedStartTime = found.startTime;
          if (found.endTime) resolvedEndTime = found.endTime;
        }
      }
    } catch {}
  } else if (settings?.workStartTime) {
    resolvedStartTime = settings.workStartTime;
  }

  // Pre-generate arrays of timestamps if PRESENT or LATE
  let checkInDates: (Date | null)[] = [];
  let checkOutDates: (Date | null)[] = [];

  if (isPresentOrLate) {
    if (shouldRandomize) {
      // Natural randomized time window
      const inStart = input.checkInTimeStart || (input.status === "LATE" ? "07:16" : "06:38");
      const inEnd = input.checkInTimeEnd || (input.status === "LATE" ? "07:35" : "06:56");
      checkInDates = generateRandomTimes(inStart, inEnd, count, year, month, day, day);

      if (input.setCheckOut) {
        // Natural jitter calculated around resolved checkout time
        let fallbackOutStart = "14:31";
        let fallbackOutEnd = "14:52";
        if (resolvedEndTime === "11:30") {
          fallbackOutStart = "11:31";
          fallbackOutEnd = "11:52";
        } else if (resolvedEndTime === "15:00") {
          fallbackOutStart = "15:01";
          fallbackOutEnd = "15:22";
        } else {
          const [outH, outM] = resolvedEndTime.split(":").map(Number);
          if (!isNaN(outH) && !isNaN(outM)) {
            const startM = outH * 60 + outM + 1;
            const endM = outH * 60 + outM + 22;
            fallbackOutStart = `${String(Math.floor(startM / 60) % 24).padStart(2, "0")}:${String(startM % 60).padStart(2, "0")}`;
            fallbackOutEnd = `${String(Math.floor(endM / 60) % 24).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
          }
        }

        const outStart = input.checkOutTimeStart || fallbackOutStart;
        const outEnd = input.checkOutTimeEnd || fallbackOutEnd;
        checkOutDates = generateRandomTimes(outStart, outEnd, count, year, month, day, day + 5);
      }
    } else {
      // Fixed uniform time
      let fixedIn: Date | null = null;
      if (input.checkInTime) {
        const [inH, inM] = input.checkInTime.split(":").map(Number);
        fixedIn = new Date(year, month - 1, day, inH, inM, 0, 0);
      } else {
        const defaultStart = resolvedStartTime || settings?.workStartTime || "07:00";
        const [inH, inM] = defaultStart.split(":").map(Number);
        fixedIn = new Date(year, month - 1, day, inH, inM, 0, 0);
      }
      checkInDates = Array(count).fill(fixedIn);

      if (input.setCheckOut) {
        const targetCheckOut = input.checkOutTime || resolvedEndTime;
        const [outH, outM] = targetCheckOut.split(":").map(Number);
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

  // Find all existing logs for this exact calendar date for the selected teachers
  const existingLogs = await prisma.attendanceLog.findMany({
    where: {
      userId: { in: uniqueTeacherIds },
      date: startOfDay,
    },
    select: {
      id: true,
      userId: true,
      checkOutLat: true,
      checkOutLng: true,
      checkOutDistance: true,
    },
  });

  const existingMap = new Map<string, (typeof existingLogs)[0]>();
  for (const log of existingLogs) {
    existingMap.set(log.userId, log);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const dbOperations: any[] = [];

  for (let i = 0; i < uniqueTeacherIds.length; i++) {
    const teacherId = uniqueTeacherIds[i];
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

      dbOperations.push(
        prisma.attendanceLog.update({
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
        })
      );
      updatedCount++;
    } else {
      dbOperations.push(
        prisma.attendanceLog.upsert({
          where: {
            userId_date: {
              userId: teacherId,
              date: startOfDay,
            },
          },
          create: {
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
          update: input.overwriteExisting
            ? {
                status: input.status,
                checkInTime: checkInDateTime,
                checkInLat: coords.lat,
                checkInLng: coords.lng,
                checkInDistance: coords.distance,
                checkOutTime: checkOutDateTime,
                checkOutLat: checkOutDateTime ? coords.lat : undefined,
                checkOutLng: checkOutDateTime ? coords.lng : undefined,
                checkOutDistance: checkOutDateTime ? coords.distance : undefined,
                notes: finalNotes,
              }
            : {},
        })
      );
      createdCount++;
    }
  }

  if (dbOperations.length > 0) {
    await prisma.$transaction(dbOperations);
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
 * Delete a specific attendance log record with tenant safety check
 */
export async function deleteAttendanceLog(
  logId: string,
  madrasahId: string
) {
  const log = await prisma.attendanceLog.findUnique({
    where: { id: logId },
    select: { id: true, madrasahId: true },
  });

  if (!log || log.madrasahId !== madrasahId) {
    throw new Error("Data presensi tidak ditemukan atau Anda tidak memiliki akses.");
  }

  return await prisma.attendanceLog.delete({
    where: { id: logId },
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
