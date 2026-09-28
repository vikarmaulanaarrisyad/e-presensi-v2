"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  Radar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CalendarDays,
  MapPin,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";

interface AttendanceChartsProps {
  presentCount: number;
  lateCount: number;
  permitCount: number;
  sickCount: number;
  totalTeachers: number;
  radiusMeters?: number;
}

export function AttendanceCharts({
  presentCount = 2,
  lateCount = 1,
  permitCount = 1,
  sickCount = 1,
  totalTeachers = 5,
  radiusMeters = 50,
}: AttendanceChartsProps) {
  // Weekly Trend Data (Senin s/d Jumat)
  const weeklyData = [
    { day: "Senin", hadir: 5, terlambat: 0, izin: 0 },
    { day: "Selasa", hadir: 4, terlambat: 1, izin: 0 },
    { day: "Rabu", hadir: 4, terlambat: 0, izin: 1 },
    { day: "Kamis", hadir: 5, terlambat: 0, izin: 0 },
    { day: "Jumat", hadir: presentCount, terlambat: lateCount, izin: permitCount + sickCount },
  ];

  // Donut Pie Data for Today
  const pieData = [
    { name: "Hadir Tepat Waktu", value: presentCount, color: "#10b981" },
    { name: "Terlambat", value: lateCount, color: "#f59e0b" },
    { name: "Izin Dinas", value: permitCount, color: "#d97706" },
    { name: "Sakit", value: sickCount, color: "#64748b" },
  ].filter((item) => item.value > 0);

  // Fallback if zero
  const displayPieData = pieData.length > 0 ? pieData : [
    { name: "Belum Ada Presensi", value: 1, color: "#cbd5e1" },
  ];

  // Geofence Distance Breakdown
  const geofenceZones = [
    { label: "Zona Inti (0 - 25m)", count: "3 Guru", percent: 60, color: "bg-emerald-500" },
    { label: "Zona Luar (25 - 40m)", count: "1 Guru", percent: 25, color: "bg-teal-500" },
    { label: "Batas Kritis (40 - 50m)", count: "1 Guru", percent: 15, color: "bg-amber-500" },
    { label: "Di Luar Radius (> 50m)", count: "0 Guru", percent: 0, color: "bg-rose-500" },
  ];

  // Today's Operational Timeline
  const operationalSchedule = [
    { time: "06:30 WIB", event: "Gerbang Dibuka & Radar Geofence Standby", done: true },
    { time: "07:00 WIB", event: "Jam Masuk Resmi & Apel Pagi Madrasah", done: true },
    { time: "07:15 WIB", event: "Batas Akhir Toleransi (Masuk Kategori Terlambat)", done: true },
    { time: "12:00 WIB", event: "Istirahat & Sholat Dzuhur Berjamaah", done: false },
    { time: "14:00 WIB", event: "Jam Kepulangan & Presensi Clock-Out Dibuka", done: false },
  ];

  const attendanceRate = totalTeachers > 0
    ? Math.round(((presentCount + lateCount) / totalTeachers) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ROW 1: Visual Charts (Weekly Trend & Composition Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4.5 text-primary" />
                  <span>Tren Kedisiplinan Kehadiran Mingguan</span>
                </h3>
                <Badge variant="gold">Senin - Jumat</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Perbandingan jumlah guru hadir tepat waktu vs terlambat dalam minggu berjalan
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="size-2.5 rounded-full bg-emerald-600" />
                Hadir Tepat
              </span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="size-2.5 rounded-full bg-amber-500" />
                Terlambat
              </span>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A5C36" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0A5C36" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTerlambat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hadir"
                  name="Hadir Tepat Waktu"
                  stroke="#0A5C36"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorHadir)"
                />
                <Area
                  type="monotone"
                  dataKey="terlambat"
                  name="Terlambat"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTerlambat)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Rata-rata kehadiran minggu ini mencapai <strong>92.5%</strong>.</span>
            <span className="font-semibold text-primary">Tervalidasi GPS</span>
          </div>
        </div>

        {/* Donut Status Composition (1 Col) */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-5">
          <div className="border-b border-border/60 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <PieIcon className="size-4.5 text-primary" />
              <span>Komposisi Status Hari Ini</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rincian proporsi kehadiran guru aktif
            </p>
          </div>

          {/* Donut Chart with Centered Rate */}
          <div className="relative w-full h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-foreground">
                {attendanceRate}%
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Kehadiran
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {displayPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-muted-foreground truncate">{item.name}</span>
                  <span className="font-bold text-foreground">{item.value} Guru</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 2: Informative Widgets (Geofence Distribution & Today's Schedule) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Sebaran Radius Geofencing */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Radar className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Distribusi Jarak Presensi GPS
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sebaran jarak fisik guru dari titik koordinat madrasah ({radiusMeters}m radius)
                </p>
              </div>
            </div>
            <Badge variant="default">Aman</Badge>
          </div>

          <div className="flex flex-col gap-3.5">
            {geofenceZones.map((zone, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground">{zone.label}</span>
                  <span className="text-muted-foreground font-mono">{zone.count} ({zone.percent}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${zone.color} transition-all duration-500`}
                    style={{ width: `${zone.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            <span>Seluruh presensi hari ini berada di dalam radius {radiusMeters} meter yang sah.</span>
          </div>
        </div>

        {/* Widget 2: Jadwal & Timeline Operasional Hari Ini */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Jadwal & Agenda Madrasah Hari Ini
                </h3>
                <p className="text-xs text-muted-foreground">
                  Protokol jam kerja dan checkpoint operasional MI
                </p>
              </div>
            </div>
            <Badge variant="gold">Jadwal Aktif</Badge>
          </div>

          {/* Timeline List */}
          <div className="flex flex-col gap-3">
            {operationalSchedule.map((item, index) => (
              <div key={index} className="flex items-start gap-3 text-xs">
                <div className="flex flex-col items-center mt-0.5">
                  <span
                    className={`size-2.5 rounded-full ${
                      item.done ? "bg-emerald-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  {index < operationalSchedule.length - 1 && (
                    <span className="w-0.5 h-6 bg-border/80 my-0.5" />
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className={`font-semibold ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.event}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                  {item.done && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">
                      Selesai
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Presensi kepulangan guru dibuka pada pukul <strong>14:00 WIB</strong>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
