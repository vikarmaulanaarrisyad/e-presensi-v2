import { prisma } from "@/lib/prisma";

export interface AttendanceSettingsInput {
  workStartTime: string;
  lateThreshold: string;
  workEndTime: string;
  workDays: string;
  dailySchedules?: string;
  requireSelfie: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface HolidayInput {
  name: string;
  date: string | Date;
  description?: string;
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

  return { settings, holidays, madrasah };
}

export async function updateMadrasahSettings(
  madrasahId: string,
  input: AttendanceSettingsInput
) {
  return await prisma.madrasahSetting.upsert({
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
}

export async function createHoliday(madrasahId: string, input: HolidayInput) {
  return await prisma.holiday.create({
    data: {
      madrasahId,
      name: input.name,
      date: new Date(input.date),
      description: input.description || null,
    },
  });
}

export async function removeHoliday(holidayId: string) {
  return await prisma.holiday.delete({
    where: { id: holidayId },
  });
}
