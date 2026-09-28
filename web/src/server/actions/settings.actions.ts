"use server";

import { 
  getMadrasahSettingsAndHolidays, 
  updateMadrasahSettings, 
  createHoliday, 
  removeHoliday,
  type AttendanceSettingsInput,
  type HolidayInput
} from "@/server/repositories/settings.repo";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function fetchSettingsData(madrasahId?: string) {
  try {
    let targetMadrasahId = madrasahId;

    if (!targetMadrasahId) {
      const first = await prisma.madrasah.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      targetMadrasahId = first?.id;
    }

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
    const updated = await updateMadrasahSettings(madrasahId, input);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/admin/geofence");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    return { error: "Gagal menyimpan perubahan pengaturan kehadiran." };
  }
}

export async function addHolidayAction(madrasahId: string, input: HolidayInput) {
  try {
    const newHoliday = await createHoliday(madrasahId, input);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true, data: newHoliday };
  } catch (error) {
    console.error("Gagal menambahkan hari libur:", error);
    return { error: "Gagal menambahkan hari libur baru." };
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
