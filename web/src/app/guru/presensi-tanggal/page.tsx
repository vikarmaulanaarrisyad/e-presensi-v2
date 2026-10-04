import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherMobileDashboardData } from "@/server/actions/mobile-attendance.actions";
import { MobileBackdatedView } from "@/features/mobile-app/components/mobile-backdated-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Presensi Tanggal Terlewat | E-Presensi Guru",
  description: "Form khusus pengisian presensi susulan mandiri guru madrasah.",
};

export default async function GuruPresensiTanggalPage({
  searchParams,
}: {
  searchParams: Promise<{ nip?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

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

  if (!targetUserId) {
    redirect("/guru/login");
  }

  const initialData = await getTeacherMobileDashboardData(targetUserId);

  if (!initialData || "error" in initialData || !initialData.teacher) {
    redirect("/guru/login");
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#f0f2ff" }}>
      <div
        className="w-full sm:max-w-md min-h-screen relative overflow-hidden"
        style={{ background: "#f8f9ff" }}
      >
        <MobileBackdatedView data={initialData as any} />
      </div>
    </div>
  );
}
