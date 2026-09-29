"use server";

import { 
  getMadrasahSettingsAndHolidays, 
  updateMadrasahSettings, 
  createHoliday, 
  removeHoliday,
  syncKemenagHolidays,
  type AttendanceSettingsInput,
  type HolidayInput
} from "@/server/repositories/settings.repo";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function resolveMadrasahId(madrasahId?: string): Promise<string | null> {
  if (madrasahId && madrasahId.trim().length > 0) return madrasahId;

  const session = await auth();
  const sessionUser = session?.user as unknown as { madrasahId?: string | null } | undefined;
  if (sessionUser?.madrasahId) {
    return sessionUser.madrasahId;
  }

  const firstMadrasah = await prisma.madrasah.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  return firstMadrasah?.id ?? null;
}

export async function fetchSettingsData(madrasahId?: string) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);

    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const data = await getMadrasahSettingsAndHolidays(targetMadrasahId);
    return { data };
  } catch (error) {
    console.error("Gagal memuat pengaturan:", error);
    return { error: "Gagal memuat data pengaturan kehadiran." };
  }
}

export async function saveAttendanceSettingsAction(
  madrasahId: string,
  input: AttendanceSettingsInput
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);
    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const updated = await updateMadrasahSettings(targetMadrasahId, input);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/geofence");
    revalidatePath("/guru");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    return { error: "Gagal menyimpan perubahan pengaturan kehadiran." };
  }
}

export async function addHolidayAction(madrasahId: string, input: HolidayInput) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);
    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const newHoliday = await createHoliday(targetMadrasahId, input);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");
    return { success: true, data: newHoliday };
  } catch (error) {
    console.error("Gagal menambahkan hari libur:", error);
    return { error: "Gagal menambahkan hari libur baru." };
  }
}

export async function syncKemenagHolidaysAction(
  madrasahId: string,
  year: number | "all" = "all"
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);
    if (!targetMadrasahId) {
      return { success: false as const, error: "Madrasah tidak ditemukan." };
    }

    const res = await syncKemenagHolidays(targetMadrasahId, year);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");
    return { success: true as const, ...res };
  } catch (error) {
    console.error("Gagal sinkronisasi hari libur Kemenag:", error);
    return { success: false as const, error: "Gagal menyinkronkan kalender hari libur Kemenag & Nasional." };
  }
}

export async function deleteHolidayAction(holidayId: string) {
  try {
    await removeHoliday(holidayId);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus hari libur:", error);
    return { error: "Gagal menghapus hari libur." };
  }
}
