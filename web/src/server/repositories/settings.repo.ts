import { prisma } from "@/lib/prisma";
import { getKemenagHolidaysByYear } from "@/lib/kemenag-holidays";

export interface AttendanceSettingsInput {
  workStartTime: string;
  lateThreshold: string;
  workEndTime: string;
  workDays: string;
  dailySchedules?: string;
  requireSelfie: boolean;
  allowBackdatedAttendance?: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface HolidayInput {
  name: string;
  date: string | Date;
  endDate?: string | Date | null;
  isNational?: boolean;
  description?: string | null;
}

export async function getMadrasahSettingsAndHolidays(madrasahId: string) {
  const [settings, holidays, madrasah] = await Promise.all([
    prisma.madrasahSetting.findUnique({
      where: { madrasahId },
    }),
    prisma.holiday.findMany({
      where: { madrasahId },
      orderBy: { date: "asc" },
    }),
    prisma.madrasah.findUnique({
      where: { id: madrasahId },
      select: { id: true, name: true, nsm: true },
    }),
  ]);

  let enrichedSettings = settings as any;
  if (settings) {
    if (enrichedSettings.allowBackdatedAttendance === undefined) {
      try {
        const raw = await prisma.$queryRaw<Array<{ allow_backdated_attendance: boolean }>>`
          SELECT allow_backdated_attendance FROM madrasah_settings WHERE madrasah_id = ${madrasahId} LIMIT 1
        `;
        enrichedSettings = {
          ...settings,
          allowBackdatedAttendance: raw?.[0]?.allow_backdated_attendance ?? false,
        };
      } catch {
        enrichedSettings = {
          ...settings,
          allowBackdatedAttendance: false,
        };
      }
    }
  }

  return { settings: enrichedSettings, holidays, madrasah };
}

export async function updateMadrasahSettings(
  madrasahId: string,
  input: AttendanceSettingsInput
) {
  // 1. Upsert standard settings recognized by Prisma schema
  const result = await prisma.madrasahSetting.upsert({
    where: { madrasahId },
    update: {
      workStartTime: input.workStartTime,
      lateThreshold: input.lateThreshold,
      workEndTime: input.workEndTime,
      workDays: input.workDays,
      dailySchedules: input.dailySchedules,
      requireSelfie: input.requireSelfie,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
    },
    create: {
      madrasahId,
      workStartTime: input.workStartTime,
      lateThreshold: input.lateThreshold,
      workEndTime: input.workEndTime,
      workDays: input.workDays,
      dailySchedules: input.dailySchedules,
      requireSelfie: input.requireSelfie,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
    },
  });

  // 2. Direct SQL update for allow_backdated_attendance to guarantee persistence without client-side mismatch
  if (input.allowBackdatedAttendance !== undefined) {
    try {
      await prisma.$executeRaw`
        UPDATE madrasah_settings 
        SET allow_backdated_attendance = ${Boolean(input.allowBackdatedAttendance)}
        WHERE madrasah_id = ${madrasahId}
      `;
    } catch (e) {
      console.error("Gagal update allow_backdated_attendance via raw query:", e);
    }
  }

  return {
    ...result,
    allowBackdatedAttendance: input.allowBackdatedAttendance ?? false,
  };
}


export async function createHoliday(madrasahId: string, input: HolidayInput) {
  return await prisma.holiday.create({
    data: {
      madrasahId,
      name: input.name,
      date: new Date(input.date),
      endDate: input.endDate ? new Date(input.endDate) : null,
      isNational: input.isNational ?? false,
      description: input.description || null,
    },
  });
}

export async function syncKemenagHolidays(madrasahId: string, year: number | "all" = "all") {
  const presets = getKemenagHolidaysByYear(year);

  // Fetch existing holidays for this madrasah to prevent duplicates
  const existingHolidays = await prisma.holiday.findMany({
    where: { madrasahId },
    select: { name: true, date: true },
  });

  const existingKeys = new Set(
    existingHolidays.map(
      (h) => `${h.name.trim().toLowerCase()}_${new Date(h.date).toISOString().split("T")[0]}`
    )
  );

  const toInsert = presets.filter((p) => {
    const key = `${p.name.trim().toLowerCase()}_${p.date}`;
    return !existingKeys.has(key);
  });

  if (toInsert.length === 0) {
    return {
      addedCount: 0,
      totalPresets: presets.length,
      message: "Semua hari libur Kemenag & Nasional untuk periode ini sudah tersinkronisasi.",
    };
  }

  const created = await prisma.$transaction(
    toInsert.map((item) =>
      prisma.holiday.create({
        data: {
          madrasahId,
          name: item.name,
          date: new Date(item.date),
          endDate: item.endDate ? new Date(item.endDate) : null,
          isNational: item.isNational,
          description: item.description,
        },
      })
    )
  );

  return {
    addedCount: created.length,
    totalPresets: presets.length,
    message: `Berhasil menyinkronkan ${created.length} hari libur Kemenag & Nasional!`,
  };
}

export async function removeHoliday(holidayId: string) {
  return await prisma.holiday.delete({
    where: { id: holidayId },
  });
}

