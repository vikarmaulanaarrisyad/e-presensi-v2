import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().min(3, "Masukkan email atau NIP valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email / NIP", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const identifier = parsed.data.email.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { nip: identifier },
            ],
          },
          include: { madrasah: true },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          nip: user.nip,
          madrasahId: user.madrasahId,
          madrasahName: user.madrasah?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.nip = (user as unknown as { nip: string | null }).nip;
        token.madrasahId = (user as unknown as { madrasahId: string | null }).madrasahId;
        token.madrasahName = (user as unknown as { madrasahName: string | null }).madrasahName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { nip: string | null }).nip = (token.nip as string) ?? null;
        (session.user as unknown as { madrasahId: string | null }).madrasahId =
          token.madrasahId as string | null;
        (session.user as unknown as { madrasahName: string | null }).madrasahName =
          token.madrasahName as string | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        const resolvedBase = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
          ? process.env.NEXTAUTH_URL
          : baseUrl;
        return `${resolvedBase}${url}`;
      }
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
