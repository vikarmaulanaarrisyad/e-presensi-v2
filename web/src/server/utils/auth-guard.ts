import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "SUPERADMIN" | "ADMIN_MADRASAH" | "TEACHER";
  madrasahId?: string | null;
  madrasahName?: string | null;
  nip?: string | null;
}

/**
 * Ensures user is authenticated. Throws error if unauthenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();
  const user = session?.user as unknown as AuthenticatedUser | undefined;

  if (!user || !user.id) {
    throw new Error("Sesi tidak valid atau telah berakhir. Silakan login kembali.");
  }

  return user;
}

/**
 * Ensures user has SUPERADMIN role. Throws error if unauthorized.
 */
export async function requireSuperadmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Akses ditolak: Diperlukan hak akses Superadmin.");
  }

  return user;
}

/**
 * Ensures user has Administrator permissions (ADMIN_MADRASAH or SUPERADMIN)
 * and strictly prevents cross-tenant access (BOLA/IDOR protection).
 */
export async function requireMadrasahAdmin(
  requestedMadrasahId?: string
): Promise<{ user: AuthenticatedUser; madrasahId: string }> {
  const user = await requireAuth();

  if (user.role === "SUPERADMIN") {
    if (requestedMadrasahId && requestedMadrasahId.trim().length > 0) {
      return { user, madrasahId: requestedMadrasahId.trim() };
    }
    if (user.madrasahId) {
      return { user, madrasahId: user.madrasahId };
    }
    const firstMadrasah = await prisma.madrasah.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!firstMadrasah) {
      throw new Error("Tidak ada data madrasah aktif di sistem.");
    }
    return { user, madrasahId: firstMadrasah.id };
  }

  if (user.role !== "ADMIN_MADRASAH") {
    throw new Error("Akses ditolak: Diperlukan hak akses Administrator Madrasah.");
  }

  if (!user.madrasahId) {
    throw new Error("Akun Administrator Anda belum terhubung ke madrasah manapun.");
  }

  // Cross-tenant access protection (IDOR / BOLA Prevention):
  // An Admin of Madrasah A CANNOT access or mutate Madrasah B's data
  if (
    requestedMadrasahId &&
    requestedMadrasahId.trim().length > 0 &&
    requestedMadrasahId.trim() !== user.madrasahId
  ) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengelola data madrasah lain.");
  }

  return { user, madrasahId: user.madrasahId };
}

/**
 * Resolves the authenticated user ID for attendance recording.
 * Strictly prevents proxy attendance: Regular teachers CANNOT submit attendance on behalf of another user.
 */
export async function getEffectiveAttendanceUserId(
  requestedUserId?: string
): Promise<{ user: AuthenticatedUser; effectiveUserId: string }> {
  const user = await requireAuth();

  // If user is a teacher, they can ONLY record attendance for themselves
  if (user.role === "TEACHER") {
    return { user, effectiveUserId: user.id };
  }

  // If user is an Admin / Superadmin, they can specify a teacherId for manual input
  if (requestedUserId && requestedUserId.trim().length > 0) {
    return { user, effectiveUserId: requestedUserId.trim() };
  }

  return { user, effectiveUserId: user.id };
}
