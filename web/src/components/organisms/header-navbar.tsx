"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Clock, 
  MapPin, 
  RefreshCw, 
  Bell, 
  School, 
  Search, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  User,
  SlidersHorizontal,
  Home
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

interface HeaderNavbarProps {
  madrasahName?: string;
  nsm?: string;
  radiusMeters?: number;
  userName?: string;
  userRole?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function HeaderNavbar({
  madrasahName,
  nsm,
  radiusMeters = 50,
  userName,
  userRole,
  onRefresh,
  isRefreshing = false,
}: HeaderNavbarProps) {
  const pathname = usePathname();
  const isSuperadmin = pathname?.startsWith("/superadmin");

  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " WIB"
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine breadcrumb based on route
  const getBreadcrumb = () => {
    if (isSuperadmin) {
      if (pathname.includes("/analytics")) return { title: "Statistik Nasional", section: "Superadmin Kemenag" };
      if (pathname.includes("/users")) return { title: "Semua Akun Guru", section: "Superadmin Kemenag" };
      return { title: "Pusat Kendali Madrasah", section: "Superadmin Kemenag" };
    }

    if (pathname.startsWith("/admin/teachers")) {
      return { title: "Kelola Data Guru", section: "Pendidik & Staf" };
    }
    if (pathname.startsWith("/admin/positions")) {
      return { title: "Master Jabatan & Kamad", section: "Struktur Organisasi" };
    }
    if (pathname.startsWith("/admin/settings")) {
      return { title: "Pengaturan Kehadiran", section: "Jam Kerja & Kalender" };
    }
    if (pathname.startsWith("/admin/geofence")) {
      return { title: "Radius Geofencing", section: "Parameter GPS" };
    }
    if (pathname.startsWith("/admin/reports")) {
      return { title: "Laporan & Rekap", section: "Rekapitulasi Presensi" };
    }
    return { title: "Dashboard Presensi", section: "Ringkasan Hari Ini" };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-16 border-b border-border/80 bg-card/95 backdrop-blur-md px-4 sm:px-6 xl:px-8 flex items-center justify-between sticky top-0 z-30 select-none shadow-xs">
      {/* Left: Breadcrumbs & Section Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium hover:text-foreground transition-colors truncate">
              {isSuperadmin ? "Kemenag Pusat" : madrasahName}
            </span>
            <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
            <span className="text-primary font-semibold truncate">
              {breadcrumb.section}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate">
              {breadcrumb.title}
            </h1>
            {!isSuperadmin && (
              <span className="hidden lg:inline-flex text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                NSM: {nsm}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls & Info Badges */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Live Digital Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/80 text-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>{currentDate}</span>
            <span className="text-muted-foreground/50">&bull;</span>
            <span className="font-bold text-primary">{currentTime || "07:00:00 WIB"}</span>
          </div>
        </div>

        {/* Geofence Status Badge */}
        {!isSuperadmin && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <MapPin className="size-3.5 text-emerald-600" />
            <span>Radius: {radiusMeters}m Aktif</span>
          </div>
        )}

        {/* Refresh Action if available */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors border border-border/60"
            title="Segarkan Data"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors relative border border-border/60"
            title="Notifikasi Sistem"
          >
            <Bell className="size-4" />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 size-2 bg-emerald-500 rounded-full ring-2 ring-card" />
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-card border border-border shadow-xl p-4 flex flex-col gap-3 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground">
                  Pemberitahuan Sistem
                </span>
                <span className="text-[10px] text-primary font-semibold cursor-pointer hover:underline" onClick={() => setHasNotifications(false)}>
                  Tandai Dibaca
                </span>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Kalender Kemenag Tersinkron</span>
                    <span className="text-[11px] text-muted-foreground">Hari libur nasional 2025-2027 telah dimuat.</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Geofence GPS Siap</span>
                    <span className="text-[11px] text-muted-foreground">Validasi radius presensi 50m aktif tanpa kendala.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Mini Badge */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-border/60">
          <div className="size-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
            {userName ? userName.charAt(0).toUpperCase() : isSuperadmin ? "S" : "O"}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-foreground leading-none">
              {userName || (isSuperadmin ? "Superadministrator" : "Operator Madrasah")}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
              {madrasahName || (isSuperadmin ? "Pusat Administrasi" : "Madrasah")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
