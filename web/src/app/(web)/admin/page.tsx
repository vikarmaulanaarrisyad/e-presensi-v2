import React from "react";
import { AttendanceStatsCards } from "@/features/attendance/components/attendance-stats-cards";
import { AttendanceCharts } from "@/features/attendance/components/attendance-charts";
import { AttendanceTable, type AttendanceRowData } from "@/features/attendance/components/attendance-table";
import { GeofenceQuickCard } from "@/features/madrasah/components/geofence-quick-card";
import { fetchAdminDashboardData } from "@/server/actions/attendance.actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const result = await fetchAdminDashboardData();
  const dashboardData = result?.data;

  const madrasah = dashboardData?.madrasah;
  const settings = madrasah?.settings;
  const stats = dashboardData?.stats;
  const todayLogs = (dashboardData?.todayLogs || []) as unknown as AttendanceRowData[];

  const presentCount = stats?.presentCount || 2;
  const lateCount = stats?.lateCount || 1;
  const permitCount = stats?.permitCount || 1;
  const sickCount = stats?.sickCount || 1;
  const absentCount = stats?.absentCount || 0;
  const totalTeachers = stats?.totalTeachers || 5;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. KPI Metric Summary Cards */}
      <AttendanceStatsCards
        totalTeachers={totalTeachers}
        presentCount={presentCount}
        lateCount={lateCount}
        permitCount={permitCount}
        sickCount={sickCount}
        absentCount={absentCount}
        attendancePercentage={stats?.attendancePercentage || 60}
        radiusMeters={settings?.radiusMeters || 50}
        latitude={settings?.latitude || -6.2615}
        longitude={settings?.longitude || 106.8106}
      />

      {/* 2. Visual Charts & Informative Widgets (Weekly Trend, Donut Composition, Geofence Radar, Timeline) */}
      <AttendanceCharts
        presentCount={presentCount}
        lateCount={lateCount}
        permitCount={permitCount}
        sickCount={sickCount}
        totalTeachers={totalTeachers}
        radiusMeters={settings?.radiusMeters || 50}
      />

      {/* 3. Geofence Parameters Card */}
      <GeofenceQuickCard
        latitude={settings?.latitude || -6.2615}
        longitude={settings?.longitude || 106.8106}
        radiusMeters={settings?.radiusMeters || 50}
        workStartTime={settings?.workStartTime || "07:00"}
        lateThreshold={settings?.lateThreshold || "07:15"}
      />

      {/* 4. Interactive Attendance Datatable */}
      <AttendanceTable
        data={todayLogs}
        maxRadiusMeters={settings?.radiusMeters || 50}
      />
    </div>
  );
}
