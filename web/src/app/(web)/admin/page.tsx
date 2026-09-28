import React from "react";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { AttendanceStatsCards } from "@/features/attendance/components/attendance-stats-cards";
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-muted/20">
      {/* Top Navbar */}
      <HeaderNavbar
        madrasahName={madrasah?.name || "MIN 1 Jakarta Selatan"}
        nsm={madrasah?.nsm || "111131740001"}
        radiusMeters={settings?.radiusMeters || 50}
      />

      {/* Main Dashboard Body */}
      <main className="flex-1 p-6 xl:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        {/* KPI Stat Cards */}
        <AttendanceStatsCards
          totalTeachers={stats?.totalTeachers || 5}
          presentCount={stats?.presentCount || 2}
          lateCount={stats?.lateCount || 1}
          permitCount={stats?.permitCount || 1}
          sickCount={stats?.sickCount || 1}
          absentCount={stats?.absentCount || 0}
          attendancePercentage={stats?.attendancePercentage || 60}
          radiusMeters={settings?.radiusMeters || 50}
          latitude={settings?.latitude || -6.2615}
          longitude={settings?.longitude || 106.8106}
        />

        {/* Geofence Parameters Card */}
        <GeofenceQuickCard
          latitude={settings?.latitude || -6.2615}
          longitude={settings?.longitude || 106.8106}
          radiusMeters={settings?.radiusMeters || 50}
          workStartTime={settings?.workStartTime || "07:00"}
          lateThreshold={settings?.lateThreshold || "07:15"}
        />

        {/* Attendance Datatable */}
        <AttendanceTable
          data={todayLogs}
          maxRadiusMeters={settings?.radiusMeters || 50}
        />
      </main>
    </div>
  );
}
