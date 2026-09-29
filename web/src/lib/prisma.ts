import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if cached instance is missing new models (like position) and force refresh
if (globalForPrisma.prisma && !("position" in (globalForPrisma.prisma as any))) {
  try {
    (globalForPrisma.prisma as any)?.$disconnect?.();
  } catch {
    // ignore
  }
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
