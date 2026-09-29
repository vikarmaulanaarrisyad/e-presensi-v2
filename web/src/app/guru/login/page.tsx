import React from "react";
import { prisma } from "@/lib/prisma";
import { MobileDeviceFrame } from "@/features/mobile-app/components/mobile-device-frame";
import { MobileLoginView } from "@/features/mobile-app/components/mobile-login-view";

export const dynamic = "force-dynamic";

export default async function GuruLoginPage() {
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

  return (
    <MobileDeviceFrame availableTeachers={formattedTeachers}>
      <MobileLoginView />
    </MobileDeviceFrame>
  );
}
