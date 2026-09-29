import { prisma } from "@/lib/prisma";

export async function getAllMadrasahs() {
  return await prisma.madrasah.findMany({
    include: {
      settings: true,
      _count: {
        select: {
          users: { where: { role: "TEACHER" } },
          attendanceLogs: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getSuperadminStats() {
  const [totalMadrasahs, activeMadrasahs, totalTeachers, totalAttendanceToday] =
    await Promise.all([
      prisma.madrasah.count(),
      prisma.madrasah.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.attendanceLog.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

  return {
    totalMadrasahs,
    activeMadrasahs,
    totalTeachers,
    totalAttendanceToday,
  };
}

export async function toggleMadrasahStatus(id: string, isActive: boolean) {
  return await prisma.madrasah.update({
    where: { id },
    data: { isActive },
  });
}

export interface CreateMadrasahInput {
  name: string;
  nsm: string;
  npsn?: string;
  address?: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export async function createMadrasahWithSettings(input: CreateMadrasahInput) {
  return await prisma.madrasah.create({
    data: {
      name: input.name,
      nsm: input.nsm,
      npsn: input.npsn || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      isActive: true,
      settings: {
        create: {
          latitude: input.latitude,
          longitude: input.longitude,
          radiusMeters: input.radiusMeters || 50,
          workStartTime: "07:00",
          lateThreshold: "07:15",
          workEndTime: "14:00",
        },
      },
    },
    include: {
      settings: true,
    },
  });
}

export interface RegisterSchoolRepoInput {
  name: string;
  nsm: string;
  npsn?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
  adminPhone?: string | null;
  adminNip?: string | null;
}

export async function registerSchoolWithAdmin(input: RegisterSchoolRepoInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validasi keunikan NSM
    const existingNsm = await tx.madrasah.findUnique({
      where: { nsm: input.nsm.trim() },
    });
    if (existingNsm) {
      throw new Error(`NSM / Kode Registrasi "${input.nsm}" sudah terdaftar.`);
    }

    // 2. Validasi keunikan NPSN (jika diisi)
    if (input.npsn?.trim()) {
      const existingNpsn = await tx.madrasah.findUnique({
        where: { npsn: input.npsn.trim() },
      });
      if (existingNpsn) {
        throw new Error(`NPSN "${input.npsn}" sudah terdaftar.`);
      }
    }

    // 3. Validasi keunikan Email Admin
    const cleanEmail = input.adminEmail.toLowerCase().trim();
    const existingUserEmail = await tx.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUserEmail) {
      throw new Error(`Email "${cleanEmail}" sudah digunakan oleh akun lain.`);
    }

    // 4. Validasi keunikan NIP Admin (jika diisi)
    if (input.adminNip?.trim()) {
      const cleanNip = input.adminNip.trim();
      const existingUserNip = await tx.user.findFirst({
        where: { nip: cleanNip },
      });
      if (existingUserNip) {
        throw new Error(`NIP/NIK "${cleanNip}" sudah digunakan oleh akun lain.`);
      }
    }

    // 5. Buat Madrasah beserta pengaturan Geofence default
    const madrasah = await tx.madrasah.create({
      data: {
        name: input.name.trim(),
        nsm: input.nsm.trim(),
        npsn: input.npsn?.trim() || null,
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        isActive: true,
        settings: {
          create: {
            latitude: input.latitude,
            longitude: input.longitude,
            radiusMeters: input.radiusMeters || 50,
            workStartTime: "07:00",
            lateThreshold: "07:15",
            workEndTime: "14:00",
            workDays: "1,2,3,4,5",
            requireSelfie: true,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // 6. Buat Akun Administrator Sekolah (Role ADMIN_MADRASAH)
    const adminUser = await tx.user.create({
      data: {
        madrasahId: madrasah.id,
        name: input.adminName.trim(),
        email: cleanEmail,
        nip: input.adminNip?.trim() || null,
        passwordHash: input.adminPasswordHash,
        role: "ADMIN_MADRASAH",
        phone: input.adminPhone?.trim() || null,
        isActive: true,
      },
    });

    return { madrasah, adminUser };
  });
}
