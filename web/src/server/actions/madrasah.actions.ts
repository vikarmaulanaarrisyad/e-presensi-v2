"use server";

import { 
  getAllMadrasahs, 
  getSuperadminStats, 
  toggleMadrasahStatus,
  createMadrasahWithSettings,
  registerSchoolWithAdmin,
  type CreateMadrasahInput,
  type RegisterSchoolRepoInput
} from "@/server/repositories/madrasah.repo";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireSuperadmin } from "@/server/utils/auth-guard";

const registerSchoolSchema = z.object({
  // Data Sekolah
  name: z.string().min(3, "Nama sekolah minimal 3 karakter"),
  nsm: z.string().min(4, "NSM / Kode Registrasi minimal 4 karakter"),
  npsn: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email sekolah tidak valid").optional().or(z.literal("")),
  latitude: z.number({ message: "Koordinat latitude harus berupa angka" }),
  longitude: z.number({ message: "Koordinat longitude harus berupa angka" }),
  radiusMeters: z.number().min(10, "Radius minimal 10 meter").max(500, "Radius maksimal 500 meter").default(50),

  // Akun Administrator
  adminName: z.string().min(3, "Nama admin minimal 3 karakter"),
  adminEmail: z.string().email("Format email admin tidak valid"),
  adminPassword: z.string().min(6, "Password minimal 6 karakter"),
  adminPhone: z.string().optional(),
  adminNip: z.string().optional(),
});

export type RegisterSchoolFormData = z.infer<typeof registerSchoolSchema>;

export async function registerSchoolAction(formData: RegisterSchoolFormData) {
  const parsed = registerSchoolSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Data pendaftaran tidak valid." };
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsed.data.adminPassword, salt);

    const { madrasah, adminUser } = await registerSchoolWithAdmin({
      name: parsed.data.name,
      nsm: parsed.data.nsm,
      npsn: parsed.data.npsn || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radiusMeters: parsed.data.radiusMeters || 50,
      adminName: parsed.data.adminName,
      adminEmail: parsed.data.adminEmail,
      adminPasswordHash: passwordHash,
      adminPhone: parsed.data.adminPhone || null,
      adminNip: parsed.data.adminNip || null,
    });

    revalidatePath("/superadmin");
    return {
      success: true,
      data: {
        madrasahId: madrasah.id,
        schoolName: madrasah.name,
        nsm: madrasah.nsm,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
      },
    };
  } catch (error: any) {
    console.error("Gagal melakukan registrasi sekolah:", error);
    return { error: error?.message || "Gagal melakukan registrasi sekolah. Silakan coba kembali." };
  }
}

export async function fetchSuperadminDashboard() {
  try {
    await requireSuperadmin();

    const [madrasahs, stats] = await Promise.all([
      getAllMadrasahs(),
      getSuperadminStats(),
    ]);

    return { data: { madrasahs, stats } };
  } catch (error: any) {
    console.error("Gagal mengambil data superadmin:", error);
    return { error: error?.message || "Gagal memuat data manajemen madrasah." };
  }
}

export async function toggleMadrasahAction(id: string, currentStatus: boolean) {
  try {
    await requireSuperadmin();

    await toggleMadrasahStatus(id, !currentStatus);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal mengubah status madrasah:", error);
    return { error: error?.message || "Gagal mengubah status madrasah." };
  }
}

export async function createMadrasahAction(data: CreateMadrasahInput) {
  try {
    await requireSuperadmin();

    const newMadrasah = await createMadrasahWithSettings(data);
    revalidatePath("/superadmin");
    return { success: true, data: newMadrasah };
  } catch (error: any) {
    console.error("Gagal menambahkan madrasah:", error);
    return { error: error?.message || "Gagal menambahkan madrasah baru. Pastikan NSM belum terdaftar." };
  }
}
