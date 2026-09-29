import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherMobileDashboardData } from "@/server/actions/mobile-attendance.actions";
import { MobileAppShellClient } from "./components/mobile-app-shell-client";
import { MobileLoginView } from "@/features/mobile-app/components/mobile-login-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal E-Presensi Guru | Kemenag",
  description: "Aplikasi presensi digital mobile native untuk guru madrasah.",
};

export default async function GuruMobilePage({
  searchParams,
}: {
  searchParams: Promise<{ nip?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  // If query param ?nip=... is provided, prioritize that teacher (great for instant testing)
  let targetUserId = session?.user?.id;
  if (params?.nip) {
    const userByNip = await prisma.user.findFirst({
      where: { nip: params.nip },
      select: { id: true },
    });
    if (userByNip) {
      targetUserId = userByNip.id;
    }
  }

  // Fetch Teacher Data
  const initialData = await getTeacherMobileDashboardData(targetUserId);

  // If user is not logged in and no teacher could be retrieved:
  if (!initialData || "error" in initialData || !initialData.teacher) {
    return (
      <div className="min-h-screen w-full bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center sm:py-8 sm:px-4">
        <div className="w-full sm:max-w-md min-h-screen sm:min-h-0 sm:rounded-3xl bg-[#f8f9ff] sm:shadow-xl sm:border sm:border-[#e5eeff] overflow-hidden">
          <MobileLoginView />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#f0f2ff" }}>
      {/* Full-screen on mobile, centered phone card on desktop */}
      <div
        className="w-full sm:max-w-md min-h-screen relative overflow-hidden"
        style={{ background: "#f8f9ff" }}
      >
        <MobileAppShellClient initialData={initialData as any} />
      </div>
    </div>
  );
}
