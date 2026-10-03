"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Camera,
  CheckCircle2,
  Lock,
  MapPin,
  Fingerprint,
  BarChart3,
  Megaphone,
  Headphones,
  ChevronRight,
  Navigation,
  ShieldCheck,
  Info,
  Clock,
  FileText,
  ArrowLeftRight,
  NotepadText,
  BadgeCheck,
  Loader2,
  CalendarDays,
  Calendar,
  X,
  Check,
  BookOpen
} from "lucide-react";
import { MobileCameraModal } from "./mobile-camera-modal";
import { calculateDistanceMeters } from "@/lib/geo";
import {
  recordMobileAttendanceAction,
  getTeacherAttendanceForDateAction
} from "@/server/actions/mobile-attendance.actions";
import { swalSuccess, swalError, swalLoading, swalClose } from "@/lib/swal";

interface MobileHomeViewProps {
  data: {
    teacher: {
      id: string;
      name: string;
      nip: string;
      email: string;
      phone: string;
      avatarUrl?: string | null;
      madrasahName: string;
      madrasahAddress: string;
    };
    settings: {
      latitude: number;
      longitude: number;
      radiusMeters: number;
      workStartTime: string;
      lateThreshold: string;
      workEndTime: string;
      requireSelfie: boolean;
      allowBackdatedAttendance?: boolean;
    };
    todayLog?: {
      id: string;
      status: string;
      checkInTime: string | null;
      checkInDistance: number | null;
      checkInPhotoUrl: string | null;
      checkInLat?: number | null;
      checkInLng?: number | null;
      checkOutTime: string | null;
      checkOutDistance: number | null;
      checkOutPhotoUrl: string | null;
      notes?: string | null;
    } | null;
    holiday?: {
      name: string;
      isNational: boolean;
      description?: string | null;
    } | null;
    isWeekend?: boolean;
    monthlyStats?: {
      presentMonth: number;
      lateMonth: number;
      permitMonth: number;
      sickMonth: number;
      absentMonth: number;
      totalMonth: number;
      totalWorkHours: string;
      disciplineRate: number;
    };
  };
  onRefresh: () => void;
  onOpenHistoryTab: () => void;
  onOpenJournalTab?: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 10) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function getGreetingEmoji(name: string): string {
  const h = new Date().getHours();
  if (h < 10) return "👋";
  if (h < 15) return "☀️";
  if (h < 18) return "🌤️";
  return "🌙";
}

