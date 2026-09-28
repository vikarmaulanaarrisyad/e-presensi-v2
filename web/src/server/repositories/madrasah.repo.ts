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
