"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileAppShell } from "@/features/mobile-app/components/mobile-app-shell";
import { getTeacherMobileDashboardData } from "@/server/actions/mobile-attendance.actions";

interface MobileAppShellClientProps {
  initialData: any;
  initialTab?: string;
}

export function MobileAppShellClient({ initialData, initialTab }: MobileAppShellClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  const handleRefresh = async () => {
    try {
      const refreshed = await getTeacherMobileDashboardData(data.teacher.id);
      if (refreshed && !("error" in refreshed) && refreshed.teacher) {
        setData(refreshed);
      } else {
        router.refresh();
      }
    } catch {
      router.refresh();
    }
  };

  return (
    <MobileAppShell
      data={data}
      onRefresh={handleRefresh}
      initialTab={initialTab as any}
    />
  );
}
