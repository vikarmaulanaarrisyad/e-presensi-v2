"use server";

import { prisma } from "@/lib/prisma";
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";
import { revalidatePath } from "next/cache";

export async function getGoogleDriveStatusAction(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const isSystemConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );

    const madrasah = await prisma.madrasah.findUnique({
      where: { id: targetMadrasahId },
      select: {
        id: true,
        name: true,
        googleDriveEmail: true,
        googleDriveFolderId: true,
        googleDriveFolderName: true,
        googleDriveConnectedAt: true,
        googleDriveEnabled: true,
        googleDriveRefreshToken: true,
      },
    });

    if (!madrasah) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const isConnected = Boolean(
      madrasah.googleDriveRefreshToken && madrasah.googleDriveFolderId
    );

    return {
      success: true,
      data: {
        isSystemConfigured,
        isConnected,
        email: madrasah.googleDriveEmail,
        folderId: madrasah.googleDriveFolderId,
        folderName: madrasah.googleDriveFolderName,
        connectedAt: madrasah.googleDriveConnectedAt,
        isEnabled: madrasah.googleDriveEnabled,
      },
    };
  } catch (error: any) {
    console.error("Gagal mendapatkan status Google Drive:", error);
    return { error: error?.message || "Gagal memuat status Google Drive." };
  }
}

export async function toggleGoogleDriveAction(madrasahId: string, enabled: boolean) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const updated = await prisma.madrasah.update({
      where: { id: targetMadrasahId },
      data: { googleDriveEnabled: enabled },
    });

    revalidatePath("/admin/settings");
    return { success: true, enabled: updated.googleDriveEnabled };
  } catch (error: any) {
    console.error("Gagal mengubah status Google Drive:", error);
    return { error: error?.message || "Gagal mengubah pengaturan Google Drive." };
  }
}

export async function disconnectGoogleDriveAction(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    await prisma.madrasah.update({
      where: { id: targetMadrasahId },
      data: {
        googleDriveEmail: null,
        googleDriveRefreshToken: null,
        googleDriveFolderId: null,
        googleDriveFolderName: null,
        googleDriveConnectedAt: null,
        googleDriveEnabled: false,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal memutuskan koneksi Google Drive:", error);
    return { error: error?.message || "Gagal memutuskan koneksi Google Drive." };
  }
}
