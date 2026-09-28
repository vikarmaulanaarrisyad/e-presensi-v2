import React from "react";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { AttendanceSettingsView } from "@/features/madrasah/components/attendance-settings-view";
import { fetchSettingsData } from "@/server/actions/settings.actions";

export default async function SettingsPage() {
  const res = await fetchSettingsData();
  const data = res?.data;
  const settings = data?.settings;
  const holidays = data?.holidays || [];
  const madrasah = data?.madrasah;

  const initialData = {
    madrasahId: madrasah?.id || "",
    madrasahName: madrasah?.name || "MIN 1 Jakarta Selatan",
    nsm: madrasah?.nsm || "111131740001",
    workStartTime: settings?.workStartTime || "07:00",
    lateThreshold: settings?.lateThreshold || "07:15",
    workEndTime: settings?.workEndTime || "14:00",
    workDays: settings?.workDays || "1,2,3,4,5",
    requireSelfie: settings?.requireSelfie ?? true,
    latitude: settings?.latitude || -6.2615,
    longitude: settings?.longitude || 106.8106,
    radiusMeters: settings?.radiusMeters || 50,
    holidays: holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date,
      description: h.description,
    })),
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-muted/20">
      <HeaderNavbar
        madrasahName={initialData.madrasahName}
        nsm={initialData.nsm}
        radiusMeters={initialData.radiusMeters}
      />

      <main className="flex-1 p-6 xl:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        <AttendanceSettingsView initialData={initialData} />
      </main>
    </div>
  );
}
