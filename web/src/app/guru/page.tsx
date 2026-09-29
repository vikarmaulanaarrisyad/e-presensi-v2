import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherMobileDashboardData } from "@/server/actions/mobile-attendance.actions";
import { MobileDeviceFrame } from "@/features/mobile-app/components/mobile-device-frame";
import { MobileAppShellClient } from "./components/mobile-app-shell-client";
import { MobileLoginView } from "@/features/mobile-app/components/mobile-login-view";

export const dynamic = "force-dynamic";

export default async function GuruMobilePage({
  searchParams,
}: {
  searchParams: Promise<{ nip?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  // If query param ?nip=... is provided, prioritize that teacher (great for instant testing!)
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

  // Fetch sample teachers for the quick switcher
  const teachersList = await prisma.user.findMany({
    where: { role: "TEACHER", isActive: true },
    select: { name: true, nip: true, email: true },
    take: 4,
  });

  const formattedTeachers = teachersList.map((t) => ({
    name: t.name,
    nip: t.nip ?? "-",
    email: t.email,
  }));

  // If user is not logged in and no teacher could be retrieved:
  if (!initialData || "error" in initialData || !initialData.teacher) {
    return (
      <MobileDeviceFrame availableTeachers={formattedTeachers}>
        <MobileLoginView />
      </MobileDeviceFrame>
    );
  }

  return (
    <MobileDeviceFrame
      activeTeacherName={initialData.teacher.name}
      availableTeachers={formattedTeachers}
    >
      <MobileAppShellClient initialData={initialData as any} />
    </MobileDeviceFrame>
  );
}
