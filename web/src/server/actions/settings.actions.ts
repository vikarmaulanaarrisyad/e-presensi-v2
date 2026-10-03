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
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";

export async function fetchSettingsData(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);
    const data = await getMadrasahSettingsAndHolidays(targetMadrasahId);
    return { data };
  } catch (error: any) {
    console.error("Gagal memuat pengaturan:", error);
    return { error: error?.message || "Gagal memuat data pengaturan kehadiran." };
  }
}

export async function saveAttendanceSettingsAction(
  madrasahId: string,
  input: AttendanceSettingsInput
) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const updated = await updateMadrasahSettings(targetMadrasahId, input);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/geofence");
    revalidatePath("/guru");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal menyimpan pengaturan:", error);
    return { error: error?.message || "Gagal menyimpan perubahan pengaturan kehadiran." };
  }
}

export async function addHolidayAction(madrasahId: string, input: HolidayInput) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const newHoliday = await createHoliday(targetMadrasahId, input);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");
    return { success: true, data: newHoliday };
  } catch (error: any) {
    console.error("Gagal menambahkan hari libur:", error);
    return { error: error?.message || "Gagal menambahkan hari libur baru." };
  }
}

export async function syncKemenagHolidaysAction(
  madrasahId: string,
  year: number | "all" = "all"
) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const res = await syncKemenagHolidays(targetMadrasahId, year);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/guru");
    return { success: true as const, ...res };
  } catch (error: any) {
    console.error("Gagal sinkronisasi hari libur Kemenag:", error);
    return { success: false as const, error: error?.message || "Gagal menyinkronkan kalender hari libur Kemenag & Nasional." };
  }
}

export async function deleteHolidayAction(holidayId: string) {
  try {
    const { user, madrasahId } = await requireMadrasahAdmin();

    if (user.role !== "SUPERADMIN") {
      const holiday = await prisma.holiday.findUnique({
        where: { id: holidayId },
        select: { madrasahId: true },
      });
      if (!holiday || holiday.madrasahId !== madrasahId) {
        return { error: "Akses ditolak: Hari libur tidak ditemukan di madrasah Anda." };
      }
    }

    await removeHoliday(holidayId);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal menghapus hari libur:", error);
    return { error: error?.message || "Gagal menghapus hari libur." };
  }
}
