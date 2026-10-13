import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherMobileDashboardData } from "@/server/actions/mobile-attendance.actions";
import { MobileAppShellClient } from "./components/mobile-app-shell-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal E-Presensi Guru | Kemenag",
  description: "Aplikasi presensi digital mobile native untuk guru madrasah.",
};

export default async function GuruMobilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const targetUserId = session?.user?.id;

  // Jika belum login, redirect ke halaman login
  if (!targetUserId) {
    redirect("/guru/login");
  }

  // Fetch Teacher Data
  const initialData = await getTeacherMobileDashboardData(targetUserId);

  // If no teacher could be retrieved, redirect to login
  if (!initialData || "error" in initialData || !initialData.teacher) {
    redirect("/guru/login");
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#f0f2ff" }}>
      {/* Full-screen on mobile, centered phone card on desktop */}
      <div
        className="w-full sm:max-w-md min-h-screen relative overflow-hidden"
        style={{ background: "#f8f9ff" }}
      >
        <MobileAppShellClient initialData={initialData as any} initialTab={params?.tab} />
      </div>
    </div>
  );
}
