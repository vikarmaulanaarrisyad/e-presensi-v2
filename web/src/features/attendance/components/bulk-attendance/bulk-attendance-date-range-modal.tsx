"use client";

import React, { useState, useMemo } from "react";
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
  CalendarRange,
  Info,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { bulkRecordAttendanceRangeAction } from "@/server/actions/attendance.actions";
import {
  swalLoading,
  swalSuccess,
  swalError,
  swalClose,
  swalConfirm,
} from "@/lib/swal";
import type { SelectedTeacherInfo } from "./bulk-attendance-modal";

interface BulkAttendanceDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTeachers: SelectedTeacherInfo[];
  madrasahId: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

type AttendanceStatusType = "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";

const STATUS_OPTIONS: Array<{
  value: AttendanceStatusType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeBorderClass: string;
}> = [
  {
    value: "PRESENT",
    label: "Hadir Tepat Waktu",
    description: "Kehadiran fisik sesuai jam operasional madrasah",
    icon: CheckCircle2,
    colorClass: "text-emerald-500",
    activeBorderClass:
      "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30",
  },
  {
    value: "LATE",
    label: "Terlambat",
    description: "Hadir melewati batas toleransi keterlambatan",
    icon: Clock,
    colorClass: "text-amber-500",
    activeBorderClass:
      "border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30",
  },
  {
    value: "PERMIT",
    label: "Izin Dinas / Cuti",
    description: "Tugas dinas luar madrasah, workshop, atau izin resmi",
    icon: FileText,
    colorClass: "text-blue-500",
    activeBorderClass:
      "border-blue-500 bg-blue-500/10 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30",
  },
  {
    value: "SICK",
    label: "Sakit",
    description: "Berhalangan hadir dengan keterangan medis/surat sakit",
    icon: AlertTriangle,
    colorClass: "text-purple-500",
    activeBorderClass:
      "border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/30",
  },
  {
    value: "ABSENT",
    label: "Alpa / Tanpa Keterangan",
    description: "Tidak hadir dan tidak memberikan informasi keterangan",
    icon: XCircle,
    colorClass: "text-rose-500",
    activeBorderClass:
      "border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30",
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

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(isoStr: string) {
  try {
    const [y, m, d] = isoStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

/** Count working days in range considering Sunday and Saturday skip options */
function countWorkDays(
  startStr: string,
  endStr: string,
  skipSunday: boolean = true,
  skipSaturday: boolean = false
): number {
  if (!startStr || !endStr) return 0;
  const [sY, sM, sD] = startStr.split("-").map(Number);
  const [eY, eM, eD] = endStr.split("-").map(Number);
  const start = new Date(sY, sM - 1, sD);
  const end   = new Date(eY, eM - 1, eD);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay(); // 0 = Sun, 6 = Sat
    if (skipSunday && dow === 0) {
      cur.setDate(cur.getDate() + 1);
      continue;
    }
    if (skipSaturday && dow === 6) {
      cur.setDate(cur.getDate() + 1);
      continue;
    }
    count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function BulkAttendanceDateRangeModal({
  isOpen,
  onClose,
  onSuccess,
  selectedTeachers,
  madrasahId,
  defaultStartTime = "07:00",
  defaultEndTime = "14:00",
}: BulkAttendanceDateRangeModalProps) {
  const today = getTodayStr();

  // Date range
  const [startDateStr, setStartDateStr] = useState<string>(today);
  const [endDateStr, setEndDateStr]     = useState<string>(today);

  // Status
  const [status, setStatus] = useState<AttendanceStatusType>("PRESENT");

  // Time config
  const [randomizeTime, setRandomizeTime] = useState(true);
  const [checkInTime, setCheckInTime]           = useState(defaultStartTime);
  const [checkInTimeStart, setCheckInTimeStart] = useState("06:38");
  const [checkInTimeEnd, setCheckInTimeEnd]     = useState("06:56");
  const [setCheckOut, setSetCheckOut]           = useState(true);
  const [checkOutTime, setCheckOutTime]         = useState(defaultEndTime);
  const [checkOutTimeStart, setCheckOutTimeStart] = useState("14:03");
  const [checkOutTimeEnd, setCheckOutTimeEnd]     = useState("14:26");

  // Options - Sabtu default TIDAK dilewati (tetap diabsen)
  const [skipSunday, setSkipSunday]       = useState(true);
  const [skipSaturday, setSkipSaturday]   = useState(false);
  const [skipHolidays, setSkipHolidays]   = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [notes, setNotes]                 = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);

  // ALL hooks must be above early returns (Rules of Hooks)
  const count = selectedTeachers.length;

  const estimatedWorkDays = useMemo(
    () => countWorkDays(startDateStr, endDateStr, skipSunday, skipSaturday),
    [startDateStr, endDateStr, skipSunday, skipSaturday]
  );

  if (!isOpen) return null;

  const handleStatusChange = (newStatus: AttendanceStatusType) => {
    setStatus(newStatus);
    if (newStatus === "LATE") {
      setCheckInTimeStart("07:16");
      setCheckInTimeEnd("07:35");
      setCheckInTime("07:20");
    } else if (newStatus === "PRESENT") {
      setCheckInTimeStart("06:38");
      setCheckInTimeEnd("06:56");
      setCheckInTime(defaultStartTime);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (count === 0) {
      swalError("Pilih Guru Terlebih Dahulu", "Belum ada guru yang dipilih.");
      return;
    }
    if (!startDateStr || !endDateStr) {
      swalError("Tanggal Belum Diisi", "Harap isi tanggal mulai dan tanggal akhir rentang presensi.");
      return;
    }
    if (startDateStr > endDateStr) {
      swalError("Rentang Tanggal Tidak Valid", "Tanggal mulai harus sebelum atau sama dengan tanggal akhir.");
      return;
    }

    const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
    const modeDesc = randomizeTime
      ? `jam acak alami (${checkInTimeStart} – ${checkInTimeEnd} WIB)`
      : `jam seragam ${checkInTime} WIB`;

    const confirmText = `Anda akan mencatat presensi massal status "${statusLabel}" dengan ${modeDesc} untuk ${count} guru pada rentang tanggal ${formatDateDisplay(startDateStr)} s/d ${formatDateDisplay(endDateStr)} (estimasi ~${estimatedWorkDays} hari kerja). Lanjutkan?`;

    const confirmed = await swalConfirm(
      "Konfirmasi Presensi Massal Rentang Tanggal",
      confirmText,
      "Ya, Proses Sekarang",
      "Batal"
    );
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      swalLoading(
        "Memproses Presensi Massal...",
        `Sedang memproses ${count} guru selama ±${estimatedWorkDays} hari kerja. Mohon tunggu...`
      );

      const result = await bulkRecordAttendanceRangeAction({
        madrasahId,
        teacherIds: selectedTeachers.map((t) => t.id),
        startDateStr,
        endDateStr,
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
        skipSunday,
        skipSaturday,
        skipHolidays,
      });

      swalClose();
      setIsSubmitting(false);

      if (result.error) {
        swalError("Gagal Presensi Massal", result.error);
        return;
      }

      const d = result.data!;
      await swalSuccess(
        "Presensi Massal Rentang Tanggal Berhasil!",
        `Berhasil memproses ${d.totalDays} hari kerja × ${d.teacherCount} guru.\n` +
          `Dibuat baru: ${d.totalCreated} | Diperbarui: ${d.totalUpdated} | Dilewati: ${d.totalSkipped}`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      swalClose();
      setIsSubmitting(false);
      swalError("Terjadi Kesalahan", err.message || "Gagal memproses data presensi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="p-5 sm:p-6 border-b border-border/80 bg-gradient-to-r from-blue-950/10 via-card to-card flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 shadow-xs">
              <CalendarRange className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Presensi Massal Rentang Tanggal
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {count} Guru
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-500" />
                <span>
                  Proses otomatis tiap hari kerja dalam rentang tanggal yang dipilih
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── FORM BODY ── */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">

          {/* Selected teachers pill list */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">Daftar Guru Terpilih ({count}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
              {selectedTeachers.map((teacher) => (
                <span
                  key={teacher.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/70 text-xs font-medium text-foreground shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  <span className="truncate max-w-[140px]">{teacher.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 1. RENTANG TANGGAL */}
          <div className="space-y-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarRange className="size-3.5 text-blue-500" />
              <span>1. Rentang Tanggal Presensi</span>
              <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={endDateStr}
                  min={startDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  label: "Bulan Ini",
                  getRange: () => {
                    const d = new Date();
                    const y = d.getFullYear(), m = d.getMonth();
                    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
                    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
                    return { start, end };
                  },
                },
                {
                  label: "Bulan Lalu",
                  getRange: () => {
                    const d = new Date();
                    d.setDate(0); // last day of prev month
                    const y = d.getFullYear(), m = d.getMonth();
                    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
                    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    return { start, end };
                  },
                },
                {
                  label: "Minggu Ini",
                  getRange: () => {
                    const d = new Date();
                    const dow = d.getDay();
                    const mon = new Date(d);
                    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
                    const sat = new Date(mon);
                    sat.setDate(mon.getDate() + 5);
                    const fmt = (dt: Date) =>
                      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                    return { start: fmt(mon), end: fmt(sat) };
                  },
                },
                {
                  label: "Minggu Lalu",
                  getRange: () => {
                    const d = new Date();
                    const dow = d.getDay();
                    const lastSat = new Date(d);
                    lastSat.setDate(d.getDate() - (dow === 0 ? 1 : dow + 1));
                    const lastMon = new Date(lastSat);
                    lastMon.setDate(lastSat.getDate() - 5);
                    const fmt = (dt: Date) =>
                      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                    return { start: fmt(lastMon), end: fmt(lastSat) };
                  },
                },
              ].map(({ label, getRange }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const { start, end } = getRange();
                    setStartDateStr(start);
                    setEndDateStr(end);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-blue-500/30 bg-background text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 font-medium transition-all cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Range summary */}
            {startDateStr && endDateStr && startDateStr <= endDateStr && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background border border-blue-500/20 text-xs text-muted-foreground">
                <Info className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">
                    {formatDateDisplay(startDateStr)}
                  </strong>{" "}
                  s/d{" "}
                  <strong className="text-foreground">
                    {formatDateDisplay(endDateStr)}
                  </strong>
                  {" "}— estimasi{" "}
                  <strong className="text-blue-600 dark:text-blue-400">
                    ~{estimatedWorkDays} hari kerja
                  </strong>{" "}
                  × <strong>{count} guru</strong>
                </span>
              </div>
            )}

            {/* Skip options */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipSunday}
                  onChange={(e) => setSkipSunday(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Lewati Hari Minggu</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipSaturday}
                  onChange={(e) => setSkipSaturday(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Lewati Hari Sabtu</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipHolidays}
                  onChange={(e) => setSkipHolidays(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Lewati Hari Libur Resmi</span>
              </label>
            </div>
          </div>

          {/* 2. STATUS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Pilih Status Presensi</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? opt.activeBorderClass
                        : "border-border/80 bg-background hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${opt.colorClass}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{opt.label}</span>
                        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. WAKTU (PRESENT / LATE only) */}
          {(status === "PRESENT" || status === "LATE") && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  <span>3. Waktu &amp; Variasi Kehadiran</span>
                </label>
                <label className="inline-flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs font-semibold cursor-pointer shadow-2xs">
                  <input
                    type="checkbox"
                    checked={randomizeTime}
                    onChange={(e) => setRandomizeTime(e.target.checked)}
                    className="size-4 rounded border-emerald-400 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Sparkles className="size-3.5 text-emerald-600" />
                  <span>Acak Jam Alami</span>
                </label>
              </div>

              {randomizeTime ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-background/80 border border-emerald-500/20 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                    <Sparkles className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Mode Alami Aktif:</strong> Jam tiap guru
                      diacak dalam rentang yang Anda set, dengan detik unik berbeda-beda tiap hari.
                      Di laporan PDF/F4 terlihat seperti presensi mandiri.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Rentang Jam Masuk (Acak)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={checkInTimeStart}
                          onChange={(e) => setCheckInTimeStart(e.target.value)}
                          className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                        />
                        <span className="text-xs text-muted-foreground font-medium">s/d</span>
                        <input
                          type="time"
                          value={checkInTimeEnd}
                          onChange={(e) => setCheckInTimeEnd(e.target.value)}
                          className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-foreground">
                          Rentang Jam Pulang
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setCheckOut}
                            onChange={(e) => setSetCheckOut(e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                          <span>Sertakan Pulang</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={checkOutTimeStart}
                          disabled={!setCheckOut}
                          onChange={(e) => setCheckOutTimeStart(e.target.value)}
                          className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs disabled:opacity-50 disabled:bg-muted/50"
                        />
                        <span className="text-xs text-muted-foreground font-medium">s/d</span>
                        <input
                          type="time"
                          value={checkOutTimeEnd}
                          disabled={!setCheckOut}
                          onChange={(e) => setCheckOutTimeEnd(e.target.value)}
                          className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs disabled:opacity-50 disabled:bg-muted/50"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {setCheckOut
                          ? "Jam pulang juga diacak alami tiap hari"
                          : "Jam pulang tidak diisi"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Jam Masuk Seragam <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                      required
                    />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                      Semua guru & semua hari akan memiliki jam scan yang sama persis.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        Jam Pulang Seragam
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setCheckOut}
                          onChange={(e) => setSetCheckOut(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Sertakan Pulang</span>
                      </label>
                    </div>
                    <input
                      type="time"
                      value={checkOutTime}
                      disabled={!setCheckOut}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs disabled:opacity-50 disabled:bg-muted/50"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. CATATAN */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>4. Keterangan / Catatan</span>
              <span className="text-[11px] text-muted-foreground lowercase font-normal">(opsional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => setNotes(tmpl)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    notes === tmpl
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
              placeholder="Kosongkan catatan agar kolom keterangan di PDF tetap bersih (seperti presensi mandiri)."
              className="w-full p-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs placeholder:text-muted-foreground"
            />
            <span className="text-[10px] text-muted-foreground block">
              Tip: Jika dikosongkan, di laporan cetak PDF tidak ada tulisan &apos;Presensi Operator&apos;.
            </span>
          </div>

          {/* 5. ATURAN PENIMPAAN */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>5. Aturan Penimpaan Data</span>
            </label>
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="rangeOverwriteMode"
                  checked={!overwriteExisting}
                  onChange={() => setOverwriteExisting(false)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-foreground">
                    Hanya proses guru yang BELUM absen pada hari tersebut (Direkomendasikan)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Data guru yang sudah scan mandiri di mobile app tidak akan tertimpa.
                  </span>
                </div>
              </label>
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="rangeOverwriteMode"
                  checked={overwriteExisting}
                  onChange={() => setOverwriteExisting(true)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-foreground">
                    Timpa semua guru yang dipilih (meski sudah absen)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Akan memperbarui seluruh data presensi guru yang dipilih pada setiap tanggal.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-2 border-t border-border/80 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={isSubmitting}
              leftIcon={<CalendarRange className="size-4" />}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Proses {estimatedWorkDays > 0 ? `~${estimatedWorkDays} Hari` : "Rentang"} × {count} Guru
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
