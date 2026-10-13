"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(3, "Masukkan email atau NIP valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  madrasahId: z.string().optional(),
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
      ...(parsed.data.madrasahId ? { madrasahId: parsed.data.madrasahId } : {}),
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
        ...(parsed.data.madrasahId ? { madrasahId: parsed.data.madrasahId } : {}),
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


