"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, requireMadrasahAdmin } from "@/server/utils/auth-guard";
import { toUtcMidnight } from "@/lib/date-utils";

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
export async function getTeacherJournalsAction(
  dateStr?: string, 
  explicitUserId?: string,
  page: number = 1,
  pageSize: number = 20
) {
  try {
    const user = await requireAuth();

    let targetUserId = user.id;
    if (user.role === "TEACHER") {
      targetUserId = user.id; // strictly self
    } else if (user.role === "ADMIN_MADRASAH") {
      if (explicitUserId && explicitUserId.trim()) {
        const check = await prisma.user.findFirst({
          where: { id: explicitUserId.trim(), madrasahId: user.madrasahId },
          select: { id: true },
        });
        if (!check) {
          return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
        }
        targetUserId = check.id;
      }
    } else if (user.role === "SUPERADMIN") {
      if (explicitUserId && explicitUserId.trim()) {
        targetUserId = explicitUserId.trim();
      }
    }

    const teacher = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, madrasahId: true, name: true },
    });

    if (!teacher || !teacher.madrasahId) {
      return { error: "Data guru atau madrasah tidak ditemukan." };
    }

    const targetDateUtc = toUtcMidnight(dateStr);

    const db = prisma as any;

    const currentPage = Math.max(1, Number(page) || 1);
    const limit = Math.max(1, Number(pageSize) || 20);
    const skip = (currentPage - 1) * limit;
    const take = limit;

    const [todayJournals, recentJournals, totalRecentCount] = await Promise.all([
      db.teachingJournal.findMany({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
          date: targetDateUtc,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.teachingJournal.findMany({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
        },
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      db.teachingJournal.count({
        where: {
          userId: teacher.id,
          madrasahId: teacher.madrasahId,
        },
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
      pagination: {
        total: totalRecentCount,
        page: currentPage,
        pageSize: limit,
        totalPages: Math.ceil(totalRecentCount / limit),
      },
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
    const user = await requireAuth();

    let targetUserId = user.id;
    let targetMadrasahId = user.madrasahId;

    if (user.role === "TEACHER") {
      targetUserId = user.id;
      if (!user.madrasahId) {
        return { error: "Akun Anda belum terhubung ke madrasah manapun." };
      }
      targetMadrasahId = user.madrasahId;
    } else if (user.role === "ADMIN_MADRASAH") {
      if (payload.userId && payload.userId !== user.id) {
        const check = await prisma.user.findFirst({
          where: { id: payload.userId, madrasahId: user.madrasahId },
          select: { id: true, madrasahId: true },
        });
        if (!check || !check.madrasahId) {
          return { error: "Akses ditolak: Guru tidak terdaftar di madrasah Anda." };
        }
        targetUserId = check.id;
        targetMadrasahId = check.madrasahId;
      } else {
        targetMadrasahId = user.madrasahId;
      }
    } else if (user.role === "SUPERADMIN") {
      if (payload.userId) {
        const check = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, madrasahId: true },
        });
        if (check && check.madrasahId) {
          targetUserId = check.id;
          targetMadrasahId = check.madrasahId;
        }
      }
    }

    if (!targetMadrasahId) {
      return { error: "Data madrasah tidak ditemukan." };
    }

    const dateObj = toUtcMidnight(payload.date);

    const db = prisma as any;
    const newJournal = await db.teachingJournal.create({
      data: {
        madrasahId: targetMadrasahId,
        userId: targetUserId,
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
    const user = await requireAuth();
    const db = prisma as any;
    const existing = await db.teachingJournal.findUnique({
      where: { id: journalId },
    });

    if (!existing) {
      return { error: "Jurnal tidak ditemukan." };
    }

    // Authorization: guru hanya boleh ubah milik sendiri, admin hanya boleh madrasahnya
    if (user.role === "TEACHER" && existing.userId !== user.id) {
      return { error: "Akses ditolak: Anda hanya dapat mengubah jurnal Anda sendiri." };
    }
    if (user.role === "ADMIN_MADRASAH" && existing.madrasahId !== user.madrasahId) {
      return { error: "Akses ditolak: Jurnal tidak ditemukan di madrasah Anda." };
    }

    const updateData: any = {};
    if (payload.date) {
      updateData.date = toUtcMidnight(payload.date);
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
 * Fetch a single Teaching Journal by ID
 */
export async function getTeachingJournalByIdAction(journalId: string) {
  try {
    const user = await requireAuth();
    const db = prisma as any;
    const journal = await db.teachingJournal.findUnique({
      where: { id: journalId },
    });

    if (!journal) {
      return { error: "Catatan jurnal pembelajaran tidak ditemukan." };
    }

    if (user.role === "TEACHER" && journal.userId !== user.id) {
      return { error: "Akses ditolak: Anda tidak memiliki akses ke jurnal ini." };
    }
    if (user.role === "ADMIN_MADRASAH" && journal.madrasahId !== user.madrasahId) {
      return { error: "Akses ditolak: Jurnal tidak ditemukan di madrasah Anda." };
    }

    return {
      success: true,
      journal: {
        id: journal.id,
        date: journal.date.toISOString().split("T")[0],
        className: journal.className,
        subjectName: journal.subjectName,
        sessionHours: journal.sessionHours,
        topicTitle: journal.topicTitle,
        activities: journal.activities,
        studentPresence: journal.studentPresence,
        notes: journal.notes,
        photoUrl: journal.photoUrl,
        userId: journal.userId,
        madrasahId: journal.madrasahId,
        createdAt: journal.createdAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Gagal memuat detail jurnal:", error);
    return { error: error.message || "Gagal memuat detail jurnal pembelajaran." };
  }
}

/**
 * Delete a Teaching Journal entry
 */
export async function deleteTeachingJournalAction(journalId: string) {
  try {
    const user = await requireAuth();
    const db = prisma as any;
    const existing = await db.teachingJournal.findUnique({
      where: { id: journalId },
    });

    if (!existing) {
      return { error: "Jurnal tidak ditemukan." };
    }

    if (user.role === "TEACHER" && existing.userId !== user.id) {
      return { error: "Akses ditolak: Anda hanya dapat menghapus jurnal Anda sendiri." };
    }
    if (user.role === "ADMIN_MADRASAH" && existing.madrasahId !== user.madrasahId) {
      return { error: "Akses ditolak: Jurnal tidak ditemukan di madrasah Anda." };
    }

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
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const madrasah = await prisma.madrasah.findUnique({
      where: { id: targetMadrasahId },
      select: { id: true, name: true, nsm: true, address: true },
    });

    const teachers = await prisma.user.findMany({
      where: {
        madrasahId: targetMadrasahId,
        role: "TEACHER",
        isActive: true,
      },
      select: { id: true, name: true, nip: true },
      orderBy: { name: "asc" },
    });

    return {
      data: {
        madrasah: madrasah || {
          id: targetMadrasahId,
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
      error: error?.message || "Gagal memuat data awal jurnal madrasah.",
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
  page?: number;
  pageSize?: number;
}) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);
    const db = prisma as any;
    const where: any = { madrasahId: targetMadrasahId };

    if (filters?.dateStr) {
      where.date = toUtcMidnight(filters.dateStr);
    } else if (filters?.startDate && filters?.endDate) {
      const startUtc = toUtcMidnight(filters.startDate);
      const endUtc = new Date(toUtcMidnight(filters.endDate).getTime() + 24 * 60 * 60 * 1000 - 1);
      where.date = {
        gte: startUtc,
        lte: endUtc,
      };
    } else if (filters?.startDate) {
      where.date = {
        gte: toUtcMidnight(filters.startDate),
      };
    }

    if (filters?.teacherId && filters.teacherId !== "all") {
      where.userId = filters.teacherId;
    }

    if (filters?.className && filters.className !== "all") {
      where.className = filters.className;
    }

    const currentPage = filters?.page && filters.page > 0 ? Number(filters.page) : 1;
    const limit = filters?.pageSize && filters.pageSize > 0 ? Number(filters.pageSize) : undefined;
    const skip = limit !== undefined ? (currentPage - 1) * limit : undefined;
    const take = limit;

    const [totalCount, journals] = await Promise.all([
      db.teachingJournal.count({ where }),
      db.teachingJournal.findMany({
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
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
      }),
    ]);

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
      pagination: {
        total: totalCount,
        page: currentPage,
        pageSize: limit || totalCount,
        totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      },
    };
  } catch (error: any) {
    console.error("Gagal memuat jurnal admin:", error);
    return { error: error.message || "Gagal memuat rekap jurnal madrasah." };
  }
}
