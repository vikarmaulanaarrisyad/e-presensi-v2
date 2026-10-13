import React from "react";
import { AttendanceSettingsView } from "@/features/madrasah/components/attendance-settings-view";
import { GoogleDriveSettingsCard } from "@/features/madrasah/components/google-drive-settings-card";
import { fetchSettingsData } from "@/server/actions/settings.actions";
import { getGoogleDriveStatusAction } from "@/server/actions/google-drive.actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [res, driveRes] = await Promise.all([
    fetchSettingsData(),
    getGoogleDriveStatusAction(),
  ]);

  const data = res?.data;
  const settings = data?.settings;
  const holidays = data?.holidays || [];
  const madrasah = data?.madrasah;

  const initialData = {
    madrasahId: madrasah?.id || "",
    madrasahName: madrasah?.name || "Madrasah",
    nsm: madrasah?.nsm || "-",
    workStartTime: settings?.workStartTime || "07:00",
    lateThreshold: settings?.lateThreshold || "07:15",
    workEndTime: settings?.workEndTime || "14:00",
    workDays: settings?.workDays || "1,2,3,4,5",
    dailySchedules: (settings as any)?.dailySchedules || null,
    requireSelfie: settings?.requireSelfie ?? true,
    allowBackdatedAttendance: (settings as any)?.allowBackdatedAttendance ?? false,
    latitude: settings?.latitude || -6.2615,
    longitude: settings?.longitude || 106.8106,
    radiusMeters: settings?.radiusMeters || 50,
    holidays: holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date,
      endDate: (h as any).endDate || null,
      isNational: (h as any).isNational ?? false,
      description: h.description,
    })),
  };

  const driveInitialData = driveRes.data || {
    isSystemConfigured: false,
    isConnected: false,
    email: null,
    folderId: null,
    folderName: null,
    connectedAt: null,
    isEnabled: false,
  };

  return (
    <div className="space-y-6">
      <AttendanceSettingsView initialData={initialData} />
      <GoogleDriveSettingsCard
        madrasahId={initialData.madrasahId}
        initialData={driveInitialData}
      />
    </div>
  );
}
