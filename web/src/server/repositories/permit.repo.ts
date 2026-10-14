import { prisma } from "@/lib/prisma";
import { PermitStatus, PermitType, AttendanceStatus } from "@prisma/client";

/**
 * Normalisasi Date ke UTC midnight
 */
function toUtcMidnight(dateInput: string | Date): Date {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Buat permohonan izin baru
 */
export async function createPermitRequest(data: {
  madrasahId: string;
  userId: string;
  type: PermitType;
  startDate: string | Date;
  endDate?: string | Date;
  notes: string;
  attachmentUrl?: string | null;
  autoApprove?: boolean;
  approvedById?: string;
}) {
  const start = toUtcMidnight(data.startDate);
  const end = data.endDate ? toUtcMidnight(data.endDate) : start;

  if (start > end) {
    throw new Error("Tanggal mulai tidak boleh lebih dari tanggal selesai.");
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays > 30) {
    throw new Error("Rentang permohonan izin maksimal 30 hari dalam satu pengajuan.");
  }

  const status: PermitStatus = data.autoApprove ? "APPROVED" : "PENDING";

  return await prisma.$transaction(async (tx) => {
    const permit = await tx.permitRequest.create({
      data: {
        madrasahId: data.madrasahId,
        userId: data.userId,
        type: data.type,
        status,
        startDate: start,
        endDate: end,
        totalDays,
        notes: data.notes,
        attachmentUrl: data.attachmentUrl || null,
        approvedById: data.autoApprove ? data.approvedById : null,
        approvedAt: data.autoApprove ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nip: true,
            avatarUrl: true,
            position: { select: { name: true } },
          },
        },
      },
    });

    // Jika auto-approve (misal diajukan langsung oleh Admin), langsung buat record attendance log
    if (data.autoApprove) {
      await applyPermitToAttendanceLogs(tx, {
        madrasahId: data.madrasahId,
        userId: data.userId,
        type: data.type,
        startDate: start,
        endDate: end,
        notes: data.notes,
        attachmentUrl: data.attachmentUrl || null,
      });
    }

    return permit;
  });
}

/**
 * Mengaplikasikan status izin ke AttendanceLog untuk setiap hari dalam rentang
 */
async function applyPermitToAttendanceLogs(
  tx: any,
  data: {
    madrasahId: string;
    userId: string;
    type: PermitType;
    startDate: Date;
    endDate: Date;
    notes: string;
    attachmentUrl?: string | null;
  }
) {
  let targetStatus: AttendanceStatus = "PERMIT";
  if (data.type === "DUTY") {
    targetStatus = "DUTY";
  } else if (data.type === "SICK") {
    targetStatus = "SICK";
  }
  const datesToProcess: Date[] = [];
  const cur = new Date(data.startDate);

  while (cur <= data.endDate) {
    datesToProcess.push(new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), 0, 0, 0, 0)));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  for (const d of datesToProcess) {
    await tx.attendanceLog.upsert({
      where: {
        userId_date: {
          userId: data.userId,
          date: d,
        },
      },
      create: {
        madrasahId: data.madrasahId,
        userId: data.userId,
        date: d,
        status: targetStatus,
        notes: data.notes,
        checkInPhotoUrl: data.attachmentUrl || null,
      },
      update: {
        status: targetStatus,
        notes: data.notes,
        checkInPhotoUrl: data.attachmentUrl || undefined,
      },
    });
  }
}

/**
 * Ambil seluruh permohonan izin berstatus PENDING untuk notifikasi navbar & modal approval
 */
export async function getPendingPermits(madrasahId: string, limit = 10) {
  return await prisma.permitRequest.findMany({
    where: {
      madrasahId,
      status: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nip: true,
          avatarUrl: true,
          position: { select: { name: true } },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Hitung jumlah permohonan izin PENDING
 */
export async function countPendingPermits(madrasahId: string): Promise<number> {
  return await prisma.permitRequest.count({
    where: {
      madrasahId,
      status: "PENDING",
    },
  });
}

/**
 * Setujui Permohonan Izin (Approve)
 */
export async function approvePermit(madrasahId: string, permitId: string, adminUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const permit = await tx.permitRequest.findFirst({
      where: {
        id: permitId,
        madrasahId,
      },
    });

    if (!permit) {
      throw new Error("Permohonan izin tidak ditemukan.");
    }

    if (permit.status !== "PENDING") {
      throw new Error(`Permohonan sudah berstatus ${permit.status}.`);
    }

    const updated = await tx.permitRequest.update({
      where: { id: permitId },
      data: {
        status: "APPROVED",
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Terapkan ke tabel presensi (AttendanceLog)
    await applyPermitToAttendanceLogs(tx, {
      madrasahId,
      userId: permit.userId,
      type: permit.type,
      startDate: permit.startDate,
      endDate: permit.endDate,
      notes: permit.notes,
      attachmentUrl: permit.attachmentUrl,
    });

    return updated;
  });
}

/**
 * Tolak Permohonan Izin (Reject)
 */
export async function rejectPermit(
  madrasahId: string,
  permitId: string,
  adminUserId: string,
  rejectionReason: string
) {
  return await prisma.$transaction(async (tx) => {
    const permit = await tx.permitRequest.findFirst({
      where: {
        id: permitId,
        madrasahId,
      },
    });

    if (!permit) {
      throw new Error("Permohonan izin tidak ditemukan.");
    }

    if (permit.status !== "PENDING") {
      throw new Error(`Permohonan sudah berstatus ${permit.status}.`);
    }

    const updated = await tx.permitRequest.update({
      where: { id: permitId },
      data: {
        status: "REJECTED",
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason || "Ditolak oleh pimpinan madrasah.",
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return updated;
  });
}

/**
 * Ambil riwayat permohonan izin untuk guru tertentu
 */
export async function getTeacherPermits(userId: string, limit = 20) {
  return await prisma.permitRequest.findMany({
    where: {
      userId,
    },
    include: {
      approvedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Ambil daftar seluruh permohonan izin untuk halaman admin (dengan filter)
 */
export async function getAllPermits(
  madrasahId: string,
  filter?: {
    status?: PermitStatus;
    searchQuery?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = filter?.page || 1;
  const limit = filter?.limit || 20;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    madrasahId,
  };

  if (filter?.status) {
    whereClause.status = filter.status;
  }

  if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
    whereClause.OR = [
      { user: { name: { contains: filter.searchQuery.trim(), mode: "insensitive" } } },
      { user: { nip: { contains: filter.searchQuery.trim() } } },
      { notes: { contains: filter.searchQuery.trim(), mode: "insensitive" } },
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.permitRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nip: true,
            avatarUrl: true,
            position: { select: { name: true } },
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.permitRequest.count({ where: whereClause }),
  ]);

  return {
    data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
}
