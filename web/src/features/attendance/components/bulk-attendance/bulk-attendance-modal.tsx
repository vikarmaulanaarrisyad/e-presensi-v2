"use client";

import React, { useState } from "react";
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
  HelpCircle,
  ShieldCheck,
  Check
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { bulkRecordAttendanceAction } from "@/server/actions/attendance.actions";
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
}

type AttendanceStatusType = "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";

const STATUS_OPTIONS: Array<{
  value: AttendanceStatusType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeBorderClass: string;
  badgeBg: string;
}> = [
  {
    value: "PRESENT",
    label: "Hadir Tepat Waktu",
    description: "Kehadiran fisik sesuai jam operasional madrasah",
    icon: CheckCircle2,
    colorClass: "text-emerald-500",
    activeBorderClass: "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/30",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    value: "LATE",
    label: "Terlambat",
    description: "Hadir melewati batas toleransi keterlambatan",
    icon: Clock,
    colorClass: "text-amber-500",
    activeBorderClass: "border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    value: "PERMIT",
    label: "Izin Dinas / Cuti",
    description: "Tugas dinas luar madrasah, workshop, atau izin resmi",
    icon: FileText,
    colorClass: "text-blue-500",
    activeBorderClass: "border-blue-500 bg-blue-500/10 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/30",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    value: "SICK",
    label: "Sakit",
    description: "Berhalangan hadir dengan keterangan medis/surat sakit",
    icon: AlertTriangle,
    colorClass: "text-purple-500",
    activeBorderClass: "border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/30",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  {
    value: "ABSENT",
    label: "Alpa / Tanpa Keterangan",
    description: "Tidak hadir dan tidak memberikan informasi keterangan",
    icon: XCircle,
    colorClass: "text-rose-500",
    activeBorderClass: "border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30",
    badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
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

export function BulkAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  selectedTeachers,
  dateStr,
  madrasahId,
  defaultStartTime = "07:00",
  defaultEndTime = "14:00",
}: BulkAttendanceModalProps) {
  const [status, setStatus] = useState<AttendanceStatusType>("PRESENT");
  const [randomizeTime, setRandomizeTime] = useState(true);
  const [checkInTime, setCheckInTime] = useState(defaultStartTime);
  const [checkInTimeStart, setCheckInTimeStart] = useState("06:38");
  const [checkInTimeEnd, setCheckInTimeEnd] = useState("06:56");
  const [setCheckOut, setSetCheckOut] = useState(false);
  const [checkOutTime, setCheckOutTime] = useState(defaultEndTime);
  const [checkOutTimeStart, setCheckOutTimeStart] = useState("14:03");
  const [checkOutTimeEnd, setCheckOutTimeEnd] = useState("14:26");
  const [notes, setNotes] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const count = selectedTeachers.length;

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
      ? `dengan jam acak alami (${checkInTimeStart} - ${checkInTimeEnd} WIB)`
      : `pada jam seragam ${checkInTime} WIB`;
    const confirmText = `Anda akan mencatat presensi massal status "${statusLabel}" ${modeDesc} untuk ${count} guru pada ${formatDateDisplay(dateStr)}. Lanjutkan?`;

    const confirmed = await swalConfirm(
      "Konfirmasi Presensi Massal",
      confirmText,
      "Ya, Simpan Presensi",
      "Batal"
    );

    if (!confirmed) return;

    try {
      setIsSubmitting(true);
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
      setIsSubmitting(false);

      if (result.error) {
        swalError("Gagal Mencatat Presensi", result.error);
        return;
      }

      const resData = result.data;
      const successMessage = resData?.skippedCount && resData.skippedCount > 0
        ? `Berhasil memproses ${resData.processedCount} guru (${resData.createdCount} baru, ${resData.updatedCount} diperbarui, ${resData.skippedCount} dilewati karena sudah absen).`
        : `Berhasil mencatat presensi massal untuk ${resData?.processedCount || count} guru dengan jam bervariasi.`;

      await swalSuccess("Presensi Massal Berhasil!", successMessage);
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
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border/80 bg-gradient-to-r from-emerald-950/10 via-card to-card flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Users className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  Presensi Massal Guru
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {count} Guru Terpilih
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Tanggal: <strong>{formatDateDisplay(dateStr)}</strong></span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Selected Teachers Preview Pills */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">Daftar Guru Terpilih ({count}):</span>
              <span className="text-[11px]">Semua institusi</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedTeachers.map((teacher) => (
                <span
                  key={teacher.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/70 text-xs font-medium text-foreground shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[140px]">{teacher.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 1. Status Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Pilih Status Presensi Massal</span>
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

          {/* 2. Jam Masuk & Jam Pulang dengan Fitur Variasi Waktu Acak Alami */}
          {(status === "PRESENT" || status === "LATE") && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  <span>2. Waktu & Variasi Kehadiran</span>
                </label>

                {/* Randomize Time Toggle */}
                <label className="inline-flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs font-semibold cursor-pointer shadow-2xs">
                  <input
                    type="checkbox"
                    checked={randomizeTime}
                    onChange={(e) => setRandomizeTime(e.target.checked)}
                    className="size-4 rounded border-emerald-400 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Sparkles className="size-3.5 text-emerald-600" />
                  <span>Acak Jam Alami (Biar Bervariasi di PDF)</span>
                </label>
              </div>

              {randomizeTime ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-background/80 border border-emerald-500/20 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                    <Sparkles className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Mode Alami Aktif:</strong> Jam presensi setiap guru akan diacak otomatis dalam rentang waktu di bawah dengan detik unik (contoh: <em>06:41:22, 06:48:15, 06:53:40</em>). Saat dicetak di laporan PDF / F4 Kemenag, waktu kehadiran terlihat alami seperti presensi mandiri.
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
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        Tiap guru mendapat menit & detik berbeda dalam rentang ini
                      </span>
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
                        {setCheckOut ? "Jam pulang juga diacak alami dengan menit & detik berbeda" : "Jam pulang tidak diisi"}
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
                      Perhatian: Seluruh guru terpilih akan memiliki jam scan yang sama persis ({checkInTime} WIB).
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
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {setCheckOut ? "Akan langsung menandai jam pulang seragam" : "Check-out tidak diisi"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Catatan / Alasan Dispensasi */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>3. Keterangan / Catatan Alasan</span>
              <span className="text-[11px] text-muted-foreground lowercase font-normal">(opsional)</span>
            </label>

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => handleQuickNote(tmpl)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    notes === tmpl
                      ? "bg-primary text-primary-foreground border-primary font-medium shadow-2xs"
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
              placeholder="Kosongkan catatan jika ingin kolom keterangan di cetakan PDF tetap bersih (seperti presensi mandiri biasa)."
              className="w-full p-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs placeholder:text-muted-foreground"
            />
            <span className="text-[10px] text-muted-foreground block">
              Tip: Jika dikosongkan, di laporan cetak PDF tidak akan ada tulisan &apos;Presensi Operator&apos;.
            </span>
          </div>

          {/* 4. Mode Penanganan Guru yang Sudah Absen */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>4. Aturan Penimpaan Data (Proteksi Absensi)</span>
            </label>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="overwriteMode"
                  checked={!overwriteExisting}
                  onChange={() => setOverwriteExisting(false)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-foreground">
                    Hanya proses guru yang BELUM absen (Direkomendasikan)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Menjaga data guru yang sudah melakukan scan mandiri di mobile app agar tidak tertimpa.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="overwriteMode"
                  checked={overwriteExisting}
                  onChange={() => setOverwriteExisting(true)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-foreground">
                    Perbarui / Timpa semua guru yang dipilih
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Akan memperbarui data presensi guru yang dipilih meskipun sudah memiliki catatan kehadiran pada tanggal ini.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-border/80 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="size-4" />}
            >
              Terapkan Presensi ({count} Guru)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
