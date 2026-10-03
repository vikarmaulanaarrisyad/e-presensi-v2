/**
 * Daily schedule definitions and helper utilities for Bulk Attendance
 * Allows configuring different scan-in and scan-out times per day:
 * - Senin - Kamis: 14:30
 * - Jumat: 11:30
 * - Sabtu: 15:00
 */

export interface DayBulkSchedule {
  day: number; // 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu, 7 = Minggu
  dayName: string;
  isActive: boolean;
  checkInTime: string; // e.g. "07:00"
  checkInTimeStart: string; // e.g. "06:38"
  checkInTimeEnd: string; // e.g. "06:56"
  setCheckOut: boolean;
  checkOutTime: string; // e.g. "14:30", "11:30", "15:00"
  checkOutTimeStart: string; // e.g. "14:31"
  checkOutTimeEnd: string; // e.g. "14:52"
  notes?: string;
}

/**
 * Calculates natural randomized start and end times given a base HH:mm string
 * - 'in': ~22 mins earlier to ~4 mins earlier (e.g. 07:00 -> 06:38 - 06:56)
 * - 'out': ~1 min later to ~22 mins later (e.g. 14:30 -> 14:31 - 14:52)
 */
export function calculateJitterRange(baseTime: string, type: "in" | "out"): { start: string; end: string } {
  const [hStr, mStr] = (baseTime || "").split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) {
    return type === "in"
      ? { start: "06:38", end: "06:56" }
      : { start: "14:31", end: "14:52" };
  }

  const baseMinutes = h * 60 + m;

  if (type === "in") {
    const startMin = Math.max(0, baseMinutes - 22);
    const endMin = Math.max(0, baseMinutes - 4);
    const sH = Math.floor(startMin / 60) % 24;
    const sM = startMin % 60;
    const eH = Math.floor(endMin / 60) % 24;
    const eM = endMin % 60;
    return {
      start: `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`,
      end: `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`,
    };
  } else {
    const startMin = baseMinutes + 1;
    const endMin = baseMinutes + 22;
    const sH = Math.floor(startMin / 60) % 24;
    const sM = startMin % 60;
    const eH = Math.floor(endMin / 60) % 24;
    const eM = endMin % 60;
    return {
      start: `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`,
      end: `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`,
    };
  }
}

/**
 * Formats a time string (e.g. "07:00", "14:30") to Indonesian standard format ("07.00", "14.30")
 */
export function formatIndoTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  return timeStr.replace(/:/g, ".");
}

/**
 * Standard default schedule as requested:
 * - Senin s/d Kamis: Masuk 07:00, Pulang 14:30
 * - Jumat: Masuk 07:00, Pulang 11:30
 * - Sabtu: Masuk 07:00, Pulang 15:00
 * - Minggu: Libur Rutin
 */
export const DEFAULT_BULK_SCHEDULES: DayBulkSchedule[] = [
  {
    day: 1,
    dayName: "Senin",
    isActive: true,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: true,
    checkOutTime: "14:30",
    checkOutTimeStart: "14:31",
    checkOutTimeEnd: "14:52",
    notes: "KBM Reguler",
  },
  {
    day: 2,
    dayName: "Selasa",
    isActive: true,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: true,
    checkOutTime: "14:30",
    checkOutTimeStart: "14:31",
    checkOutTimeEnd: "14:52",
    notes: "KBM Reguler",
  },
  {
    day: 3,
    dayName: "Rabu",
    isActive: true,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: true,
    checkOutTime: "14:30",
    checkOutTimeStart: "14:31",
    checkOutTimeEnd: "14:52",
    notes: "KBM Reguler",
  },
  {
    day: 4,
    dayName: "Kamis",
    isActive: true,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: true,
    checkOutTime: "14:30",
    checkOutTimeStart: "14:31",
    checkOutTimeEnd: "14:52",
    notes: "KBM Reguler",
  },
  {
    day: 5,
    dayName: "Jumat",
    isActive: true,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: true,
    checkOutTime: "11:30",
    checkOutTimeStart: "11:31",
    checkOutTimeEnd: "11:52",
    notes: "Sholat Jumat",
  },
  {
    day: 6,
    dayName: "Sabtu",
    isActive: true,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: true,
    checkOutTime: "15:00",
    checkOutTimeStart: "15:01",
    checkOutTimeEnd: "15:22",
    notes: "KBM / Ekstra",
  },
  {
    day: 7,
    dayName: "Minggu",
    isActive: false,
    checkInTime: "07:00",
    checkInTimeStart: "06:38",
    checkInTimeEnd: "06:56",
    setCheckOut: false,
    checkOutTime: "12:00",
    checkOutTimeStart: "12:01",
    checkOutTimeEnd: "12:22",
    notes: "Libur Rutin",
  },
];

