import React from "react";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { AttendanceStatsCards } from "@/features/attendance/components/attendance-stats-cards";
import { AttendanceCharts } from "@/features/attendance/components/attendance-charts";
import { AttendanceTable, type AttendanceRowData } from "@/features/attendance/components/attendance-table";
import { GeofenceQuickCard } from "@/features/madrasah/components/geofence-quick-card";
import { fetchAdminDashboardData } from "@/server/actions/attendance.actions";

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
    <div className="flex-1 flex flex-col min-h-screen bg-muted/20">
      {/* Top Header Navbar */}
      <HeaderNavbar
        madrasahName={madrasah?.name || "MIN 1 Jakarta Selatan"}
        nsm={madrasah?.nsm || "111131740001"}
        radiusMeters={settings?.radiusMeters || 50}
      />

      {/* Main Dashboard Body */}
      <main className="flex-1 p-6 xl:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
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
      </main>
    </div>
  );
}
