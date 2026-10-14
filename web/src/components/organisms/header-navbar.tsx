"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  Home,
  Check,
  X,
  FileText,
  AlertTriangle,
  Eye,
  Paperclip,
  Wifi,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import Swal from "sweetalert2";
import {
  getNavbarNotificationDataAction,
  approvePermitAction,
  rejectPermitAction,
} from "@/server/actions/permit.actions";
import { getOptimizedPhotoUrl } from "@/features/attendance/lib/photo-helper";

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
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isPendingAction, startTransition] = useTransition();
  const [loadingPermitId, setLoadingPermitId] = useState<string | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<{
    pendingPermitsCount: number;
    pendingPermits: any[];
    fingerprintStatus: {
      lastSync: Date | null;
      health: string;
      ip: string | null;
    } | null;
  }>({
    pendingPermitsCount: 0,
    pendingPermits: [],
    fingerprintStatus: null,
  });

  const fetchNotifications = async () => {
    try {
      const res = await getNavbarNotificationDataAction();
      if (res?.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      // Silently fail on network drop
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling tiap 30 detik
    return () => clearInterval(interval);
  }, []);

  const handleApprovePermit = (permit: any) => {
    Swal.fire({
      title: "Setujui Izin?",
      html: `Apakah Anda yakin ingin menyetujui permohonan <b>${permit.type === "SICK" ? "Sakit" : "Izin"}</b> untuk <b>${permit.user?.name}</b> (${permit.totalDays} hari)?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Setujui",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    }).then((result) => {
      if (result.isConfirmed) {
        setLoadingPermitId(permit.id);
        startTransition(async () => {
          const res = await approvePermitAction(permit.id);
          setLoadingPermitId(null);
          if (res.success) {
            Swal.fire({
              icon: "success",
              title: "Disetujui",
              text: res.message,
              timer: 2000,
              showConfirmButton: false,
            });
            fetchNotifications();
            if (onRefresh) onRefresh();
          } else {
            Swal.fire("Gagal", res.error || "Gagal menyetujui izin", "error");
          }
        });
      }
    });
  };

  const handleRejectPermit = (permit: any) => {
    Swal.fire({
      title: "Tolak Permohonan Izin?",
      html: `Tuliskan alasan penolakan permohonan untuk <b>${permit.user?.name}</b>:`,
      input: "textarea",
      inputPlaceholder: "Contoh: Mohon koordinasikan terlebih dahulu dengan guru piket / lampiran kurang jelas...",
      inputAttributes: {
        "aria-label": "Alasan penolakan",
      },
      showCancelButton: true,
      confirmButtonText: "Tolak Permohonan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage("Alasan penolakan wajib diisi!");
        }
        return value;
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setLoadingPermitId(permit.id);
        startTransition(async () => {
          const res = await rejectPermitAction(permit.id, result.value);
          setLoadingPermitId(null);
          if (res.success) {
            Swal.fire({
              icon: "success",
              title: "Permohonan Ditolak",
              text: res.message,
              timer: 2000,
              showConfirmButton: false,
            });
            fetchNotifications();
            if (onRefresh) onRefresh();
          } else {
            Swal.fire("Gagal", res.error || "Gagal menolak izin", "error");
          }
        });
      }
    });
  };

  const handleViewAttachment = (url: string, teacherName: string) => {
    Swal.fire({
      title: `Lampiran Bukti: ${teacherName}`,
      html: url.startsWith("data:application/pdf")
        ? `<embed src="${url}" type="application/pdf" width="100%" height="450px" />`
        : `<div class="max-h-[70vh] overflow-auto flex justify-center"><img src="${getOptimizedPhotoUrl(url)}" referrerpolicy="no-referrer" class="rounded-xl max-w-full max-h-[60vh] object-contain shadow-md" alt="Bukti Izin" /></div>`,
      width: "600px",
      confirmButtonText: "Tutup",
      confirmButtonColor: "#059669",
    });
  };

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
    if (pathname.startsWith("/admin/permits")) {
      return { title: "Persetujuan Izin Guru", section: "Cuti & Izin" };
    }
    if (pathname.startsWith("/admin/fingerprint")) {
      return { title: "Mesin Fingerprint Solution", section: "Integrasi Perangkat" };
    }
    if (pathname.startsWith("/admin/bulk-attendance")) {
      return { title: "Presensi Massal", section: "Kehadiran Cepat" };
    }
    if (pathname.startsWith("/admin/journals")) {
      return { title: "Jurnal Mengajar KBM", section: "Aktivitas Pembelajaran" };
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

        {/* Notification Bell with Dynamic Badges */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors relative border border-border/60"
            title="Pusat Notifikasi & Persetujuan"
          >
            <Bell className="size-4" />
            {notifications.pendingPermitsCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow-sm animate-pulse ring-2 ring-card">
                {notifications.pendingPermitsCount}
              </span>
            ) : notifications.fingerprintStatus?.health === "OFFLINE_WARNING" ? (
              <span className="absolute top-1 right-1 size-2.5 bg-amber-500 rounded-full ring-2 ring-card animate-ping" />
            ) : null}
          </button>

          {/* Dynamic Notification & Approval Dropdown */}
          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-96 sm:w-[420px] rounded-2xl bg-card border border-border shadow-2xl p-4 flex flex-col gap-3.5 z-50 animate-in fade-in-50 zoom-in-95 max-h-[85vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                    <Bell className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight">
                      Pusat Persetujuan & Notifikasi
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Pengajuan izin guru & status perangkat
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notifications.pendingPermitsCount > 0 && (
                    <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold">
                      {notifications.pendingPermitsCount} Menunggu
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchNotifications}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    title="Segarkan Notifikasi"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[58vh]">
                {/* 1. SECTION PERMITS AWAITING APPROVAL */}
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Pengajuan Izin & Dinas</span>
                    <Link
                      href="/admin/permits"
                      onClick={() => setShowNotificationMenu(false)}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <span>Lihat Semua</span>
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>

                  {notifications.pendingPermits.length > 0 ? (
                    <div className="space-y-2.5">
                      {notifications.pendingPermits.map((permit) => {
                        const isSick = permit.type === "SICK";
                        const isDuty = permit.type === "DUTY";
                        const isProcessing = loadingPermitId === permit.id;

                        const startDateFormatted = new Date(permit.startDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        });
                        const endDateFormatted = new Date(permit.endDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        });
                        const dateRangeStr =
                          permit.startDate === permit.endDate
                            ? startDateFormatted
                            : `${startDateFormatted} - ${endDateFormatted}`;

                        return (
                          <div
                            key={permit.id}
                            className="rounded-xl border border-border/80 bg-muted/30 p-3 hover:bg-muted/50 transition-all flex flex-col gap-2 shadow-2xs"
                          >
                            {/* Teacher info & status badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="size-7 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {permit.user?.name?.charAt(0) || "G"}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-foreground leading-tight">
                                    {permit.user?.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {permit.user?.position?.name || "Guru"}
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  isDuty
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                    : isSick
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                }`}
                              >
                                {isDuty ? "💼 Dinas Luar" : isSick ? "🩺 Sakit" : "📋 Izin"} &bull; {permit.totalDays} Hari
                              </span>
                            </div>

                            {/* Date & Reason */}
                            <div className="text-[11px] text-foreground bg-background/60 p-2 rounded-lg border border-border/40">
                              <div className="flex items-center gap-1.5 font-semibold text-primary mb-0.5">
                                <Calendar className="size-3" />
                                <span>{dateRangeStr}</span>
                              </div>
                              <p className="text-muted-foreground line-clamp-2 italic">
                                &ldquo;{permit.notes || "Tanpa keterangan"}&rdquo;
                              </p>
                            </div>

                            {/* Actions & Attachment */}
                            <div className="flex items-center justify-between pt-1 gap-2">
                              {permit.attachmentUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleViewAttachment(permit.attachmentUrl, permit.user?.name)
                                  }
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline"
                                >
                                  <Paperclip className="size-3" />
                                  <span>Lihat Bukti</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Tanpa lampiran
                                </span>
                              )}

                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  type="button"
                                  disabled={isProcessing || isPendingAction}
                                  onClick={() => handleRejectPermit(permit)}
                                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors disabled:opacity-50"
                                >
                                  Tolak
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing || isPendingAction}
                                  onClick={() => handleApprovePermit(permit)}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-[11px] font-semibold shadow-xs transition-colors disabled:opacity-50"
                                >
                                  {isProcessing ? (
                                    <RefreshCw className="size-3 animate-spin" />
                                  ) : (
                                    <Check className="size-3" />
                                  )}
                                  Setujui
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-semibold">Semua Izin Telah Diproses</span>
                        <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                          Tidak ada pengajuan cuti/izin guru yang tertunda saat ini.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SECTION SYSTEM STATUS */}
                <div className="pt-2 border-t border-border/60">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Status Perangkat & Sistem
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Fingerprint machine status */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5 text-xs">
                      <Wifi
                        className={`size-4 shrink-0 mt-0.5 ${
                          notifications.fingerprintStatus?.health === "ONLINE"
                            ? "text-emerald-600"
                            : notifications.fingerprintStatus?.health === "OFFLINE_WARNING"
                            ? "text-amber-500 animate-pulse"
                            : "text-gray-400"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {notifications.fingerprintStatus?.health === "ONLINE"
                            ? "Mesin Solution Online"
                            : notifications.fingerprintStatus?.health === "OFFLINE_WARNING"
                            ? "Mesin Solution Perlu Dicek"
                            : "Integrasi Fingerprint Solution"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {notifications.fingerprintStatus?.lastSync
                            ? `Sinkronisasi terakhir: ${new Date(
                                notifications.fingerprintStatus.lastSync
                              ).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} WIB`
                            : "Belum ada sinkronisasi log mesin hari ini."}
                        </span>
                      </div>
                    </div>

                    {/* Geofence status */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5 text-xs">
                      <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">Geofence GPS Siap</span>
                        <span className="text-[11px] text-muted-foreground">
                          Validasi radius presensi {radiusMeters}m aktif untuk presensi mobile.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Link */}
              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground">E-Presensi v2</span>
                <Link
                  href="/admin/permits"
                  onClick={() => setShowNotificationMenu(false)}
                  className="font-bold text-primary hover:underline text-[11px] flex items-center gap-1"
                >
                  <span>Buka Kelola Izin Madrasah</span>
                  <ExternalLink className="size-3" />
                </Link>
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
