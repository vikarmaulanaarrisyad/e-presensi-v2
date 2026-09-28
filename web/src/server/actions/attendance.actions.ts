"use server";

import { getMadrasahDashboardData } from "@/server/repositories/attendance.repo";
import { prisma } from "@/lib/prisma";

export async function fetchAdminDashboardData(madrasahId?: string) {
  try {
    let targetMadrasahId = madrasahId;

    // If madrasahId not provided, fallback to the first active madrasah in database
    if (!targetMadrasahId) {
      const firstMadrasah = await prisma.madrasah.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      targetMadrasahId = firstMadrasah?.id;
    }

    if (!targetMadrasahId) {
      return { error: "Data madrasah tidak ditemukan." };
    }

    const data = await getMadrasahDashboardData(targetMadrasahId);
    return { data };
  } catch (error) {
    console.error("Gagal mengambil data dashboard:", error);
    return { error: "Gagal memuat data dashboard presensi." };
  }
}
