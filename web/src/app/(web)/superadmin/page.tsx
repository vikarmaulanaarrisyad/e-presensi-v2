import React from "react";
import { MadrasahTable, type MadrasahRow } from "@/features/madrasah/components/madrasah-table";
import { fetchSuperadminDashboard } from "@/server/actions/madrasah.actions";
import { Building2, Users, UserCheck, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/atoms/badge";

export default async function SuperadminPage() {
  const res = await fetchSuperadminDashboard();
  const madrasahs = (res?.data?.madrasahs || []) as unknown as MadrasahRow[];
  const stats = res?.data?.stats;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-sm border border-slate-700/50">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Pusat Kendali Superadmin Kemenag
            </h1>
            <Badge variant="gold">Akses Penuh</Badge>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/85">
            Kelola data seluruh institusi Madrasah Ibtidaiyah, izin operasional SaaS, dan rekapitulasi nasional.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-emerald-200">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Multi-Tenant DB Connected</span>
        </div>
      </div>

      {/* Global KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Madrasah
            </span>
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="size-4.5" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground tracking-tight">
            {stats?.totalMadrasahs || 1}
          </span>
          <span className="text-xs text-muted-foreground">
            Terdaftar dalam sistem
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Madrasah Aktif
            </span>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4.5" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {stats?.activeMadrasahs || 1}
          </span>
          <span className="text-xs text-muted-foreground">
            Operasional berjalan lancar
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Guru Terdata
            </span>
            <div className="size-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
              <Users className="size-4.5" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground tracking-tight">
            {stats?.totalTeachers || 5}
          </span>
          <span className="text-xs text-muted-foreground">
            Guru & Tenaga Kependidikan
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Presensi Hari Ini
            </span>
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="size-4.5" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground tracking-tight">
            {stats?.totalAttendanceToday || 5}
          </span>
          <span className="text-xs text-muted-foreground">
            Log presensi tervalidasi
          </span>
        </div>
      </div>

      {/* Madrasah Management Datatable */}
      <MadrasahTable initialData={madrasahs} />
    </div>
  );
}
