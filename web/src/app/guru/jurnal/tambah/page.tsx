import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherMobileDashboardData } from "@/server/actions/mobile-attendance.actions";
import { MobileJournalFormView } from "@/features/mobile-app/components/mobile-journal-form-view";
import { MobileLoginView } from "@/features/mobile-app/components/mobile-login-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tulis Jurnal Pembelajaran KBM | E-Presensi Guru",
  description: "Halaman pencatatan aktivitas, materi, dan dokumentasi mengajar guru madrasah.",
};

export default async function GuruTambahJurnalPage({
  searchParams,
}: {
  searchParams: Promise<{ nip?: string; id?: string; date?: string }>;
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

  const initialData = await getTeacherMobileDashboardData(targetUserId);

  if (!initialData || "error" in initialData || !initialData.teacher) {
    const schools = await prisma.madrasah.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nsm: true },
      orderBy: { name: "asc" },
    });

    return (
      <div className="min-h-screen w-full bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center sm:py-8 sm:px-4">
        <div className="w-full sm:max-w-md min-h-screen sm:min-h-0 sm:rounded-3xl bg-[#f8f9ff] sm:shadow-xl sm:border sm:border-[#e5eeff] overflow-hidden">
          <MobileLoginView schools={schools} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#f0f2ff" }}>
      <div
        className="w-full sm:max-w-md min-h-screen relative overflow-hidden"
        style={{ background: "#f8f9ff" }}
      >
        <MobileJournalFormView
          teacher={initialData.teacher}
          initialJournalId={params?.id || null}
          initialDate={params?.date || null}
        />
      </div>
    </div>
  );
}
