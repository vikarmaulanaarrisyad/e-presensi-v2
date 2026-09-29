"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  Building2, 
  RefreshCw,
  Navigation,
  Check,
  ChevronRight,
  Sun,
  Moon,
  Info
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
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
  };
  onRefresh: () => void;
  onOpenHistoryTab: () => void;
}

export function MobileHomeView({ data, onRefresh, onOpenHistoryTab }: MobileHomeViewProps) {
  const { teacher, settings, todayLog, holiday } = data;

  // Realtime Clock
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  // Geolocation State
  const [isSimulatedAtSchool, setIsSimulatedAtSchool] = useState<boolean>(true);
  const [currentLat, setCurrentLat] = useState<number>(settings.latitude);
  const [currentLng, setCurrentLng] = useState<number>(settings.longitude);
  const [distanceMeters, setDistanceMeters] = useState<number>(12.5);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  // Inspection Photo Modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Clock Ticker
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

  // Update Distance whenever coordinates change
  useEffect(() => {
    const dist = calculateDistanceMeters(
      currentLat,
      currentLng,
      settings.latitude,
      settings.longitude
    );
    setDistanceMeters(dist);
  }, [currentLat, currentLng, settings.latitude, settings.longitude]);

  // Request Real Geolocation
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
      (err) => {
        setIsGpsLoading(false);
        setGpsError("Izin lokasi belum diberikan. Menggunakan koordinat presisi madrasah.");
        // Fallback to school
        setIsSimulatedAtSchool(true);
        setCurrentLat(settings.latitude);
        setCurrentLng(settings.longitude);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Toggle Simulation
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

  // Check geofence
  const isInsideRadius = distanceMeters <= (settings.radiusMeters + 15);

  // Status check
  const hasCheckedIn = !!todayLog?.checkInTime;
  const hasCheckedOut = !!todayLog?.checkOutTime;

  // Open Camera
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

  // Submit Attendance from Camera Modal
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
        res.message || "Data kehadiran Anda telah tercatat secara resmi di server Kemenag.",
        2200
      );

      onRefresh();
    } catch (err: any) {
      swalClose();
      swalError("Kesalahan Sistem", err.message || "Gagal menghubungkan ke server.");
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* 1. FLUTTER APPBAR & GREETING */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-5 text-white shadow-xl">
        {/* Subtle Islamic Motif Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-amber-400/15 blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-lg text-emerald-100 shadow-inner">
                {teacher.name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-emerald-900" />
            </div>
            <div>
              <p className="text-xs text-emerald-200/90 font-medium flex items-center gap-1">
                Assalamu&apos;alaikum,
              </p>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">
                {teacher.name}
              </h2>
              <p className="text-[11px] text-emerald-100/70 font-mono mt-0.5">
                NIP. {teacher.nip}
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-emerald-100 border border-white/15"
            title="Muat ulang status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Madrasah Chip */}
        <div className="relative mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-100">
            <Building2 className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-medium line-clamp-1">{teacher.madrasahName}</span>
          </div>
          <span className="text-[11px] bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/20 font-mono">
            Online
          </span>
        </div>
      </div>

      {/* 2. HOLIDAY / SEMESTER BREAK BANNER */}
      {holiday && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>{holiday.name}</span>
              <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0">Libur</Badge>
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-snug">
              {holiday.description || "Hari ini merupakan hari libur resmi. Presensi kehadiran bersifat opsional."}
            </p>
          </div>
        </div>
      )}

      {/* 3. LIVE CLOCK CARD */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Waktu Presensi (WIB)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {dateStr}
          </span>
        </div>

        {/* Big Digital Clock */}
        <div className="text-center py-2">
          <div className="text-4xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white drop-shadow-sm">
            {timeStr || "07:00:00"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Jam Masuk: <span className="font-semibold text-emerald-600">{settings.workStartTime}</span> • Batas Telat: <span className="font-semibold text-amber-600">{settings.lateThreshold}</span> • Jam Pulang: <span className="font-semibold text-slate-700 dark:text-slate-300">{settings.workEndTime}</span>
          </p>
        </div>
      </div>

      {/* 4. GEOFENCE RADAR CARD (LIVE GPS) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              isInsideRadius 
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600" 
                : "bg-rose-50 dark:bg-rose-950/50 text-rose-600"
            }`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Radius Geofencing Madrasah
              </h4>
              <p className="text-[10px] text-slate-500">Maksimal {settings.radiusMeters}m dari pusat madrasah</p>
            </div>
          </div>

          <Badge className={`text-[10px] px-2 py-0.5 font-semibold ${
            isInsideRadius 
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" 
              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200"
          }`}>
            {isInsideRadius ? "✓ Dalam Radius" : "✕ Di Luar Radius"}
          </Badge>
        </div>

        {/* Live Distance Meter */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Jarak ke Titik Presensi:</span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
              {distanceMeters.toFixed(1)} <span className="text-xs font-normal text-slate-500">meter</span>
            </div>
          </div>

          {/* Quick Simulation Button for Demo / Testing */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleSimulation}
            disabled={isGpsLoading}
            className={`rounded-xl text-[11px] h-8 px-2.5 gap-1.5 transition-all ${
              isSimulatedAtSchool
                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${isGpsLoading ? "animate-spin" : ""}`} />
            {isSimulatedAtSchool ? "📍 Di Madrasah (Demo)" : "🛰️ GPS Nyata"}
          </Button>
        </div>

        {gpsError && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-200/50">
            {gpsError}
          </p>
        )}
      </div>

      {/* 5. TODAY'S ATTENDANCE STATUS CARDS */}
      <div className="grid grid-cols-2 gap-3">
        {/* CHECK-IN CARD */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Presensi Masuk
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {hasCheckedIn ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-lg font-mono font-bold text-emerald-600">
                {new Date(todayLog!.checkInTime!).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                <span className="text-[10px] font-sans">WIB</span>
              </div>
              <Badge className={`w-fit text-[9px] px-1.5 py-0 ${
                todayLog?.status === "LATE" 
                  ? "bg-amber-100 text-amber-800 border-amber-200" 
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }`}>
                {todayLog?.status === "LATE" ? "Terlambat" : "Tepat Waktu"}
              </Badge>
              {todayLog?.checkInPhotoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      url: todayLog.checkInPhotoUrl!,
                      title: "Foto Selfie Presensi Masuk",
                    })
                  }
                  className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 mt-1"
                >
                  <Camera className="w-3 h-3" />
                  Lihat Foto Selfie
                </button>
              )}
            </div>
          ) : (
            <div className="py-2">
              <span className="text-xs text-slate-400 font-medium">Belum Presensi</span>
              <p className="text-[10px] text-slate-400 mt-1">Lakukan sebelum {settings.lateThreshold} WIB</p>
            </div>
          )}
        </div>

        {/* CHECK-OUT CARD */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Presensi Pulang
            </span>
            <span className="w-2 h-2 rounded-full bg-teal-500" />
          </div>

          {hasCheckedOut ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-lg font-mono font-bold text-teal-600">
                {new Date(todayLog!.checkOutTime!).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                <span className="text-[10px] font-sans">WIB</span>
              </div>
              <Badge className="w-fit text-[9px] px-1.5 py-0 bg-teal-100 text-teal-800 border-teal-200">
                Selesai Pulang
              </Badge>
              {todayLog?.checkOutPhotoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      url: todayLog.checkOutPhotoUrl!,
                      title: "Foto Selfie Presensi Pulang",
                    })
                  }
                  className="text-[10px] text-teal-600 hover:underline flex items-center gap-1 mt-1"
                >
                  <Camera className="w-3 h-3" />
                  Lihat Foto Selfie
                </button>
              )}
            </div>
          ) : (
            <div className="py-2">
              <span className="text-xs text-slate-400 font-medium">
                {hasCheckedIn ? "Menunggu Jam Pulang" : "Belum Masuk"}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Mulai pukul {settings.workEndTime} WIB</p>
            </div>
          )}
        </div>
      </div>

      {/* 6. PRIMARY FLUTTER-STYLE ACTION BUTTON */}
      <div className="mt-1 flex flex-col gap-2">
        {!hasCheckedIn ? (
          <Button
            size="lg"
            onClick={() => handleStartAttendance("CHECK_IN")}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-6 rounded-2xl shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2.5 active:scale-98 transition-all"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm tracking-wide">Presensi Masuk (Selfie Kamera)</span>
          </Button>
        ) : !hasCheckedOut ? (
          <Button
            size="lg"
            onClick={() => handleStartAttendance("CHECK_OUT")}
            className="w-full bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white font-bold py-6 rounded-2xl shadow-xl shadow-teal-900/30 flex items-center justify-center gap-2.5 active:scale-98 transition-all"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm tracking-wide">Presensi Pulang (Selfie Kamera)</span>
          </Button>
        ) : (
          <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Presensi Hari Ini Lengkap & Selesai! Terima Kasih.</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenHistoryTab}
          className="text-center text-xs text-slate-500 hover:text-emerald-600 font-medium py-1 transition-colors flex items-center justify-center gap-1"
        >
          <span>Lihat Riwayat Presensi Bulan Ini</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 7. CAMERA MODAL */}
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

      {/* 8. PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between text-white">
              <h4 className="text-xs font-bold">{previewPhoto.title}</h4>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-slate-300"
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto.url}
              alt="Bukti Selfie"
              className="w-full h-auto rounded-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
