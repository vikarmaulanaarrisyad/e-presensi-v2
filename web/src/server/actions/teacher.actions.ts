"use server";

import { 
  getTeachersByMadrasah, 
  createTeacher, 
  updateTeacher, 
  deleteTeacher, 
  toggleTeacherStatus,
  resetTeacherPassword,
  bulkImportTeachers,
  type TeacherInput,
  type TeacherImportData
} from "@/server/repositories/teacher.repo";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";

/**
 * Validates that the requested teacher exists and belongs to the caller's madrasah.
 */
async function assertTeacherBelongsToCaller(teacherId: string) {
  const { user, madrasahId } = await requireMadrasahAdmin();
  if (user.role === "SUPERADMIN") {
    return;
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { madrasahId: true },
  });

  if (!teacher || teacher.madrasahId !== madrasahId) {
    throw new Error("Akses ditolak: Data guru tidak ditemukan di madrasah Anda.");
  }
}

export async function fetchTeachersData(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);
    const data = await getTeachersByMadrasah(targetMadrasahId);
    return { data };
  } catch (error: any) {
    console.error("Gagal memuat data guru:", error);
    return { error: error?.message || "Gagal memuat daftar guru madrasah." };
  }
}

export async function createTeacherAction(madrasahId: string, input: TeacherInput) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });

    if (existing) {
      return { error: "Email sudah terdaftar pada pengguna lain." };
    }

    const newTeacher = await createTeacher(targetMadrasahId, input);
    revalidatePath("/admin/teachers");
    revalidatePath("/admin");
    return { success: true, data: newTeacher };
  } catch (error: any) {
    console.error("Gagal menambahkan guru:", error);
    return { error: error.message || "Gagal menambahkan guru baru." };
  }
}

export async function updateTeacherAction(teacherId: string, input: Partial<TeacherInput>) {
  try {
    await assertTeacherBelongsToCaller(teacherId);

    if (input.email) {
      const existing = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
      });
      if (existing && existing.id !== teacherId) {
        return { error: "Email sudah digunakan oleh guru lain." };
      }
    }

    const updated = await updateTeacher(teacherId, input);
    revalidatePath("/admin/teachers");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal memperbarui guru:", error);
    return { error: error.message || "Gagal menyimpan perubahan data guru." };
  }
}

export async function toggleTeacherStatusAction(teacherId: string, isActive: boolean) {
  try {
    await assertTeacherBelongsToCaller(teacherId);

    const updated = await toggleTeacherStatus(teacherId, isActive);
    revalidatePath("/admin/teachers");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Gagal mengubah status guru:", error);
    return { error: error?.message || "Gagal mengubah status aktif guru." };
  }
}

export async function resetTeacherPasswordAction(teacherId: string, newPassword?: string) {
  try {
    await assertTeacherBelongsToCaller(teacherId);

    const result = await resetTeacherPassword(teacherId, newPassword);
    return { success: true, newPassword: result.password };
  } catch (error: any) {
    console.error("Gagal mereset password:", error);
    return { error: error?.message || "Gagal mereset kata sandi guru." };
  }
}

export async function deleteTeacherAction(teacherId: string) {
  try {
    await assertTeacherBelongsToCaller(teacherId);

    await deleteTeacher(teacherId);
    revalidatePath("/admin/teachers");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal menghapus guru:", error);
    return { error: error?.message || "Gagal menghapus guru dari sistem." };
  }
}

export async function importTeachersAction(
  madrasahId: string,
  teachersData: TeacherImportData[]
) {
  try {
    if (!teachersData || teachersData.length === 0) {
      return { success: false as const, error: "Tidak ada data guru yang diunggah." };
    }

    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const result = await bulkImportTeachers(targetMadrasahId, teachersData);
    revalidatePath("/admin/teachers");
    revalidatePath("/admin");
    return { ...result, success: true as const };
  } catch (error: any) {
    console.error("Gagal mengimpor guru:", error);
    return { success: false as const, error: error.message || "Terjadi kesalahan saat mengimpor data guru dari Excel." };
  }
}
