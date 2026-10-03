import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if cached instance is missing new models or fields and force refresh
const isPrismaStale = (client: any) => {
  if (!client) return false;
  if (!("position" in client)) return true;
  try {
    const fields = client._runtimeDataModel?.models?.MadrasahSetting?.fields || [];
    if (!fields.some((f: any) => f.name === "allowBackdatedAttendance")) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

if (globalForPrisma.prisma && isPrismaStale(globalForPrisma.prisma)) {
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
