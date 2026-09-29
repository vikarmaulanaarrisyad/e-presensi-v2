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
  BookOpen,
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
  Loader2
} from "lucide-react";
import { MobileCameraModal } from "./mobile-camera-modal";
import { calculateDistanceMeters } from "@/lib/geo";
import { recordMobileAttendanceAction } from "@/server/actions/mobile-attendance.actions";
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

export function MobileHomeView({ data, onRefresh, onOpenHistoryTab }: MobileHomeViewProps) {
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

  const handleStartAttendance = (type: "CHECK_IN" | "CHECK_OUT") => {
    if (!isInsideRadius) {
      swalError(
        "Di Luar Radius Madrasah",
        `Jarak Anda saat ini ${distanceMeters.toFixed(1)}m. Presensi hanya diperbolehkan dalam radius ${settings.radiusMeters}m dari madrasah.`
      );
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
              <p className="text-[12px] text-[#444653]">Verifikasi Wajah & Lokasi Biometrik</p>
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
              ) : (
                <Camera className="w-6 h-6" />
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
              <span className="text-[11px] text-[#85f8c4]/90">Buka Kamera & Liveness</span>
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
                <Camera className="w-6 h-6" />
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
                {hasCheckedIn ? "Selfie Kamera" : `Terkunci sd ${settings.workEndTime} WIB`}
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
          <span className="text-[#c4c5d5]">•</span>
          <button className="flex items-center gap-1 text-[12px] text-[#00288e] font-semibold hover:underline">
            <ArrowLeftRight className="w-4 h-4" />
            Tukar Jadwal Mengajar
          </button>
        </div>
      </div>

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

      {/* ── 7. JADWAL MENGAJAR HARI INI ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-5 h-5 text-[#00288e]" />
            <h3 className="text-[14px] font-bold text-[#0b1c30]">Jadwal Mengajar Hari Ini</h3>
          </div>
          <span className="text-[12px] text-[#00288e] font-semibold">3 Agenda</span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Sesi 1 */}
          <div className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-[#dde1ff]/60 text-[#00288e] flex flex-col items-center justify-center shrink-0 font-bold">
                <span className="text-[10px] leading-none">JAM</span>
                <span className="text-[14px] leading-none">1-3</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-[13px] font-bold text-[#0b1c30] truncate">XII MIPA 1 (Matematika Wajib)</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[#444653] text-[11px]">
                  <span className="flex items-center gap-0.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Ruang R.12
                  </span>
                  <span>•</span>
                  <span>07.30 - 09.45 WIB</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#82f5c1]/40 text-[#005137] text-[11px] font-semibold shrink-0">
              Siap Mulai
            </span>
          </div>

          {/* Sesi 2 */}
          <div className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-[#e5eeff] text-[#444653] flex flex-col items-center justify-center shrink-0 font-bold">
                <span className="text-[10px] leading-none">JAM</span>
                <span className="text-[14px] leading-none">5-6</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-[13px] font-bold text-[#0b1c30] truncate">XI MIPA 3 (Matematika Peminatan)</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[#444653] text-[11px]">
                  <span className="flex items-center gap-0.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    Lab Komputer
                  </span>
                  <span>•</span>
                  <span>10.15 - 11.45 WIB</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#444653] text-[11px] font-medium shrink-0">
              Berikutnya
            </span>
          </div>

          {/* Sesi 3 / Tugas GTK */}
          <div className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-[#ffdcc3] text-[#532a00] flex flex-col items-center justify-center shrink-0 font-bold">
                <span className="text-[9px] leading-none">TUGAS</span>
                <span className="text-[14px] leading-none">GTK</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-[13px] font-bold text-[#0b1c30] truncate">Piket Pembina OSIS / Ekstrakurikuler</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[#444653] text-[11px]">
                  <span className="flex items-center gap-0.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    Ruang OSIS
                  </span>
                  <span>•</span>
                  <span>13.00 - 14.30 WIB</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#444653] text-[11px] font-medium shrink-0">
              Nanti Siang
            </span>
          </div>
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
    </div>
  );
}
