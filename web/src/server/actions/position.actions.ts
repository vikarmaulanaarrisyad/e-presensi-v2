"use server";

import { 
  getPositionsByMadrasah, 
  createPosition, 
  updatePosition, 
  deletePosition, 
  seedDefaultPositions,
  type PositionInput 
} from "@/server/repositories/position.repo";
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

export async function fetchPositionsData(madrasahId?: string) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);

    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const positionDelegate = (prisma as any).position;
    if (!positionDelegate) {
      console.warn("[Prisma] Model position belum aktif di dev server. Perlu restart npm run dev.");
      return { 
        error: "Server development belum memuat schema baru. Silakan restart terminal dev Anda (tekan Ctrl+C lalu jalankan 'npm run dev')." 
      };
    }

    // Auto-seed standard Kemenag positions if this madrasah doesn't have any yet
    const existingCount = await positionDelegate.count({
      where: { madrasahId: targetMadrasahId },
    });

    if (existingCount === 0) {
      await seedDefaultPositions(targetMadrasahId);
    }

    const data = await getPositionsByMadrasah(targetMadrasahId);
    return { success: true, data };
  } catch (error: any) {
    console.error("Gagal memuat master jabatan:", error);
    return { error: error.message || "Gagal memuat daftar jabatan madrasah." };
  }
}

export async function createPositionAction(
  madrasahId: string,
  input: PositionInput
) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);
    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    if (!input.name || input.name.trim().length < 2) {
      return { error: "Nama jabatan minimal 2 karakter." };
    }

    // Check duplicate name
    const existing = await prisma.position.findFirst({
      where: {
        madrasahId: targetMadrasahId,
        name: { equals: input.name.trim(), mode: "insensitive" },
      },
    });

    if (existing) {
      return { error: `Jabatan "${input.name.trim()}" sudah ada di madrasah ini.` };
    }

    // If marked as Headmaster, unmark other headmasters if single headmaster policy
    if (input.isHeadmaster) {
      await prisma.position.updateMany({
        where: { madrasahId: targetMadrasahId, isHeadmaster: true },
        data: { isHeadmaster: false },
      });
    }

    const newPosition = await createPosition(targetMadrasahId, input);

    revalidatePath("/admin/positions");
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/reports");

    return { success: true, data: newPosition };
  } catch (error: any) {
    console.error("Gagal menambahkan jabatan:", error);
    return { error: error.message || "Gagal menyimpan data jabatan baru." };
  }
}

export async function updatePositionAction(
  positionId: string,
  input: Partial<PositionInput>
) {
  try {
    const current = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!current) {
      return { error: "Jabatan tidak ditemukan." };
    }

    if (input.name && input.name.trim() !== current.name) {
      const existing = await prisma.position.findFirst({
        where: {
          madrasahId: current.madrasahId,
          name: { equals: input.name.trim(), mode: "insensitive" },
          id: { not: positionId },
        },
      });

      if (existing) {
        return { error: `Jabatan "${input.name.trim()}" sudah ada.` };
      }
    }

    if (input.isHeadmaster) {
      await prisma.position.updateMany({
        where: {
          madrasahId: current.madrasahId,
          isHeadmaster: true,
          id: { not: positionId },
        },
        data: { isHeadmaster: false },
      });
    }

    const updated = await updatePosition(positionId, input);

    revalidatePath("/admin/positions");
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/reports");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal memperbarui jabatan:", error);
    return { error: error.message || "Gagal menyimpan perubahan jabatan." };
  }
}

export async function deletePositionAction(positionId: string) {
  try {
    await deletePosition(positionId);

    revalidatePath("/admin/positions");
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/reports");

    return { success: true };
  } catch (error: any) {
    console.error("Gagal menghapus jabatan:", error);
    return { error: error.message || "Gagal menghapus jabatan." };
  }
}

export async function seedDefaultPositionsAction(madrasahId?: string) {
  try {
    const targetMadrasahId = await resolveMadrasahId(madrasahId);
    if (!targetMadrasahId) {
      return { error: "Madrasah tidak ditemukan." };
    }

    const res = await seedDefaultPositions(targetMadrasahId);

    revalidatePath("/admin/positions");
    revalidatePath("/admin/teachers");

    return res;
  } catch (error: any) {
    console.error("Gagal memuat preset jabatan Kemenag:", error);
    return { error: error.message || "Gagal menerapkan standar jabatan Kemenag." };
  }
}
