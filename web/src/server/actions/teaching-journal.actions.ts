"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside Next.js request context
  }
}

export interface TeachingJournalPayload {
  userId?: string;
  date: string; // YYYY-MM-DD
  className: string;
  subjectName: string;
  sessionHours: string;
  topicTitle: string;
  activities: string;
  studentPresence?: string;
  notes?: string;
  photoUrl?: string;
}

/**
 * Fetch journals for a teacher on a specific date and summary stats
 */
export async function getTeacherJournalsAction(dateStr?: string, explicitUserId?: string) {
  try {
    let sessionUser: { id: string; role?: string } | undefined;
    try {
      const session = await auth();
      sessionUser = session?.user as unknown as { id: string; role?: string } | undefined;
    } catch {
      // Allow fallback
    }

    const userId = explicitUserId || sessionUser?.id;
    if (!userId) {
      return { error: "Sesi tidak valid. Silakan login kembali." };
    }

    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, madrasahId: true, name: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Data guru atau madrasah tidak ditemukan." };
    }

    const now = new Date();
    let targetDateStart: Date;
    let targetDateEnd: Date;

    if (dateStr) {
      const [y, m, d] = dateStr.split("-").map(Number);
      targetDateStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      targetDateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      targetDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      targetDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const db = prisma as any;

    const [todayJournals, recentJournals] = await Promise.all([
      db.teachingJournal.findMany({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
          date: {
            gte: targetDateStart,
            lte: targetDateEnd,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.teachingJournal.findMany({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
        },
        orderBy: { date: "desc" },
        take: 20,
      }),
    ]);

    return {
      success: true,
      journals: todayJournals.map((j: any) => ({
        id: j.id,
        date: j.date.toISOString().split("T")[0],
        className: j.className,
        subjectName: j.subjectName,
        sessionHours: j.sessionHours,
        topicTitle: j.topicTitle,
        activities: j.activities,
        studentPresence: j.studentPresence,
        notes: j.notes,
        photoUrl: j.photoUrl,
        createdAt: j.createdAt.toISOString(),
      })),
      recentJournals: recentJournals.map((j: any) => ({
        id: j.id,
        date: j.date.toISOString().split("T")[0],
        className: j.className,
        subjectName: j.subjectName,
        sessionHours: j.sessionHours,
        topicTitle: j.topicTitle,
        activities: j.activities,
        studentPresence: j.studentPresence,
        notes: j.notes,
        photoUrl: j.photoUrl,
      })),
      totalToday: todayJournals.length,
    };
  } catch (error: any) {
    console.error("Gagal memuat jurnal mengajar:", error);
    return { error: error.message || "Gagal memuat data jurnal mengajar." };
  }
}

/**
 * Create a new Teaching Journal entry
 */
export async function createTeachingJournalAction(payload: TeachingJournalPayload) {
  try {
    let sessionUser: { id: string; role?: string } | undefined;
    try {
      const session = await auth();
      sessionUser = session?.user as unknown as { id: string; role?: string } | undefined;
    } catch {
      // Allow fallback
    }

    const isPrivileged = sessionUser?.role === "ADMIN_MADRASAH" || sessionUser?.role === "SUPERADMIN";
    const userId = (isPrivileged && payload.userId) || sessionUser?.id || payload.userId;

    if (!userId) {
      return { error: "Sesi tidak valid. Silakan login kembali." };
    }

    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, madrasahId: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Data guru atau madrasah tidak ditemukan." };
    }

    const [y, m, d] = payload.date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d, 0, 0, 0, 0);

    const db = prisma as any;
    const newJournal = await db.teachingJournal.create({
      data: {
        madrasahId: teacher.madrasahId,
        userId: teacher.id,
        date: dateObj,
        className: payload.className.trim(),
        subjectName: payload.subjectName.trim(),
        sessionHours: payload.sessionHours.trim(),
        topicTitle: payload.topicTitle.trim(),
        activities: payload.activities.trim(),
        studentPresence: payload.studentPresence?.trim() || null,
        notes: payload.notes?.trim() || null,
        photoUrl: payload.photoUrl || null,
      },
    });

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/journals");

    return {
      success: true,
      message: "Jurnal Pembelajaran KBM berhasil disimpan!",
      data: newJournal,
    };
  } catch (error: any) {
    console.error("Gagal menyimpan jurnal mengajar:", error);
    return { error: error.message || "Gagal menyimpan jurnal pembelajaran ke database." };
  }
}

/**
 * Update an existing Teaching Journal entry
 */
