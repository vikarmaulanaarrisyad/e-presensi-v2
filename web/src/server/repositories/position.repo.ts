import { prisma } from "@/lib/prisma";

export interface PositionInput {
  name: string;
  code?: string | null;
  description?: string | null;
  isHeadmaster?: boolean;
  order?: number;
}

export const DEFAULT_KEMENAG_POSITIONS: PositionInput[] = [
  {
    name: "Kepala Madrasah",
    code: "KAMAD",
    description: "Penanggung jawab utama operasional dan manajerial madrasah",
    isHeadmaster: true,
    order: 1,
  },
  {
    name: "Wakil Kepala Bidang Kurikulum",
    code: "WAKAMAD-KUR",
    description: "Pengelola perencanaan, kalender akademik, dan evaluasi KBM",
    isHeadmaster: false,
    order: 2,
  },
  {
    name: "Wakil Kepala Bidang Kesiswaan",
    code: "WAKAMAD-SISWA",
    description: "Pembinaan karakter, ekstrakulikuler, dan kedisiplinan peserta didik",
    isHeadmaster: false,
    order: 3,
  },
  {
    name: "Wakil Kepala Bidang Sarpras & Humas",
    code: "WAKAMAD-SARPRAS",
    description: "Pengelolaan sarana prasarana, fasilitas, dan hubungan kemasyarakatan",
    isHeadmaster: false,
    order: 4,
  },
  {
    name: "Guru Kelas",
    code: "GURU-KELAS",
    description: "Pendidik pengampu pembelajaran tematik kelas",
    isHeadmaster: false,
    order: 5,
  },
  {
    name: "Guru Mata Pelajaran",
    code: "GURU-MAPEL",
    description: "Pendidik pengampu bidang studi khusus (PAI, PJOK, Bahasa Arab/Inggris)",
    isHeadmaster: false,
    order: 6,
  },
  {
    name: "Tenaga Administrasi Sekolah / TU",
    code: "TU",
    description: "Pengelola administrasi kepegawaian, surat menyurat, dan arsip madrasah",
    isHeadmaster: false,
    order: 7,
  },
  {
    name: "Guru Bimbingan Konseling (BK)",
    code: "BK",
    description: "Layanan konseling siswa dan pendampingan bakat minat",
    isHeadmaster: false,
    order: 8,
  },
  {
    name: "Pengelola Perpustakaan",
    code: "PUSTAKA",
    description: "Layanan literasi, pengelolaan buku, dan perpustakaan madrasah",
    isHeadmaster: false,
    order: 9,
  },
  {
    name: "Operator Madrasah / EMIS / Simpatika",
    code: "OPS",
    description: "Pengelola data pokok pendidikan digital Kemenag dan Simpatika",
    isHeadmaster: false,
    order: 10,
  },
];

/**
 * Fetch all positions for a specific madrasah
 */
export async function getPositionsByMadrasah(madrasahId: string) {
  const positionDelegate = (prisma as any).position;
  const madrasah = await prisma.madrasah.findUnique({
    where: { id: madrasahId },
    select: { id: true, name: true, nsm: true },
  });

  if (!positionDelegate) {
    return { positions: [], madrasah };
  }

  const positions = await positionDelegate.findMany({
    where: { madrasahId },
    include: {
      _count: {
        select: { users: true },
      },
      users: {
        select: {
          id: true,
          name: true,
          nip: true,
          avatarUrl: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [
      { isHeadmaster: "desc" },
      { order: "asc" },
      { name: "asc" },
    ],
  });

  return { positions, madrasah };
}

/**
 * Create a new position
 */
export async function createPosition(madrasahId: string, input: PositionInput) {
  // If marked as Headmaster, ensure no duplicate isHeadmaster if needed, or allow it
  return await prisma.position.create({
    data: {
      madrasahId,
      name: input.name.trim(),
      code: input.code?.trim().toUpperCase() || null,
      description: input.description?.trim() || null,
      isHeadmaster: input.isHeadmaster ?? false,
      order: input.order ?? 0,
    },
  });
}

/**
 * Update an existing position
 */
export async function updatePosition(
  positionId: string,
  input: Partial<PositionInput>
) {
  return await prisma.position.update({
    where: { id: positionId },
    data: {
      name: input.name?.trim(),
      code: input.code !== undefined ? (input.code ? input.code.trim().toUpperCase() : null) : undefined,
      description: input.description !== undefined ? (input.description ? input.description.trim() : null) : undefined,
      isHeadmaster: input.isHeadmaster,
      order: input.order,
    },
  });
}

/**
 * Delete a position and unassign any users linked to it
 */
export async function deletePosition(positionId: string) {
  // Unassign users first
  await prisma.user.updateMany({
    where: { positionId },
    data: { positionId: null },
  });

  return await prisma.position.delete({
    where: { id: positionId },
  });
}

/**
 * Seed default Kemenag positions if none exist
 */
export async function seedDefaultPositions(madrasahId: string) {
  const positionDelegate = (prisma as any).position;
  if (!positionDelegate) {
    return { success: false, count: 0, created: 0 };
  }

  const existingCount = await positionDelegate.count({
    where: { madrasahId },
  });

  if (existingCount > 0) {
    return { success: true, count: existingCount, created: 0 };
  }

  const created = await Promise.all(
    DEFAULT_KEMENAG_POSITIONS.map((pos) =>
      positionDelegate.create({
        data: {
          madrasahId,
          name: pos.name,
          code: pos.code,
          description: pos.description,
          isHeadmaster: pos.isHeadmaster ?? false,
          order: pos.order ?? 0,
        },
      })
    )
  );

  return { success: true, count: created.length, created: created.length };
}
