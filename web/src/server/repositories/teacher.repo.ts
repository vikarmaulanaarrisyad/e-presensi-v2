import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export interface TeacherInput {
  name: string;
  email: string;
  nip?: string | null;
  phone?: string | null;
  password?: string;
  isActive?: boolean;
}

export interface TeacherImportData {
  name: string;
  email: string;
  nip?: string | null;
  phone?: string | null;
  password?: string | null;
}

/**
 * Fetch all teachers for a specific madrasah with attendance counts
 */
export async function getTeachersByMadrasah(madrasahId: string) {
  const [teachers, madrasah] = await Promise.all([
    prisma.user.findMany({
      where: {
        madrasahId,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attendanceLogs: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.madrasah.findUnique({
      where: { id: madrasahId },
      select: {
        id: true,
        name: true,
        nsm: true,
        settings: {
          select: {
            radiusMeters: true,
          },
        },
      },
    }),
  ]);

  return { teachers, madrasah };
}

/**
 * Create a new single teacher
 */
export async function createTeacher(madrasahId: string, input: TeacherInput) {
  const passwordHash = await bcrypt.hash(input.password || "Password123!", 10);

  return await prisma.user.create({
    data: {
      madrasahId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      nip: input.nip?.trim() || null,
      phone: input.phone?.trim() || null,
      passwordHash,
      role: "TEACHER",
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Update teacher details
 */
export async function updateTeacher(
  teacherId: string,
  input: Partial<TeacherInput>
) {
  const updateData: any = {
    name: input.name?.trim(),
    email: input.email?.trim().toLowerCase(),
    nip: input.nip !== undefined ? input.nip?.trim() || null : undefined,
    phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
    isActive: input.isActive,
  };

  if (input.password && input.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(input.password.trim(), 10);
  }

  // Remove undefined fields
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  return await prisma.user.update({
    where: { id: teacherId },
    data: updateData,
  });
}

/**
 * Toggle teacher active/inactive status
 */
export async function toggleTeacherStatus(teacherId: string, isActive: boolean) {
  return await prisma.user.update({
    where: { id: teacherId },
    data: { isActive },
  });
}

/**
 * Reset teacher password to default or custom
 */
export async function resetTeacherPassword(
  teacherId: string,
  newPassword?: string
) {
  const passwordToUse = newPassword?.trim() || "Password123!";
  const passwordHash = await bcrypt.hash(passwordToUse, 10);

  return await prisma.user.update({
    where: { id: teacherId },
    data: { passwordHash },
  });
}

/**
 * Delete a teacher and related logs
 */
export async function deleteTeacher(teacherId: string) {
  return await prisma.user.delete({
    where: { id: teacherId },
  });
}

/**
 * Bulk import teachers from Excel data
 */
export async function bulkImportTeachers(
  madrasahId: string,
  teachersData: TeacherImportData[]
) {
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // Get existing emails in database to prevent unique constraint error
  const existingUsers = await prisma.user.findMany({
    select: { email: true },
  });
  const existingEmailSet = new Set(
    existingUsers.map((u) => u.email.toLowerCase().trim())
  );

  const insertedTeachers: any[] = [];
  const skippedEmails: string[] = [];
  const failedRows: Array<{ name: string; email: string; reason: string }> = [];

  for (const item of teachersData) {
    const emailNormalized = item.email?.trim().toLowerCase();
    const name = item.name?.trim();

    if (!name || !emailNormalized) {
      failedRows.push({
        name: name || "-",
        email: emailNormalized || "-",
        reason: "Nama dan Email wajib diisi",
      });
      continue;
    }

    if (existingEmailSet.has(emailNormalized)) {
      skippedEmails.push(emailNormalized);
      continue;
    }

    try {
      const passwordHash = item.password?.trim()
        ? await bcrypt.hash(item.password.trim(), 10)
        : defaultPasswordHash;

      const created = await prisma.user.create({
        data: {
          madrasahId,
          name,
          email: emailNormalized,
          nip: item.nip?.trim() || null,
          phone: item.phone?.trim() || null,
          passwordHash,
          role: "TEACHER",
          isActive: true,
        },
      });

      existingEmailSet.add(emailNormalized);
      insertedTeachers.push(created);
    } catch (err: any) {
      failedRows.push({
        name,
        email: emailNormalized,
        reason: err.message || "Gagal menyimpan ke database",
      });
    }
  }

  return {
    success: true,
    totalReceived: teachersData.length,
    importedCount: insertedTeachers.length,
    skippedCount: skippedEmails.length,
    failedCount: failedRows.length,
    skippedEmails,
    failedRows,
  };
}
