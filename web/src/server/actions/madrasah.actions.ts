"use server";

import { 
  getAllMadrasahs, 
  getSuperadminStats, 
  toggleMadrasahStatus,
  createMadrasahWithSettings,
  type CreateMadrasahInput
} from "@/server/repositories/madrasah.repo";
import { revalidatePath } from "next/cache";

export async function fetchSuperadminDashboard() {
  try {
    const [madrasahs, stats] = await Promise.all([
      getAllMadrasahs(),
      getSuperadminStats(),
    ]);

    return { data: { madrasahs, stats } };
  } catch (error) {
    console.error("Gagal mengambil data superadmin:", error);
    return { error: "Gagal memuat data manajemen madrasah." };
  }
}

export async function toggleMadrasahAction(id: string, currentStatus: boolean) {
  try {
    await toggleMadrasahStatus(id, !currentStatus);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error) {
    console.error("Gagal mengubah status madrasah:", error);
    return { error: "Gagal mengubah status madrasah." };
  }
}

export async function createMadrasahAction(data: CreateMadrasahInput) {
  try {
    const newMadrasah = await createMadrasahWithSettings(data);
    revalidatePath("/superadmin");
    return { success: true, data: newMadrasah };
  } catch (error) {
    console.error("Gagal menambahkan madrasah:", error);
    return { error: "Gagal menambahkan madrasah baru. Pastikan NSM belum terdaftar." };
  }
}
