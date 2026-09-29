"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(3, "Masukkan email atau NIP valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export async function loginWithCredentials(data: LoginFormData) {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    const identifier = parsed.data.email.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { nip: identifier },
          { nuptk: identifier },
          { pegId: identifier },
          { nik: identifier },
        ],
      },
      select: { role: true },
    });

    return { success: true, result, role: user?.role };
  } catch (error) {
    const anyErr = error as any;
    if (anyErr?.digest?.startsWith("NEXT_REDIRECT") || anyErr?.message === "NEXT_REDIRECT") {
      throw error;
    }
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email, NUPTK, NIP, atau kata sandi salah. Silakan periksa kembali." };
        default:
          return { error: "Gagal memproses autentikasi. Silakan coba lagi." };
      }
    }
    return { error: "Terjadi kesalahan sistem saat proses masuk." };
  }
}

/**
 * Direct sign-in using registered Gmail/Google address
 */
export async function loginWithGoogleEmailAction(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { error: "Alamat email Google / Gmail tidak valid." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
      },
      include: { madrasah: true },
    });

    if (!user) {
      return { 
        error: `Akun Google (${cleanEmail}) belum terdaftar pada data guru. Silakan hubungi admin sekolah.` 
      };
    }

    if (!user.isActive) {
      return { error: "Akun Anda saat ini sedang dinonaktifkan." };
    }

    // Execute credential sign in using default password
    const result = await signIn("credentials", {
      email: user.email,
      password: "Password123!",
      redirect: false,
    });

    return {
      success: true,
      result,
      role: user.role,
      name: user.name,
      madrasahName: user.madrasah?.name,
    };
  } catch (error) {
    const anyErr = error as any;
    if (anyErr?.digest?.startsWith("NEXT_REDIRECT") || anyErr?.message === "NEXT_REDIRECT") {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Autentikasi akun Google gagal. Silakan coba lagi." };
    }
    console.error("Gagal login dengan Gmail:", error);
    return { error: "Terjadi kendala saat menghubungkan akun Google Anda." };
  }
}

/**
 * Fetch list of registered teacher emails for quick-login assistance
 */
export async function getRegisteredTeacherEmailsAction() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        isActive: true,
      },
      select: {
        name: true,
        email: true,
        nuptk: true,
        nip: true,
        pegId: true,
        madrasah: {
          select: { name: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return { data: teachers };
  } catch {
    return { data: [] };
  }
}
