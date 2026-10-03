"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertTriangle, 
  XCircle, 
  X, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { bulkRecordAttendanceAction } from "@/server/actions/attendance.actions";
import { 
  parseDailySchedules, 
  getDayScheduleForDate, 
  calculateJitterRange,
  formatIndoTime
} from "@/features/attendance/lib/daily-schedule-helper";
import { 
  swalLoading, 
  swalSuccess, 
  swalError, 
  swalClose, 
  swalConfirm 
} from "@/lib/swal";

export interface SelectedTeacherInfo {
  id: string;
  name: string;
  nip: string | null;
  currentStatus?: string | null;
}

interface BulkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTeachers: SelectedTeacherInfo[];
  dateStr: string; // YYYY-MM-DD
  madrasahId: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  dailySchedules?: string | null;
}

type AttendanceStatusType = "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";

const STATUS_OPTIONS: Array<{
  value: AttendanceStatusType;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeBorderClass: string;
  accentBg: string;
}> = [
  {
    value: "PRESENT",
    label: "Hadir Tepat Waktu",
    shortDesc: "Sesuai jam kerja",
    icon: CheckCircle2,
    colorClass: "text-emerald-500",
    activeBorderClass: "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-xs",
    accentBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "LATE",
    label: "Terlambat",
    shortDesc: "Lewat batas toleransi",
    icon: Clock,
    colorClass: "text-amber-500",
    activeBorderClass: "border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-xs",
    accentBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    value: "PERMIT",
    label: "Izin / Cuti",
    shortDesc: "Tugas dinas atau izin",
    icon: FileText,
    colorClass: "text-blue-500",
    activeBorderClass: "border-blue-500 bg-blue-500/10 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30 shadow-xs",
    accentBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  {
    value: "SICK",
    label: "Sakit",
    shortDesc: "Keterangan medis",
    icon: AlertTriangle,
    colorClass: "text-purple-500",
    activeBorderClass: "border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/30 shadow-xs",
    accentBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  },
  {
    value: "ABSENT",
    label: "Alpa / Tanpa Ket.",
    shortDesc: "Tanpa konfirmasi",
    icon: XCircle,
    colorClass: "text-rose-500",
    activeBorderClass: "border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30 shadow-xs",
    accentBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
];

const NOTE_TEMPLATES = [
  "Rapat Pleno Dewan Guru",
  "Kegiatan Pelatihan / Workshop Kemenag",
  "Tugas Dinas Luar / Pengawas",
  "Dispensasi Upacara Hari Besar",
  "Presensi Manual Kolektif Operator",
  "Kendala Teknis / Jaringan Offline",
];

/**
 * Modern 24-Hour Time Input Component
 * Guarantees standard 24h format (HH:mm) with WIB badge and zero AM/PM confusion
 */
function TimeInput24h({
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [h, m] = (value || "07:00").split(":");
  const currentH = (h ?? "07").padStart(2, "0");
  const currentM = (m ?? "00").padStart(2, "0");

  const updateTime = (newH: string, newM: string) => {
    let numH = parseInt(newH, 10);
    if (isNaN(numH) || numH < 0) numH = 0;
    if (numH > 23) numH = 23;

    let numM = parseInt(newM, 10);
    if (isNaN(numM) || numM < 0) numM = 0;
    if (numM > 59) numM = 59;

    const formattedH = String(numH).padStart(2, "0");
    const formattedM = String(numM).padStart(2, "0");
    onChange(`${formattedH}:${formattedM}`);
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-2xs ${
        disabled ? "opacity-50 pointer-events-none bg-muted/40" : "hover:border-border"
      } ${className}`}
    >
      <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 opacity-80" />
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={currentH}
        disabled={disabled}
        onChange={(e) => updateTime(e.target.value, currentM)}
        onFocus={(e) => e.target.select()}
        aria-label="Jam (00-23)"
        className="w-6 text-center text-xs font-mono font-bold text-foreground bg-transparent outline-none p-0 select-all"
      />
      <span className="text-xs font-mono font-bold text-muted-foreground/80">:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={currentM}
        disabled={disabled}
        onChange={(e) => updateTime(currentH, e.target.value)}
        onFocus={(e) => e.target.select()}
        aria-label="Menit (00-59)"
        className="w-6 text-center text-xs font-mono font-bold text-foreground bg-transparent outline-none p-0 select-all"
      />
      <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider ml-0.5 px-1.5 py-0.5 rounded bg-muted/70">
        WIB
      </span>
    </div>
  );
}

export function BulkAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  selectedTeachers,
  dateStr,
  madrasahId,
  defaultStartTime = "07:00",
  defaultEndTime = "14:00",
  dailySchedules,
}: BulkAttendanceModalProps) {
  const daySchedule = useMemo(() => {
    const allSchedules = parseDailySchedules(dailySchedules);
    return getDayScheduleForDate(dateStr, allSchedules);
  }, [dateStr, dailySchedules]);

  const [status, setStatus] = useState<AttendanceStatusType>("PRESENT");
  const [randomizeTime, setRandomizeTime] = useState(true);
  const [checkInTime, setCheckInTime] = useState(daySchedule.checkInTime);
  const [checkInTimeStart, setCheckInTimeStart] = useState(daySchedule.checkInTimeStart);
  const [checkInTimeEnd, setCheckInTimeEnd] = useState(daySchedule.checkInTimeEnd);
  const [setCheckOut, setSetCheckOut] = useState(true);
  const [checkOutTime, setCheckOutTime] = useState(daySchedule.checkOutTime);
  const [checkOutTimeStart, setCheckOutTimeStart] = useState(daySchedule.checkOutTimeStart);
  const [checkOutTimeEnd, setCheckOutTimeEnd] = useState(daySchedule.checkOutTimeEnd);
  const [notes, setNotes] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllTeachers, setShowAllTeachers] = useState(false);

  // Sync with daySchedule when dateStr or modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckInTime(daySchedule.checkInTime);
      setCheckInTimeStart(daySchedule.checkInTimeStart);
      setCheckInTimeEnd(daySchedule.checkInTimeEnd);
      setCheckOutTime(daySchedule.checkOutTime);
      setCheckOutTimeStart(daySchedule.checkOutTimeStart);
      setCheckOutTimeEnd(daySchedule.checkOutTimeEnd);
      setSetCheckOut(true);
      setShowAllTeachers(false);
    }
  }, [isOpen, dateStr, daySchedule]);

  const applyPreset = (preset: "mon_thu" | "fri" | "sat" | "madrasah") => {
    if (preset === "fri") {
      setCheckOutTime("11:30");
      setCheckOutTimeStart("11:31");
      setCheckOutTimeEnd("11:52");
    } else if (preset === "sat") {
      setCheckOutTime("15:00");
      setCheckOutTimeStart("15:01");
      setCheckOutTimeEnd("15:22");
    } else if (preset === "mon_thu") {
      setCheckOutTime("14:30");
      setCheckOutTimeStart("14:31");
      setCheckOutTimeEnd("14:52");
    } else {
      setCheckOutTime(daySchedule.checkOutTime);
      setCheckOutTimeStart(daySchedule.checkOutTimeStart);
      setCheckOutTimeEnd(daySchedule.checkOutTimeEnd);
      setCheckInTime(daySchedule.checkInTime);
      setCheckInTimeStart(daySchedule.checkInTimeStart);
      setCheckInTimeEnd(daySchedule.checkInTimeEnd);
    }
    setSetCheckOut(true);
  };

  const handleCheckInTimeChange = (newVal: string) => {
    setCheckInTime(newVal);
    const jit = calculateJitterRange(newVal, "in");
    setCheckInTimeStart(jit.start);
    setCheckInTimeEnd(jit.end);
  };

  const handleCheckOutTimeChange = (newVal: string) => {
    setCheckOutTime(newVal);
    const jit = calculateJitterRange(newVal, "out");
    setCheckOutTimeStart(jit.start);
    setCheckOutTimeEnd(jit.end);
  };

  if (!isOpen) return null;

  const count = selectedTeachers.length;

  const handleStatusChange = (newStatus: AttendanceStatusType) => {
    setStatus(newStatus);
    if (newStatus === "LATE") {
      setCheckInTimeStart("07:16");
      setCheckInTimeEnd("07:35");
      setCheckInTime("07:20");
    } else if (newStatus === "PRESENT") {
      setCheckInTimeStart(daySchedule.checkInTimeStart);
      setCheckInTimeEnd(daySchedule.checkInTimeEnd);
      setCheckInTime(daySchedule.checkInTime);
    }
  };

  // Format date display
  const formatDateDisplay = (isoStr: string) => {
    try {
      const [y, m, d] = isoStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const handleQuickNote = (template: string) => {
    setNotes(template);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (count === 0) {
      swalError("Pilih Guru Terlebih Dahulu", "Belum ada guru yang dipilih.");
      return;
    }

    const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
    const modeDesc = randomizeTime
      ? `dengan variasi jam acak alami (${formatIndoTime(checkInTimeStart)} - ${formatIndoTime(checkInTimeEnd)} WIB)`
      : `pada jam seragam ${formatIndoTime(checkInTime)} WIB`;
    const confirmText = `Anda akan mencatat presensi massal status "${statusLabel}" ${modeDesc} untuk ${count} guru pada ${formatDateDisplay(dateStr)}. Lanjutkan?`;

    const confirmed = await swalConfirm(
      "Konfirmasi Presensi Massal",
      confirmText,
      "Ya, Terapkan Presensi",
      "Batal"
    );

    if (!confirmed) return;

    // Tutup modal terlebih dahulu agar halaman bersih
    onClose();

    try {
      swalLoading("Menyimpan Presensi Massal...", `Memproses ${count} guru madrasah.`);

      const result = await bulkRecordAttendanceAction({
        madrasahId,
        teacherIds: selectedTeachers.map((t) => t.id),
        dateStr,
        status,
        checkInTime: status === "PRESENT" || status === "LATE" ? checkInTime : null,
        checkOutTime: setCheckOut && (status === "PRESENT" || status === "LATE") ? checkOutTime : null,
        setCheckOut: setCheckOut && (status === "PRESENT" || status === "LATE"),
        notes: notes.trim() || undefined,
        overwriteExisting,
        randomizeTime,
        checkInTimeStart: randomizeTime ? checkInTimeStart : undefined,
        checkInTimeEnd: randomizeTime ? checkInTimeEnd : undefined,
        checkOutTimeStart: randomizeTime && setCheckOut ? checkOutTimeStart : undefined,
        checkOutTimeEnd: randomizeTime && setCheckOut ? checkOutTimeEnd : undefined,
      });

      swalClose();

      if (result.error) {
        swalError("Gagal Mencatat Presensi", result.error);
        return;
      }

      const resData = result.data;
      const successMessage = resData?.skippedCount && resData.skippedCount > 0
        ? `Berhasil memproses ${resData.processedCount} guru (${resData.createdCount} baru, ${resData.updatedCount} diperbarui, ${resData.skippedCount} dilewati karena sudah absen).`
        : `Berhasil mencatat presensi massal untuk ${resData?.processedCount || count} guru dengan jam bervariasi secara alami.`;

      await swalSuccess("Presensi Massal Berhasil!", successMessage);
      onSuccess();
    } catch (err: any) {
      swalClose();
      swalError("Terjadi Kesalahan", err.message || "Gagal memproses data presensi.");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-transparent overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_40px_rgba(16,185,129,0.12)] overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Luminous Ambient Mesh Gradient Orbs (True Glassmorphism) */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/20 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-88 h-88 bg-teal-500/15 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-emerald-500/[0.04] dark:from-white/[0.03] dark:to-transparent pointer-events-none" />

        {/* Frosted Glass Header */}
        <div className="sticky top-0 z-20 px-6 py-5 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/50 dark:border-white/10 flex items-start justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
              <Users className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Presensi Massal Guru
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {count} Guru Terpilih
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tanggal Presensi: <strong className="text-foreground">{formatDateDisplay(dateStr)}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body with custom sleek scrollbar */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Selected Teachers Hero Strip */}
          <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-white/[0.03] backdrop-blur-md border border-white/60 dark:border-white/10 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {/* Micro Avatar Stack */}
                <div className="flex -space-x-2 overflow-hidden shrink-0">
                  {selectedTeachers.slice(0, 4).map((t, i) => (
                    <div
                      key={t.id}
                      className="inline-flex items-center justify-center size-7 rounded-full ring-2 ring-card bg-gradient-to-br from-emerald-500/80 to-teal-700 text-[10px] font-bold text-white shadow-2xs uppercase"
                    >
                      {t.name.trim().charAt(0) || "G"}
                    </div>
                  ))}
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground">
                    {count} Guru Siap Diproses
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-2 hidden sm:inline">
                    (Semua guru yang dipilih pada tabel)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAllTeachers(!showAllTeachers)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
              >
                <span>{showAllTeachers ? "Sembunyikan" : `Lihat Semua (${count})`}</span>
                {showAllTeachers ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {/* Pill chips with cleaned trailing commas */}
            <div className={`flex flex-wrap gap-1.5 transition-all ${showAllTeachers ? "max-h-48 overflow-y-auto pr-1" : "max-h-16 overflow-hidden"}`}>
              {selectedTeachers.map((teacher) => {
                // Clean trailing comma e.g. "AFWAH S.Ag," -> "AFWAH S.Ag"
                const cleanName = teacher.name.replace(/,\s*$/, "");
                return (
                  <span
                    key={teacher.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-xs font-medium text-foreground shadow-2xs hover:border-emerald-500/40 transition-colors"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="truncate max-w-[160px]">{cleanName}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* 1. Pilih Status Presensi Massal (Balanced 5-Card Layout) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Pilih Status Presensi Massal</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Pilih salah satu status kehadiran</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    className={`relative flex flex-col p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer backdrop-blur-md ${
                      isSelected
                        ? opt.activeBorderClass
                        : "border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/40 hover:bg-white/85 dark:hover:bg-slate-800/70 hover:border-emerald-500/40 hover:-translate-y-0.5 text-foreground shadow-xs"
                    }`}
                  >
                    {/* Selected Badge Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="size-2.5 stroke-[3]" />
                      </div>
                    )}

                    <div className={`size-8 rounded-xl flex items-center justify-center mb-2 shrink-0 ${opt.accentBg}`}>
                      <Icon className="size-4.5" />
                    </div>

                    <span className="text-xs font-bold leading-tight line-clamp-1">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">
                      {opt.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Waktu & Variasi Kehadiran (Natural Jitter & 24h Time Inputs) */}
          {(status === "PRESENT" || status === "LATE") && (
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-white/50 dark:via-slate-900/50 to-teal-500/[0.06] backdrop-blur-xl space-y-4 shadow-sm">
              {/* Header row with Switch Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/60 dark:border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                    <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>2. Waktu & Variasi Kehadiran</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                    Hari {daySchedule.dayName} (Pulang: {formatIndoTime(daySchedule.checkOutTime)} WIB)
                  </span>
                </div>

                {/* Animated iOS-style Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={randomizeTime}
                  onClick={() => setRandomizeTime(!randomizeTime)}
                  className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer shadow-2xs ${
                    randomizeTime
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                      : "bg-card border-border text-muted-foreground hover:bg-muted font-medium"
                  }`}
                >
                  <Sparkles className={`size-3.5 ${randomizeTime ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-muted-foreground"}`} />
                  <span className="text-xs">Acak Jam Alami (Bervariasi di PDF)</span>
                  <div
                    className={`w-7.5 h-4.5 rounded-full transition-colors relative p-0.5 flex items-center ${
                      randomizeTime ? "bg-emerald-600" : "bg-muted-foreground/30"
                    }`}
                  >
                    <div
                      className={`size-3.5 rounded-full bg-white shadow-xs transform transition-transform ${
                        randomizeTime ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Quick Preset Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/60 dark:border-white/10">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-1">
                  <Zap className="size-3.5 text-amber-500" />
                  Preset Cepat Jam Pulang:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset("mon_thu")}
                    className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                      checkOutTime === "14:30"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white/70 dark:bg-slate-800/70 border-white/60 dark:border-white/10 text-foreground hover:bg-white"
                    }`}
                  >
                    Senin - Kamis (14.30)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("fri")}
                    className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                      checkOutTime === "11:30"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white/70 dark:bg-slate-800/70 border-white/60 dark:border-white/10 text-foreground hover:bg-white"
                    }`}
                  >
                    Jumat (11.30)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("sat")}
                    className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                      checkOutTime === "15:00"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white/70 dark:bg-slate-800/70 border-white/60 dark:border-white/10 text-foreground hover:bg-white"
                    }`}
                  >
                    Sabtu (15.00)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("madrasah")}
                    className="text-xs px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold hover:bg-emerald-500/25 transition-all cursor-pointer"
                  >
                    Sesuai Jadwal ({formatIndoTime(daySchedule.checkOutTime)})
                  </button>
                </div>
              </div>

              {randomizeTime ? (
                <div className="space-y-3.5">
                  {/* Mode Alami Banner */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/25 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5 shadow-2xs">
                    <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Mode Alami Aktif:</strong> Jam presensi setiap guru diacak otomatis dalam rentang waktu di bawah dengan detik unik (contoh: <em>{checkInTimeStart}:24, {checkInTimeEnd}:49</em>). Di laporan PDF / F4 Kemenag terlihat rapi dan alami seperti presensi mandiri.
                    </span>
                  </div>

                  {/* 24-Hour Time Range Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Jam Masuk */}
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          Rentang Jam Masuk (Acak)
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          Scan Pagi
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <TimeInput24h
                          value={checkInTimeStart}
                          onChange={setCheckInTimeStart}
                        />
                        <span className="text-xs font-bold text-muted-foreground/80">s/d</span>
                        <TimeInput24h
                          value={checkInTimeEnd}
                          onChange={setCheckInTimeEnd}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Tiap guru mendapat menit & detik berbeda dalam rentang waktu di atas.
                      </p>
                    </div>

                    {/* Jam Pulang */}
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className={`size-2 rounded-full ${setCheckOut ? "bg-teal-500" : "bg-muted-foreground/40"}`} />
                          Rentang Jam Pulang
                        </span>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setCheckOut}
                            onChange={(e) => setSetCheckOut(e.target.checked)}
                            className="size-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>Sertakan Pulang</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <TimeInput24h
                          value={checkOutTimeStart}
                          disabled={!setCheckOut}
                          onChange={setCheckOutTimeStart}
                        />
                        <span className="text-xs font-bold text-muted-foreground/80">s/d</span>
                        <TimeInput24h
                          value={checkOutTimeEnd}
                          disabled={!setCheckOut}
                          onChange={setCheckOutTimeEnd}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {setCheckOut
                          ? `Jam pulang diacak alami (rekomendasi: ${formatIndoTime(checkOutTime)} WIB).`
                          : "Jam pulang tidak dicatat (hanya presensi masuk)."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Seragam / Fixed Uniform Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-xs space-y-2.5">
                    <label className="block text-xs font-bold text-foreground">
                      Jam Masuk Seragam <span className="text-rose-500">*</span>
                    </label>
                    <TimeInput24h
                      value={checkInTime}
                      onChange={handleCheckInTimeChange}
                    />
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-tight">
                      Perhatian: Seluruh guru terpilih akan memiliki jam masuk yang sama persis ({formatIndoTime(checkInTime)} WIB).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">
                        Jam Pulang Seragam
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setCheckOut}
                          onChange={(e) => setSetCheckOut(e.target.checked)}
                          className="size-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Sertakan Pulang</span>
                      </label>
                    </div>
                    <TimeInput24h
                      value={checkOutTime}
                      disabled={!setCheckOut}
                      onChange={handleCheckOutTimeChange}
                    />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {setCheckOut
                        ? `Akan mencatat jam pulang seragam ${formatIndoTime(checkOutTime)} WIB.`
                        : "Check-out tidak dicatat."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Catatan / Alasan Dispensasi */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                <span>3. Catatan / Keterangan Dispensasi</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">Opsional</span>
            </div>

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => handleQuickNote(tmpl)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer backdrop-blur-xs ${
                    notes === tmpl
                      ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                      : "bg-white/60 dark:bg-slate-800/40 border-white/60 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/80"
                  }`}
                >
                  + {tmpl}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kosongkan catatan jika ingin kolom keterangan di cetakan PDF tetap bersih (seperti presensi mandiri biasa)."
              className="w-full p-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs placeholder:text-muted-foreground transition-all"
            />
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="size-3.5 text-muted-foreground/70 shrink-0" />
              Tip: Jika dikosongkan, di laporan cetak PDF tidak akan ada tulisan &apos;Presensi Operator&apos;.
            </span>
          </div>

          {/* 4. Aturan Penimpaan Data (Proteksi Absensi) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>4. Aturan Penimpaan Data (Proteksi Absensi)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                onClick={() => setOverwriteExisting(true)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                  overwriteExisting
                    ? "border-emerald-500 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/10 ring-2 ring-emerald-500/30 text-foreground shadow-xs"
                    : "border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 text-muted-foreground"
                }`}
              >
                <div className={`size-4.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  overwriteExisting ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/50"
                }`}>
                  {overwriteExisting && <Check className="size-3 stroke-[3]" />}
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-foreground">
                    Perbarui & Timpa Data
                    <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      Direkomendasikan
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Memperbarui kehadiran guru terpilih dengan variasi waktu scan yang baru.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setOverwriteExisting(false)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                  !overwriteExisting
                    ? "border-emerald-500 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/10 ring-2 ring-emerald-500/30 text-foreground shadow-xs"
                    : "border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 text-muted-foreground"
                }`}
              >
                <div className={`size-4.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  !overwriteExisting ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/50"
                }`}>
                  {!overwriteExisting && <Check className="size-3 stroke-[3]" />}
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-foreground">
                    Hanya Guru yang Belum Absen
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Menjaga catatan guru yang sudah hadir hari ini agar tidak terubah.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </form>

        {/* Modal Sticky Frosted Glass Footer */}
        <div className="sticky bottom-0 z-20 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/50 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{count} Guru Terpilih</span>
            <span>•</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {STATUS_OPTIONS.find((s) => s.value === status)?.label}
            </span>
            <span>•</span>
            <span>{formatDateDisplay(dateStr)}</span>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 h-10 font-semibold cursor-pointer border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/40 hover:bg-white"
            >
              Batal
            </Button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Presensi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Terapkan Presensi ({count} Guru)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