export function MobileHomeView({ data, onRefresh, onOpenHistoryTab, onOpenJournalTab }: MobileHomeViewProps) {
  const { teacher, settings, todayLog, holiday, monthlyStats } = data;

  // Clock state
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [imgError, setImgError] = useState(false);

  // Geolocation State
  const [isSimulatedAtSchool, setIsSimulatedAtSchool] = useState<boolean>(true);
  const [currentLat, setCurrentLat] = useState<number>(settings.latitude);
  const [currentLng, setCurrentLng] = useState<number>(settings.longitude);
  const [distanceMeters, setDistanceMeters] = useState<number>(18);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  // Photo preview
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update distance
  useEffect(() => {
    const dist = calculateDistanceMeters(
      currentLat,
      currentLng,
      settings.latitude,
      settings.longitude
    );
    setDistanceMeters(dist);
  }, [currentLat, currentLng, settings.latitude, settings.longitude]);

  const requestRealGps = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS tidak didukung pada browser ini.");
      return;
    }
    setIsGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        setIsSimulatedAtSchool(false);
        setCurrentLat(pos.coords.latitude);
        setCurrentLng(pos.coords.longitude);
      },
      () => {
        setIsGpsLoading(false);
        setGpsError("Izin lokasi belum diberikan. Menggunakan koordinat presisi madrasah.");
        setIsSimulatedAtSchool(true);
        setCurrentLat(settings.latitude);
        setCurrentLng(settings.longitude);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleToggleSimulation = () => {
    if (isSimulatedAtSchool) {
      requestRealGps();
    } else {
      setIsSimulatedAtSchool(true);
      setCurrentLat(settings.latitude + 0.00008);
      setCurrentLng(settings.longitude + 0.00005);
      setGpsError(null);
    }
  };

  const isInsideRadius = distanceMeters <= (settings.radiusMeters + 15);
  const hasCheckedIn = !!todayLog?.checkInTime;
  const hasCheckedOut = !!todayLog?.checkOutTime;

  const handleSubmitDirect = async (type: "CHECK_IN" | "CHECK_OUT") => {
    swalLoading(
      type === "CHECK_IN" ? "Merekam Presensi Masuk..." : "Merekam Presensi Pulang...",
      "Memverifikasi koordinat GPS dan mencatat kehadiran Anda..."
    );
    try {
      const res = await recordMobileAttendanceAction({
        userId: teacher.id,
        type,
        lat: currentLat,
        lng: currentLng,
        distance: distanceMeters,
        notes: "Presensi mandiri langsung (Verifikasi GPS)",
      });
      swalClose();
      if (res?.error) {
        swalError("Gagal Presensi", res.error);
        return;
      }
      swalSuccess(
        type === "CHECK_IN" ? "Presensi Masuk Berhasil!" : "Presensi Pulang Berhasil!",
        res.message || "Data kehadiran Anda telah tercatat secara resmi.",
        2200
      );
      onRefresh();
    } catch (err: any) {
      swalClose();
      swalError("Kesalahan Sistem", err.message || "Gagal menghubungkan ke server.");
    }
  };

  const handleStartAttendance = (type: "CHECK_IN" | "CHECK_OUT") => {
    if (!isInsideRadius) {
      swalError(
        "Di Luar Radius Madrasah",
        `Jarak Anda saat ini ${distanceMeters.toFixed(1)}m. Presensi hanya diperbolehkan dalam radius ${settings.radiusMeters}m dari madrasah.`
      );
      return;
    }

    if (!settings.requireSelfie) {
      // Foto wajah dinonaktifkan di admin: Guru cukup klik absen maka langsung absen tanpa membuka kamera!
      setCameraType(type);
      handleSubmitDirect(type);
      return;
    }

    setCameraType(type);
    setIsCameraOpen(true);
  };

  const handleSubmitAttendance = async (photoBase64: string, notes?: string) => {
    swalLoading("Merekam Presensi...", "Memverifikasi koordinat GPS dan menyimpan foto ke server...");
    try {
      const res = await recordMobileAttendanceAction({
        userId: teacher.id,
        type: cameraType,
        lat: currentLat,
        lng: currentLng,
        distance: distanceMeters,
        photoBase64,
        notes,
      });
      swalClose();
      if (res?.error) {
        swalError("Gagal Presensi", res.error);
        return;
      }
      swalSuccess(
        cameraType === "CHECK_IN" ? "Presensi Masuk Berhasil!" : "Presensi Pulang Berhasil!",
        res.message || "Data kehadiran Anda telah tercatat secara resmi.",
        2200
      );
      onRefresh();
    } catch (err: any) {
      swalClose();
      swalError("Kesalahan Sistem", err.message || "Gagal menghubungkan ke server.");
    }
  };

  // ── Backdated / Retroactive Attendance State ──
  const [isBackdatedModalOpen, setIsBackdatedModalOpen] = useState(false);
  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const [backdatedDate, setBackdatedDate] = useState<string>(getYesterdayDateString());
  const [backdatedType, setBackdatedType] = useState<"FULL" | "CHECK_IN" | "CHECK_OUT">("FULL");
  const [backdatedInTime, setBackdatedInTime] = useState<string>(settings.workStartTime || "07:00");
  const [backdatedOutTime, setBackdatedOutTime] = useState<string>(settings.workEndTime || "14:00");
  const [backdatedNotes, setBackdatedNotes] = useState<string>("Lupa absen saat kegiatan dinas");
  const [isCheckingDateStatus, setIsCheckingDateStatus] = useState<boolean>(false);
  const [existingDateLog, setExistingDateLog] = useState<{
    id: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    notes?: string | null;
  } | null>(null);
  const [dateHolidayInfo, setDateHolidayInfo] = useState<string | null>(null);
  const [isSubmittingBackdated, setIsSubmittingBackdated] = useState<boolean>(false);

  // Check existing log for chosen backdated date
  const checkDateStatus = async (dateStr: string) => {
    setIsCheckingDateStatus(true);
    try {
      const res = await getTeacherAttendanceForDateAction(dateStr, teacher.id);
      setIsCheckingDateStatus(false);
      if (res?.success) {
        setExistingDateLog(res.log || null);
        setDateHolidayInfo(res.holiday?.name || null);
        // Smart preset mode based on date condition
        if (!res.log || (!res.log.checkInTime && !res.log.checkOutTime)) {
          setBackdatedType("FULL");
        } else if (res.log.checkInTime && !res.log.checkOutTime) {
          setBackdatedType("CHECK_OUT");
        } else {
          setBackdatedType("FULL");
        }
      }
    } catch {
      setIsCheckingDateStatus(false);
    }
  };

  useEffect(() => {
    if (isBackdatedModalOpen && backdatedDate) {
      checkDateStatus(backdatedDate);
    }
  }, [isBackdatedModalOpen, backdatedDate]);

  const handleSubmitBackdated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backdatedDate) {
      swalError("Pilih Tanggal", "Silakan pilih tanggal yang akan dicatat presensinya.");
      return;
    }

    setIsSubmittingBackdated(true);
    swalLoading("Menyimpan Presensi Susulan...", `Mencatat presensi untuk tanggal ${backdatedDate}...`);

    try {
      const res = await recordMobileAttendanceAction({
        userId: teacher.id,
        type: backdatedType,
        dateStr: backdatedDate,
        customCheckInTime: backdatedInTime,
        customCheckOutTime: backdatedOutTime,
        lat: currentLat,
        lng: currentLng,
        distance: distanceMeters,
        notes: backdatedNotes,
      });

      setIsSubmittingBackdated(false);
      swalClose();

      if (res?.error) {
        swalError("Gagal Presensi Susulan", res.error);
        return;
      }

      swalSuccess(
        "Presensi Susulan Berhasil!",
        res.message || "Data presensi tanggal terlewat telah berhasil dicatat.",
        2500
      );
      setIsBackdatedModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setIsSubmittingBackdated(false);
      swalClose();
      swalError("Kesalahan Sistem", err.message || "Gagal menghubungkan ke server.");
    }
  };

  return (
    <div
      className="flex flex-col gap-[12px] pb-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── 1. PROFILE HERO CARD ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              {teacher.avatarUrl && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={teacher.avatarUrl}
                  alt="Foto Profil"
                  className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-[#dde1ff]"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1e40af] flex items-center justify-center text-white font-bold text-2xl shadow-sm ring-2 ring-[#dde1ff]">
                  {teacher.name.charAt(0)}
                </div>
              )}
              {/* Online dot */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#006c4a] rounded-full ring-2 ring-white flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Name / role */}
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] text-[#444653] font-medium">
                {getGreeting()} {getGreetingEmoji(teacher.name)}
              </span>
              <h2 className="text-[16px] font-bold text-[#0b1c30] truncate leading-snug">
                {teacher.name}
              </h2>
              <p className="text-[12px] text-[#444653] truncate">
                Guru • {teacher.madrasahName}
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="w-10 h-10 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] active:scale-95 transition-all flex items-center justify-center text-[#00288e] shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* NIP chip + status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e5eeff]">
          <div className="flex items-center gap-1.5 bg-[#eff4ff] px-2.5 py-1 rounded-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444653" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            <span className="text-[11px] font-semibold text-[#444653] tracking-wide font-mono">
              NIP: {teacher.nip}
            </span>
          </div>

          {hasCheckedIn ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#82f5c1]/40 text-[#006c4a] text-[11px] font-bold shadow-sm border border-[#82f5c1]/40">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse" />
              Sudah Presensi Masuk
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdcc3] text-[#532a00] text-[11px] font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#532a00] animate-pulse" />
              Belum Presensi Datang
            </span>
          )}
        </div>
      </div>

      {/* ── 2. LIVE CLOCK CARD ── */}
      <div className="w-full bg-gradient-to-br from-[#1e40af] to-[#00288e] text-white rounded-xl p-4 shadow-md relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between z-10 relative mb-1">
          <div className="flex items-center gap-1.5 text-[#dde1ff]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-[12px] font-semibold">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-[#dde1ff] text-[11px] font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            <span>NTP Presisi Aktif</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between z-10 relative mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-extrabold tracking-tight leading-none font-mono">
              {timeStr || "07:00:00"}
            </span>
            <span className="text-[12px] text-[#dde1ff] font-semibold">WIB</span>
          </div>
          <div className="flex flex-col items-end text-[#b8c4ff]/90 text-right">
            <span className="text-[11px]">Batas Terlambat</span>
            <span className="text-[14px] font-bold text-white">{settings.lateThreshold} WIB</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-white/15 z-10 relative flex items-center justify-between text-[#dde1ff] text-[11px] font-medium">
          <span>
            Masuk: <strong className="text-white">{settings.workStartTime} WIB</strong>
            {" "}•{" "}
            Pulang: <strong className="text-white">{settings.workEndTime} WIB</strong>
          </span>
        </div>
      </div>

      {/* ── 3. GEOFENCE STATUS ── */}
      <div className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${
              isInsideRadius ? "bg-[#006c4a]" : "bg-[#ba1a1a]"
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-[#0b1c30] truncate">
                {isInsideRadius ? "Dalam Radius Sekolah" : "Di Luar Radius Sekolah"}
              </span>
              {isInsideRadius && (
                <BadgeCheck className="w-4 h-4 text-[#006c4a] shrink-0" />
              )}
            </div>
            <span className="text-[12px] text-[#444653] truncate">
              {distanceMeters.toFixed(0)}m dari titik presensi • {teacher.madrasahName}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggleSimulation}
          disabled={isGpsLoading}
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            isSimulatedAtSchool
              ? "bg-[#85f8c4]/40 text-[#00521c] border border-[#85f8c4]/40"
              : "bg-[#dce9ff] text-[#00288e] border border-[#dce9ff]"
          }`}
        >
          {isGpsLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Navigation className="w-3 h-3" />
          )}
          {isSimulatedAtSchool ? `GPS ±${Math.round(distanceMeters)}m` : "GPS Nyata"}
        </button>
      </div>

      {gpsError && (
        <p className="text-[11px] text-[#532a00] bg-[#ffdcc3]/40 border border-[#ffdcc3] px-3 py-2 rounded-xl">
          {gpsError}
        </p>
      )}

      {/* ── 4. HOLIDAY BANNER ── */}
      {holiday && (
        <div className="rounded-xl bg-[#ffdcc3]/30 border border-[#ffdcc3] p-3.5 flex items-start gap-3 text-[#532a00]">
          <div className="w-8 h-8 rounded-xl bg-[#ffdcc3]/60 flex items-center justify-center shrink-0">
            <span className="text-lg">🎉</span>
          </div>
          <div>
            <h4 className="text-[13px] font-bold leading-tight">{holiday.name}</h4>
            <p className="text-[11px] text-[#743d00] mt-0.5 leading-snug">
              {holiday.description || "Hari ini merupakan hari libur resmi. Presensi bersifat opsional."}
            </p>
          </div>
        </div>
      )}

      {/* ── BACKDATED ATTENDANCE BANNER (when enabled by Admin) ── */}
      {settings.allowBackdatedAttendance && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/30 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-600/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-[13px] font-bold text-[#0b1c30] truncate">
                  Presensi Tanggal Terlewat
                </h4>
                <span className="px-1.5 py-0.2 rounded bg-emerald-600/20 text-emerald-800 text-[10px] font-bold">
                  Aktif
                </span>
              </div>
              <p className="text-[11px] text-[#444653] truncate">
                Lupa absen kemarin? Isi kehadiran susulan mandiri sekarang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBackdatedModalOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <span>Isi Absen</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 5. PRESENSI CEPAT (MAIN CTA) ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#dde1ff] flex items-center justify-center text-[#00288e]">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#0b1c30]">Aksi Presensi Cepat</h3>
              <p className="text-[12px] text-[#444653]">
                {settings.requireSelfie
                  ? "Verifikasi Wajah & Lokasi Biometrik"
                  : "Presensi Instan 1-Klik (Verifikasi GPS)"}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#444653] text-[11px] font-medium">
            Hari Kerja
          </span>
        </div>

        {/* Two Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Presensi Masuk */}
          <button
            id="btn-presensi-masuk"
            onClick={() => !hasCheckedIn && handleStartAttendance("CHECK_IN")}
            disabled={hasCheckedIn}
            className={`relative group overflow-hidden flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all duration-150 ${
              hasCheckedIn
                ? "bg-[#e5eeff] text-[#444653] cursor-default"
                : "bg-[#006c4a] hover:bg-[#005e40] text-white cursor-pointer"
            }`}
          >
            {hasCheckedIn && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#006c4a] rounded-bl-lg" />
            )}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform ${
                hasCheckedIn ? "bg-[#c4c5d5]/30" : "bg-white/20"
              }`}
            >
              {hasCheckedIn ? (
                <CheckCircle2 className="w-6 h-6 text-[#006c4a]" />
              ) : settings.requireSelfie ? (
                <Camera className="w-6 h-6" />
              ) : (
                <Fingerprint className="w-6 h-6" />
              )}
            </div>
            <span className="text-[13px] font-bold leading-tight">
              {hasCheckedIn ? "Sudah Masuk" : "Presensi Masuk"}
            </span>
            {hasCheckedIn ? (
              <span className="text-[11px] text-[#006c4a] font-semibold">
                {new Date(todayLog!.checkInTime!).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} WIB
              </span>
            ) : (
              <span className="text-[11px] text-[#85f8c4]/90">
                {settings.requireSelfie ? "Buka Kamera & Liveness" : "Klik Langsung Presensi"}
              </span>
            )}
          </button>

          {/* Presensi Pulang */}
          <button
            onClick={() => hasCheckedIn && !hasCheckedOut && handleStartAttendance("CHECK_OUT")}
            disabled={!hasCheckedIn || hasCheckedOut}
            className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl transition-all duration-150 ${
              hasCheckedOut
                ? "bg-[#e5eeff] text-[#444653] cursor-default shadow-sm"
                : hasCheckedIn
                ? "bg-[#1e40af] hover:bg-[#173bab] text-white shadow-md active:scale-[0.98] cursor-pointer"
                : "bg-[#eff4ff] text-[#444653]/70 cursor-not-allowed border border-[#c4c5d5]/30"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                hasCheckedOut
                  ? "bg-[#006c4a]/20"
                  : hasCheckedIn
                  ? "bg-white/20"
                  : "bg-[#e5eeff] text-[#444653]"
              }`}
            >
              {hasCheckedOut ? (
                <CheckCircle2 className="w-6 h-6 text-[#006c4a]" />
              ) : hasCheckedIn ? (
                settings.requireSelfie ? (
                  <Camera className="w-6 h-6" />
                ) : (
                  <Fingerprint className="w-6 h-6" />
                )
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            <span className="text-[13px] font-bold leading-tight">
              {hasCheckedOut ? "Sudah Pulang" : "Presensi Pulang"}
            </span>
            {hasCheckedOut ? (
              <span className="text-[11px] text-[#006c4a] font-semibold">
                {new Date(todayLog!.checkOutTime!).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} WIB
              </span>
            ) : (
              <span className="text-[11px] opacity-80">
                {hasCheckedIn
                  ? settings.requireSelfie
                    ? "Selfie Kamera"
                    : "Klik Langsung Pulang"
                  : `Terkunci sd ${settings.workEndTime} WIB`}
              </span>
            )}
          </button>
        </div>

        {/* Shortcut bar */}
        <div className="flex items-center justify-between pt-1 border-t border-[#e5eeff]">
          <button
            onClick={onOpenHistoryTab}
            className="flex items-center gap-1 text-[12px] text-[#00288e] font-semibold hover:underline"
          >
            <FileText className="w-4 h-4" />
            Izin / Dinas Luar
          </button>
          {settings.allowBackdatedAttendance && (
            <>
              <span className="text-[#c4c5d5]">•</span>
              <button
                type="button"
                onClick={() => setIsBackdatedModalOpen(true)}
                className="flex items-center gap-1 text-[12px] text-emerald-700 font-semibold hover:underline"
              >
                <CalendarDays className="w-4 h-4" />
                Tanggal Terlewat
              </button>
            </>
          )}
          <span className="text-[#c4c5d5]">•</span>
          <button className="flex items-center gap-1 text-[12px] text-[#00288e] font-semibold hover:underline">
            <ArrowLeftRight className="w-4 h-4" />
            Tukar Jadwal
          </button>
        </div>
      </div>

      {/* ── CARD JURNAL KBM CEPAT ── */}
      {onOpenJournalTab && (
        <div className="bg-linear-to-r from-[#00288e]/5 via-[#00288e]/10 to-indigo-50 border border-[#00288e]/15 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#00288e] text-white flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h4 className="text-[13px] font-bold text-[#0b1c30]">Jurnal KBM Harian</h4>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#00288e] text-white">Baru</span>
              </div>
              <p className="text-[11px] text-[#444653] leading-snug">
                Dokumentasikan materi, aktivitas, & absensi siswa hari ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenJournalTab}
            className="px-3.5 py-2 rounded-xl bg-[#00288e] text-white text-[12px] font-bold shrink-0 hover:bg-[#002070] transition-all active:scale-95 shadow-xs flex items-center gap-1"
          >
            Tulis
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 6. KEHADIRAN BULAN INI ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-5 h-5 text-[#00288e]" />
            <h3 className="text-[14px] font-bold text-[#0b1c30]">Kehadiran Bulan Ini</h3>
          </div>
          <span className="text-[11px] text-[#444653] bg-[#e5eeff] px-2 py-0.5 rounded font-medium">
            {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </span>
        </div>

        {/* Discipline Banner */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Circular progress */}
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#e5eeff]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-[#006c4a]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${monthlyStats?.disciplineRate ?? (hasCheckedIn ? 100 : 0)}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-[#0b1c30]">
                  {monthlyStats?.disciplineRate ?? (hasCheckedIn ? 100 : 0)}%
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-[#0b1c30]">
                    Disiplin Kehadiran {monthlyStats?.disciplineRate ?? (hasCheckedIn ? 100 : 0)}%
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#82f5c1]/50 text-[#005137] text-[10px] font-bold">
                    {(monthlyStats?.disciplineRate ?? (hasCheckedIn ? 100 : 0)) >= 85 ? "Sangat Baik" : "Perlu Ditingkatkan"}
                  </span>
                </div>
                <span className="text-[12px] text-[#444653]">
                  Total Terakumulasi: {monthlyStats?.totalWorkHours ?? "0.0"} Jam Kerja Bulan Ini
                </span>
              </div>
            </div>
            <div className="p-2 rounded-full bg-[#82f5c1]/30 text-[#006c4a]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-[#e5eeff] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#006c4a] h-2 rounded-full transition-all duration-700"
              style={{ width: `${monthlyStats?.disciplineRate ?? (hasCheckedIn ? 100 : 0)}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: "check_circle",
              label: "Tepat Waktu",
              value: monthlyStats?.presentMonth ?? (hasCheckedIn ? 1 : 0),
              color: "bg-[#82f5c1]/40 text-[#005137]",
              lucide: <CheckCircle2 className="w-5 h-5" />,
            },
            {
              icon: "timer_off",
              label: "Terlambat",
              value: monthlyStats?.lateMonth ?? 0,
              color: "bg-[#ffdcc3] text-[#532a00]",
              lucide: <Clock className="w-5 h-5" />,
            },
            {
              icon: "assignment",
              label: "Izin / Sakit",
              value: (monthlyStats?.permitMonth ?? 0) + (monthlyStats?.sickMonth ?? 0),
              color: "bg-[#dde1ff] text-[#00288e]",
              lucide: <FileText className="w-5 h-5" />,
            },
            {
              icon: "block",
              label: "Tanpa Ket.",
              value: monthlyStats?.absentMonth ?? 0,
              color: "bg-[#e5eeff] text-[#444653]",
              lucide: <Info className="w-5 h-5" />,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-3.5 rounded-xl shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                {stat.lucide}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[22px] font-bold text-[#0b1c30] leading-none">{stat.value}</span>
                <span className="text-[11px] text-[#444653] truncate mt-0.5">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* ── 8. PENGUMUMAN & AGENDA GTK ── */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-2 relative overflow-hidden">
        {/* Left border accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00288e] rounded-l-xl" />
        <div className="pl-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#00288e]">
              <Megaphone className="w-4 h-4" />
              <span className="text-[12px] font-bold">Pengumuman & Agenda GTK</span>
            </div>
            <span className="text-[11px] text-[#444653]">Kemarin, 14:20</span>
          </div>
          <h4 className="text-[13px] font-bold text-[#0b1c30] mt-1">
            Peringatan Hari Guru Nasional & Penilaian Kinerja Guru (PKG)
          </h4>
          <p className="text-[12px] text-[#444653] leading-relaxed mt-1">
            Seluruh dewan guru diharapkan mempersiapkan dokumen administrasi pembelajaran semester ganjil
            untuk pelaksanaan PKG pekan depan. Tim verifikator pengawas cabang dinas akan hadir mulai hari Selasa.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-[#e5eeff] mt-2">
            <span className="text-[11px] text-[#444653] font-medium">Oleh: Kepala Madrasah</span>
            <button className="text-[12px] text-[#00288e] font-bold flex items-center gap-0.5 hover:underline">
              Detail Selengkapnya
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 9. HELP BANNER ── */}
      <div className="p-3 rounded-xl bg-[#dde1ff]/40 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Headphones className="w-5 h-5 text-[#00288e] shrink-0" />
          <span className="text-[12px] text-[#0b1c30] truncate">
            Kendala presensi atau radius GPS meleset?
          </span>
        </div>
        <button
          onClick={() => swalSuccess(
            "Pusat Bantuan GTK",
            "Layanan Tata Usaha & Helpdesk Madrasah:\nWhatsApp: +62 812-9876-5432\nEmail: tu.madrasah@kemenag.go.id\nJam Layanan: Senin - Jumat (07.00 - 15.30 WIB)",
            4000
          )}
          className="text-[12px] text-[#00288e] font-bold px-2.5 py-1 rounded-full bg-white shadow-sm shrink-0 hover:bg-[#eff4ff] transition-colors"
        >
          Bantuan
        </button>
      </div>

      {/* ── CAMERA MODAL ── */}
      <MobileCameraModal
        isOpen={isCameraOpen}
        type={cameraType}
        teacherName={teacher.name}
        teacherNip={teacher.nip}
        madrasahName={teacher.madrasahName}
        currentLat={currentLat}
        currentLng={currentLng}
        distanceMeters={distanceMeters}
        isInsideRadius={isInsideRadius}
        onClose={() => setIsCameraOpen(false)}
        onSubmit={handleSubmitAttendance}
      />

      {/* ── PHOTO PREVIEW MODAL ── */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1c30] border border-[#1e40af]/50 rounded-3xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between text-white">
              <h4 className="text-[12px] font-bold">{previewPhoto.title}</h4>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto.url}
              alt="Bukti Selfie"
              className="w-full h-auto rounded-2xl border border-[#1e40af]/30"
            />
          </div>
        </div>
      )}

      {/* ── BACKDATED ATTENDANCE MODAL ── */}
      {isBackdatedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold leading-tight">Presensi Tanggal Terlewat</h3>
                  <p className="text-[11px] text-emerald-100">Catat kehadiran susulan mandiri guru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBackdatedModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitBackdated} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Quick Date Chips */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#0b1c30]">Pilih Tanggal Presensi</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Kemarin", offset: 1 },
                    { label: "2 Hari Lalu", offset: 2 },
                    { label: "3 Hari Lalu", offset: 3 },
                  ].map((chip) => {
                    const d = new Date();
                    d.setDate(d.getDate() - chip.offset);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const ds = `${y}-${m}-${day}`;
                    const isSelected = backdatedDate === ds;

                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setBackdatedDate(ds)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-[#eff4ff] text-[#0b1c30] border-[#dde1ff] hover:bg-[#dce9ff]"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                {/* Date Input */}
                <input
                  type="date"
                  max={getYesterdayDateString()}
                  value={backdatedDate}
                  onChange={(e) => setBackdatedDate(e.target.value)}
                  required
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-[#f8f9ff] text-[#0b1c30] text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Status Date Preview */}
              <div className="rounded-xl border p-3 flex flex-col gap-1.5 bg-[#f8f9ff] border-[#dde1ff]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#444653] uppercase tracking-wide">
                    Status Tanggal Terpilih:
                  </span>
                  {isCheckingDateStatus && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Memeriksa...</span>
                    </div>
                  )}
                </div>

                {dateHolidayInfo && (
                  <div className="text-[12px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                    <span>🎉</span>
                    <span>Hari Libur: {dateHolidayInfo}</span>
                  </div>
                )}

                {existingDateLog ? (
                  <div className="flex flex-col gap-1 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0b1c30]">
                        Log Terdaftar: {existingDateLog.status}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {existingDateLog.checkInTime && existingDateLog.checkOutTime ? "Lengkap" : "Sebagian"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#444653] flex items-center gap-3">
                      <span>
                        Masuk:{" "}
                        <strong className="text-[#0b1c30]">
                          {existingDateLog.checkInTime
                            ? new Date(existingDateLog.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                            : "-"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Pulang:{" "}
                        <strong className="text-[#0b1c30]">
                          {existingDateLog.checkOutTime
                            ? new Date(existingDateLog.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                            : "-"}
                        </strong>
                      </span>
                    </div>
                    {existingDateLog.notes && (
                      <span className="text-[10px] text-[#71727a] italic">
                        Catatan: {existingDateLog.notes}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] text-[#532a00] bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200">
                    Belum ada presensi tercatat (Alpa). Anda dapat mengisi kehadiran lengkap.
                  </div>
                )}
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#0b1c30]">Jenis Presensi Susulan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBackdatedType("FULL")}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-0.5 ${
                      backdatedType === "FULL"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-[#444653] border-[#dde1ff] hover:bg-[#eff4ff]"
                    }`}
                  >
                    <span>⚡ Lengkap</span>
                    <span className="text-[9px] opacity-80 font-normal">Masuk & Pulang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackdatedType("CHECK_IN")}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-0.5 ${
                      backdatedType === "CHECK_IN"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-[#444653] border-[#dde1ff] hover:bg-[#eff4ff]"
                    }`}
                  >
                    <span>🌅 Masuk Saja</span>
                    <span className="text-[9px] opacity-80 font-normal">Jam Masuk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackdatedType("CHECK_OUT")}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-0.5 ${
                      backdatedType === "CHECK_OUT"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-[#444653] border-[#dde1ff] hover:bg-[#eff4ff]"
                    }`}
                  >
                    <span>🌇 Pulang Saja</span>
                    <span className="text-[9px] opacity-80 font-normal">Jam Pulang</span>
                  </button>
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {(backdatedType === "FULL" || backdatedType === "CHECK_IN") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#0b1c30] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Jam Masuk</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={backdatedInTime}
                      onChange={(e) => setBackdatedInTime(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-[#dde1ff] bg-white text-[#0b1c30] text-[13px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                )}

                {(backdatedType === "FULL" || backdatedType === "CHECK_OUT") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#0b1c30] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Jam Pulang</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={backdatedOutTime}
                      onChange={(e) => setBackdatedOutTime(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-[#dde1ff] bg-white text-[#0b1c30] text-[13px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                )}
              </div>

              {/* Alasan / Catatan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#0b1c30]">Alasan / Keterangan Terlewat</label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {[
                    "Lupa absen saat kegiatan dinas",
                    "Kendala jaringan / server",
                    "Tugas luar madrasah",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBackdatedNotes(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Misal: Lupa absen karena tugas luar madrasah"
                  value={backdatedNotes}
                  onChange={(e) => setBackdatedNotes(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[#0b1c30] text-[12px] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Verification Info */}
              <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#dde1ff] flex items-center gap-2.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[#444653]">
                  {settings.requireSelfie
                    ? "Foto selfie diaktifkan di admin untuk presensi real-time."
                    : "Presensi instan aktif tanpa perlu kamera (Kebijakan Admin)."}
                </span>
              </div>

              {/* Submit & Cancel */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBackdatedModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#dde1ff] text-[#444653] font-bold text-[13px] hover:bg-[#f8f9ff] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBackdated}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingBackdated ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Simpan Presensi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
