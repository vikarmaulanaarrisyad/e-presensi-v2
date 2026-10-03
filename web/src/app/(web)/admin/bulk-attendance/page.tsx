import React from "react";
import { BulkAttendanceView } from "@/features/attendance/components/bulk-attendance/bulk-attendance-view";
import { fetchTeachersAttendanceByDateAction } from "@/server/actions/attendance.actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Presensi Massal Guru | E-Presensi Kemenag",
  description: "Fitur presensi massal dan pencatatan kehadiran guru secara kolektif untuk admin madrasah.",
};

export default async function BulkAttendancePage() {
  const today = new Date();
  const y = today.getFullYear();
  const m = (today.getMonth() + 1).toString().padStart(2, "0");
  const d = today.getDate().toString().padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const res = await fetchTeachersAttendanceByDateAction(todayStr);
  const data = res?.data;

  const madrasah = data?.madrasah;
  const settings = madrasah?.settings;
  const teachers = data?.teachers || [];
  const summary = data?.summary || {
    totalTeachers: 0,
    recordedCount: 0,
    unrecordedCount: 0,
    presentCount: 0,
    lateCount: 0,
    permitCount: 0,
    sickCount: 0,
    absentCount: 0,
    percentage: 0,
  };

  const initialData = {
    madrasahId: madrasah?.id || "",
    madrasahName: madrasah?.name || "Madrasah",
    nsm: madrasah?.nsm || "-",
    settings: settings
      ? {
          workStartTime: settings.workStartTime,
          lateThreshold: settings.lateThreshold,
          workEndTime: settings.workEndTime,
          radiusMeters: settings.radiusMeters,
          latitude: settings.latitude,
          longitude: settings.longitude,
          dailySchedules: settings.dailySchedules || null,
        }
      : null,
    dateStr: todayStr,
    teachers,
    summary,
  };

  return <BulkAttendanceView initialData={initialData} />;
}