/**
 * Parses raw JSON dailySchedules from database or returns DEFAULT_BULK_SCHEDULES
 */
export function parseDailySchedules(rawJson?: string | null): DayBulkSchedule[] {
  if (!rawJson) return DEFAULT_BULK_SCHEDULES;

  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed) || parsed.length !== 7) {
      return DEFAULT_BULK_SCHEDULES;
    }

    return DEFAULT_BULK_SCHEDULES.map((fallback, idx) => {
      const item = parsed[idx];
      if (!item) return fallback;

      const startTime = item.startTime || fallback.checkInTime;
      const endTime = item.endTime || fallback.checkOutTime;
      const inJitter = calculateJitterRange(startTime, "in");
      const outJitter = calculateJitterRange(endTime, "out");

      return {
        day: item.day ?? fallback.day,
        dayName: item.dayName || fallback.dayName,
        isActive: item.isActive !== undefined ? Boolean(item.isActive) : fallback.isActive,
        checkInTime: startTime,
        checkInTimeStart: inJitter.start,
        checkInTimeEnd: inJitter.end,
        setCheckOut: true,
        checkOutTime: endTime,
        checkOutTimeStart: outJitter.start,
        checkOutTimeEnd: outJitter.end,
        notes: item.notes || fallback.notes,
      };
    });
  } catch (err) {
    console.error("Error parsing dailySchedules JSON:", err);
    return DEFAULT_BULK_SCHEDULES;
  }
}

/**
 * Get schedule for a specific date (YYYY-MM-DD)
 */
export function getDayScheduleForDate(
  dateStr: string,
  schedules: DayBulkSchedule[] = DEFAULT_BULK_SCHEDULES
): DayBulkSchedule {
  if (!dateStr) return schedules[0] || DEFAULT_BULK_SCHEDULES[0];

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const jsDow = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayNum = jsDow === 0 ? 7 : jsDow; // 1 = Senin, ..., 7 = Minggu

  return (
    schedules.find((s) => s.day === dayNum) ||
    DEFAULT_BULK_SCHEDULES.find((s) => s.day === dayNum) ||
    DEFAULT_BULK_SCHEDULES[0]
  );
}

/**
 * Breakdown count of days by category within a date range
 */
export function getDayGroupCounts(
  startDateStr: string,
  endDateStr: string,
  skipSunday: boolean = true,
  skipSaturday: boolean = false
): {
  monThuCount: number;
  friCount: number;
  satCount: number;
  sunCount: number;
  totalWorkDays: number;
} {
  if (!startDateStr || !endDateStr) {
    return { monThuCount: 0, friCount: 0, satCount: 0, sunCount: 0, totalWorkDays: 0 };
  }

  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const [eY, eM, eD] = endDateStr.split("-").map(Number);
  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { monThuCount: 0, friCount: 0, satCount: 0, sunCount: 0, totalWorkDays: 0 };
  }

  let monThuCount = 0;
  let friCount = 0;
  let satCount = 0;
  let sunCount = 0;

  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    if (dow === 0) {
      if (!skipSunday) sunCount++;
    } else if (dow === 6) {
      if (!skipSaturday) satCount++;
    } else if (dow === 5) {
      friCount++;
    } else {
      monThuCount++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return {
    monThuCount,
    friCount,
    satCount,
    sunCount,
    totalWorkDays: monThuCount + friCount + satCount + sunCount,
  };
}
