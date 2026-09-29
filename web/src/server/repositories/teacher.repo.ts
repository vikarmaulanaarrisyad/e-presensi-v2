// Repository for teacher operations with EMIS GTK 4.0 support
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export interface TeacherInput {
  name: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  email: string;
  nip?: string | null;
  nik?: string | null;
  pegId?: string | null;
  nuptk?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | Date | null;
  gender?: string | null;
  statusKepegawaian?: string | null;
  jenisGtk?: string | null;
  phone?: string | null;
  password?: string;
  isActive?: boolean;
  positionId?: string | null;
}

export interface TeacherImportData {
  name: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  email?: string | null;
  nip?: string | null;
  nik?: string | null;
  pegId?: string | null;
  nuptk?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | Date | null;
  gender?: string | null;
  statusKepegawaian?: string | null;
  jenisGtk?: string | null;
  phone?: string | null;
  password?: string | null;
  positionId?: string | null;
}

/**
 * Fetch all teachers for a specific madrasah with attendance counts & EMIS 4.0 GTK attributes
 */
export async function getTeachersByMadrasah(madrasahId: string) {
  let teachers: any[] = [];
  try {
    teachers = await prisma.user.findMany({
      where: {
        madrasahId,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
        gelarDepan: true,
        gelarBelakang: true,
        email: true,
        nip: true,
        nik: true,
        pegId: true,
        nuptk: true,
        tempatLahir: true,
        tanggalLahir: true,
        gender: true,
        statusKepegawaian: true,
        jenisGtk: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        positionId: true,
        position: {
          select: {
            id: true,
            name: true,
            code: true,
            isHeadmaster: true,
          },
        },
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
    });
  } catch (err) {
    console.error("Error fetching teachers with full attributes:", err);
    teachers = await prisma.user.findMany({
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
    });
  }

  const madrasah = await prisma.madrasah.findUnique({
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
  });

  let positions: any[] = [];
  try {
    positions = (await (prisma as any).position?.findMany?.({
      where: { madrasahId },
      orderBy: [{ isHeadmaster: "desc" }, { order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, isHeadmaster: true },
    })) || [];
  } catch {
    positions = [];
  }

  return { teachers, madrasah, positions };
}

/**
 * Strips leading/trailing quotes (' or " or `) and whitespace commonly found in Excel / EMIS exports
 */
export function cleanLeadingQuote(val?: string | null): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val)
    .trim()
    .replace(/^['"`\s]+/, "")
    .replace(/['"`\s]+$/, "")
    .trim();
  return s.length > 0 ? s : null;
}

/**
 * Helper to parse Date from string / Excel Date
 */
function parseDateInput(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Create a new teacher with complete EMIS 4.0 fields
 */
export async function createTeacher(madrasahId: string, input: TeacherInput) {
  const passwordHash = await bcrypt.hash(input.password || "Password123!", 10);

  return await prisma.user.create({
    data: {
      madrasahId,
      name: cleanLeadingQuote(input.name) || input.name.trim(),
      gelarDepan: cleanLeadingQuote(input.gelarDepan),
      gelarBelakang: cleanLeadingQuote(input.gelarBelakang),
      email: input.email.trim().toLowerCase(),
      nip: cleanLeadingQuote(input.nip),
      nik: cleanLeadingQuote(input.nik),
      pegId: cleanLeadingQuote(input.pegId),
      nuptk: cleanLeadingQuote(input.nuptk),
      tempatLahir: cleanLeadingQuote(input.tempatLahir),
      tanggalLahir: parseDateInput(input.tanggalLahir),
      gender: cleanLeadingQuote(input.gender),
      statusKepegawaian: cleanLeadingQuote(input.statusKepegawaian),
      jenisGtk: cleanLeadingQuote(input.jenisGtk),
      phone: cleanLeadingQuote(input.phone),
      passwordHash,
      role: "TEACHER",
      isActive: input.isActive ?? true,
      positionId: input.positionId || null,
    },
  });
}

/**
 * Update teacher details with EMIS 4.0 fields
 */
export async function updateTeacher(
  teacherId: string,
  input: Partial<TeacherInput>
) {
  const updateData: any = {
    name: input.name !== undefined ? (cleanLeadingQuote(input.name) || input.name?.trim()) : undefined,
    gelarDepan: input.gelarDepan !== undefined ? cleanLeadingQuote(input.gelarDepan) : undefined,
    gelarBelakang: input.gelarBelakang !== undefined ? cleanLeadingQuote(input.gelarBelakang) : undefined,
    email: input.email !== undefined ? input.email?.trim().toLowerCase() : undefined,
    nip: input.nip !== undefined ? cleanLeadingQuote(input.nip) : undefined,
    nik: input.nik !== undefined ? cleanLeadingQuote(input.nik) : undefined,
    pegId: input.pegId !== undefined ? cleanLeadingQuote(input.pegId) : undefined,
    nuptk: input.nuptk !== undefined ? cleanLeadingQuote(input.nuptk) : undefined,
    tempatLahir: input.tempatLahir !== undefined ? cleanLeadingQuote(input.tempatLahir) : undefined,
    tanggalLahir: input.tanggalLahir !== undefined ? parseDateInput(input.tanggalLahir) : undefined,
    gender: input.gender !== undefined ? cleanLeadingQuote(input.gender) : undefined,
    statusKepegawaian: input.statusKepegawaian !== undefined ? cleanLeadingQuote(input.statusKepegawaian) : undefined,
    jenisGtk: input.jenisGtk !== undefined ? cleanLeadingQuote(input.jenisGtk) : undefined,
    phone: input.phone !== undefined ? cleanLeadingQuote(input.phone) : undefined,
    isActive: input.isActive,
    positionId: input.positionId !== undefined ? (input.positionId || null) : undefined,
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
 * Bulk import teachers from Excel data (Supports standard template & EMIS 4.0 export)
 */
export async function bulkImportTeachers(
  madrasahId: string,
  teachersData: TeacherImportData[]
) {
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // Get existing users in database to check existing emails / PegIDs
  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true, pegId: true, nip: true },
  });
  const existingEmailSet = new Set(
    existingUsers.map((u) => u.email.toLowerCase().trim())
  );

  const insertedTeachers: any[] = [];
  const updatedTeachers: any[] = [];
  const skippedEmails: string[] = [];
  const failedRows: Array<{ name: string; email: string; reason: string }> = [];

  for (let idx = 0; idx < teachersData.length; idx++) {
    const item = teachersData[idx];
    const name = cleanLeadingQuote(item.name) || item.name?.trim();

    if (!name) {
      failedRows.push({
        name: "-",
        email: item.email || "-",
        reason: "Nama Guru tidak boleh kosong",
      });
      continue;
    }

    const cleanPegId = cleanLeadingQuote(item.pegId);
    const cleanNuptk = cleanLeadingQuote(item.nuptk);
    const cleanNip = cleanLeadingQuote(item.nip);
    const cleanNik = cleanLeadingQuote(item.nik);

    // Auto-generate safe email if missing from EMIS 4.0 download
    let emailNormalized = item.email?.trim().toLowerCase();
    if (!emailNormalized || !emailNormalized.includes("@")) {
      const idPart = cleanPegId || cleanNuptk || cleanNip || `gtk_${idx + 1}`;
      emailNormalized = `${idPart.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()}@madrasah.id`;
    }

    // If email already exists, update their EMIS GTK details instead of dropping them
    if (existingEmailSet.has(emailNormalized)) {
      try {
        const updated = await prisma.user.update({
          where: { email: emailNormalized },
          data: {
            madrasahId,
            name,
            gelarDepan: item.gelarDepan !== undefined ? cleanLeadingQuote(item.gelarDepan) : undefined,
            gelarBelakang: item.gelarBelakang !== undefined ? cleanLeadingQuote(item.gelarBelakang) : undefined,
            nip: item.nip !== undefined ? cleanNip : undefined,
            nik: item.nik !== undefined ? cleanNik : undefined,
            pegId: item.pegId !== undefined ? cleanPegId : undefined,
            nuptk: item.nuptk !== undefined ? cleanNuptk : undefined,
            tempatLahir: item.tempatLahir !== undefined ? cleanLeadingQuote(item.tempatLahir) : undefined,
            tanggalLahir: parseDateInput(item.tanggalLahir) || undefined,
            gender: item.gender !== undefined ? cleanLeadingQuote(item.gender) : undefined,
            statusKepegawaian: item.statusKepegawaian !== undefined ? cleanLeadingQuote(item.statusKepegawaian) : undefined,
            jenisGtk: item.jenisGtk !== undefined ? cleanLeadingQuote(item.jenisGtk) : undefined,
            phone: item.phone !== undefined ? cleanLeadingQuote(item.phone) : undefined,
          },
        });
        updatedTeachers.push(updated);
        continue;
      } catch (err: any) {
        skippedEmails.push(emailNormalized);
        continue;
      }
    }

    try {
      const passwordHash = item.password?.trim()
        ? await bcrypt.hash(item.password.trim(), 10)
        : defaultPasswordHash;

      const created = await prisma.user.create({
        data: {
          madrasahId,
          name,
          gelarDepan: cleanLeadingQuote(item.gelarDepan),
          gelarBelakang: cleanLeadingQuote(item.gelarBelakang),
          email: emailNormalized,
          nip: cleanNip,
          nik: cleanNik,
          pegId: cleanPegId,
          nuptk: cleanNuptk,
          tempatLahir: cleanLeadingQuote(item.tempatLahir),
          tanggalLahir: parseDateInput(item.tanggalLahir),
          gender: cleanLeadingQuote(item.gender),
          statusKepegawaian: cleanLeadingQuote(item.statusKepegawaian),
          jenisGtk: cleanLeadingQuote(item.jenisGtk),
          phone: cleanLeadingQuote(item.phone),
          passwordHash,
          role: "TEACHER",
          isActive: true,
          positionId: item.positionId || null,
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
    updatedCount: updatedTeachers.length,
    skippedCount: skippedEmails.length,
    failedCount: failedRows.length,
    skippedEmails,
    failedRows,
  };
}