export async function updateTeachingJournalAction(
  journalId: string,
  payload: Partial<TeachingJournalPayload>
) {
  try {
    const db = prisma as any;
    const existing = await db.teachingJournal.findUnique({
      where: { id: journalId },
    });

    if (!existing) {
      return { error: "Jurnal tidak ditemukan." };
    }

    const updateData: any = {};
    if (payload.date) {
      const [y, m, d] = payload.date.split("-").map(Number);
      updateData.date = new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    if (payload.className) updateData.className = payload.className.trim();
    if (payload.subjectName) updateData.subjectName = payload.subjectName.trim();
    if (payload.sessionHours) updateData.sessionHours = payload.sessionHours.trim();
    if (payload.topicTitle) updateData.topicTitle = payload.topicTitle.trim();
    if (payload.activities) updateData.activities = payload.activities.trim();
    if (payload.studentPresence !== undefined) updateData.studentPresence = payload.studentPresence?.trim() || null;
    if (payload.notes !== undefined) updateData.notes = payload.notes?.trim() || null;
    if (payload.photoUrl !== undefined) updateData.photoUrl = payload.photoUrl || null;

    const updated = await db.teachingJournal.update({
      where: { id: journalId },
      data: updateData,
    });

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/journals");

    return {
      success: true,
      message: "Jurnal Pembelajaran berhasil diperbarui!",
      data: updated,
    };
  } catch (error: any) {
    console.error("Gagal memperbarui jurnal mengajar:", error);
    return { error: error.message || "Gagal memperbarui jurnal pembelajaran." };
  }
}

/**
 * Delete a Teaching Journal entry
 */
export async function deleteTeachingJournalAction(journalId: string) {
  try {
    const db = prisma as any;
    await db.teachingJournal.delete({
      where: { id: journalId },
    });

    safeRevalidatePath("/guru");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/journals");

    return {
      success: true,
      message: "Jurnal Pembelajaran berhasil dihapus.",
    };
  } catch (error: any) {
    console.error("Gagal menghapus jurnal:", error);
    return { error: error.message || "Gagal menghapus jurnal pembelajaran." };
  }
}

/**
 * Fetch initial data for Admin Journals Page
 */
export async function fetchJournalsInitialData(madrasahId?: string) {
  try {
    let targetMadrasahId = madrasahId;
    try {
      const { madrasahId: authMadrasahId } = await requireMadrasahAdmin(madrasahId);
      targetMadrasahId = authMadrasahId;
    } catch {
      // Fallback
    }

    if (!targetMadrasahId || targetMadrasahId === "default") {
      const firstMadrasah = await prisma.madrasah.findFirst({
        select: { id: true, name: true, nsm: true, address: true },
      });
      targetMadrasahId = firstMadrasah?.id || "";
    }

    const madrasah = await prisma.madrasah.findUnique({
      where: { id: targetMadrasahId || "unknown" },
      select: { id: true, name: true, nsm: true, address: true },
    });

    const teachers = await prisma.user.findMany({
      where: {
        madrasahId: targetMadrasahId || undefined,
        role: "TEACHER",
        isActive: true,
      },
      select: { id: true, name: true, nip: true },
      orderBy: { name: "asc" },
    });

    return {
      data: {
        madrasah: madrasah || {
          id: targetMadrasahId || "default",
          name: "Madrasah",
          nsm: "-",
          address: "-",
        },
        teachers: teachers || [],
      },
    };
  } catch (error: any) {
    console.error("Gagal memuat initial data jurnal admin:", error);
    return {
      data: {
        madrasah: { id: "default", name: "Madrasah", nsm: "-", address: "-" },
        teachers: [],
      },
    };
  }
}

/**
 * Fetch all teaching journals for Admin monitoring
 */
export async function getMadrasahJournalsAdminAction(madrasahId: string, filters?: {
  startDate?: string;
  endDate?: string;
  dateStr?: string;
  teacherId?: string;
  className?: string;
}) {
  try {
    const db = prisma as any;
    let targetMadrasahId = madrasahId;
    if (!targetMadrasahId || targetMadrasahId === "default") {
      const first = await prisma.madrasah.findFirst({ select: { id: true } });
      targetMadrasahId = first?.id || "";
    }
    const where: any = { madrasahId: targetMadrasahId };

    if (filters?.dateStr) {
      const [sy, sm, sd] = filters.dateStr.split("-").map(Number);
      where.date = {
        gte: new Date(sy, sm - 1, sd, 0, 0, 0, 0),
        lte: new Date(sy, sm - 1, sd, 23, 59, 59, 999),
      };
    } else if (filters?.startDate && filters?.endDate) {
      const [sy, sm, sd] = filters.startDate.split("-").map(Number);
      const [ey, em, ed] = filters.endDate.split("-").map(Number);
      where.date = {
        gte: new Date(sy, sm - 1, sd, 0, 0, 0, 0),
        lte: new Date(ey, em - 1, ed, 23, 59, 59, 999),
      };
    } else if (filters?.startDate) {
      const [sy, sm, sd] = filters.startDate.split("-").map(Number);
      where.date = {
        gte: new Date(sy, sm - 1, sd, 0, 0, 0, 0),
        lte: new Date(sy, sm - 1, sd, 23, 59, 59, 999),
      };
    }

    if (filters?.teacherId && filters.teacherId !== "all") {
      where.userId = filters.teacherId;
    }

    if (filters?.className && filters.className !== "all") {
      where.className = filters.className;
    }

    const journals = await db.teachingJournal.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nip: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return {
      success: true,
      data: journals.map((j: any) => ({
        id: j.id,
        date: j.date.toISOString().split("T")[0],
        className: j.className,
        subjectName: j.subjectName,
        sessionHours: j.sessionHours,
        topicTitle: j.topicTitle,
        activities: j.activities,
        studentPresence: j.studentPresence,
        notes: j.notes,
        photoUrl: j.photoUrl,
        createdAt: j.createdAt.toISOString(),
        teacherName: j.user?.name ?? "Guru",
        teacherNip: j.user?.nip ?? "-",
        teacherAvatar: j.user?.avatarUrl,
      })),
    };
  } catch (error: any) {
    console.error("Gagal memuat jurnal admin:", error);
    return { error: error.message || "Gagal memuat rekap jurnal madrasah." };
  }
}
