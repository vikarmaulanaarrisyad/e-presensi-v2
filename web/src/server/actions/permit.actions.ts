"use server";

import { revalidatePath } from "next/cache";
import {
  getPendingPermits,
  countPendingPermits,
  approvePermit,
  rejectPermit,
  getTeacherPermits,
  getAllPermits,
} from "@/server/repositories/permit.repo";
import { getFingerprintConfig } from "@/server/repositories/fingerprint.repo";
import { requireAuth, requireMadrasahAdmin } from "@/server/utils/auth-guard";
import { PermitStatus } from "@prisma/client";

/**
 * Mengambil ringkasan notifikasi terpadu untuk Header Navbar
 */
export async function getNavbarNotificationDataAction() {
  try {
    const session = await requireAuth();

    if (session.role === "TEACHER" || !session.madrasahId) {
      return {
        success: true,
        data: {
          pendingPermitsCount: 0,
          pendingPermits: [],
          fingerprintStatus: null,
        },
      };
    }

    const [pendingCount, pendingList, fpConfig] = await Promise.all([
      countPendingPermits(session.madrasahId),
      getPendingPermits(session.madrasahId, 5),
      getFingerprintConfig(session.madrasahId),
    ]);

    let fpHealth = "DISCONNECTED";
    if (fpConfig?.fingerprintLastSync) {
      const diffMinutes =
        (Date.now() - new Date(fpConfig.fingerprintLastSync).getTime()) / (1000 * 60);
      if (diffMinutes <= 15) {
        fpHealth = "ONLINE";
      } else if (diffMinutes <= 60) {
        fpHealth = "IDLE";
      } else {
        fpHealth = "OFFLINE_WARNING";
      }
    }

    return {
      success: true,
      data: {
        pendingPermitsCount: pendingCount,
        pendingPermits: pendingList,
        fingerprintStatus: {
          lastSync: fpConfig?.fingerprintLastSync || null,
          health: fpHealth,
          ip: fpConfig?.fingerprintIp || null,
        },
      },
    };
  } catch (error: any) {
    console.error("Gagal mengambil notifikasi navbar:", error);
    return {
      error: error?.message || "Gagal memuat notifikasi.",
      data: {
        pendingPermitsCount: 0,
        pendingPermits: [],
        fingerprintStatus: null,
      },
    };
  }
}

/**
 * Action untuk menyetujui (Approve) permohonan izin
 */
export async function approvePermitAction(permitId: string) {
  try {
    const { user, madrasahId } = await requireMadrasahAdmin();

    const result = await approvePermit(madrasahId, permitId, user.id);

    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/permits");
    revalidatePath("/guru");

    return {
      success: true,
      message: `Permohonan izin untuk ${result.user.name} berhasil disetujui.`,
      data: result,
    };
  } catch (error: any) {
    console.error("Gagal menyetujui izin:", error);
    return { error: error?.message || "Gagal menyetujui izin." };
  }
}

/**
 * Action untuk menolak (Reject) permohonan izin
 */
export async function rejectPermitAction(permitId: string, rejectionReason: string) {
  try {
    const { user, madrasahId } = await requireMadrasahAdmin();

    const result = await rejectPermit(madrasahId, permitId, user.id, rejectionReason);

    revalidatePath("/admin");
    revalidatePath("/admin/permits");
    revalidatePath("/guru");

    return {
      success: true,
      message: `Permohonan izin untuk ${result.user.name} telah ditolak.`,
      data: result,
    };
  } catch (error: any) {
    console.error("Gagal menolak izin:", error);
    return { error: error?.message || "Gagal menolak permohonan izin." };
  }
}

/**
 * Action untuk mengambil daftar permohonan izin pada halaman kelola izin admin
 */
export async function getAdminPermitsListAction(filter?: {
  status?: PermitStatus;
  searchQuery?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { madrasahId } = await requireMadrasahAdmin();
    const result = await getAllPermits(madrasahId, filter);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Gagal memuat daftar permohonan izin admin:", error);
    return { error: error?.message || "Gagal memuat permohonan izin." };
  }
}

/**
 * Action untuk mengambil riwayat permohonan izin guru yang sedang login
 */
export async function getTeacherPermitHistoryAction() {
  try {
    const session = await requireAuth();
    const history = await getTeacherPermits(session.id, 20);
    return { success: true, data: history };
  } catch (error: any) {
    console.error("Gagal memuat riwayat izin guru:", error);
    return { error: error?.message || "Gagal memuat riwayat izin." };
  }
}
