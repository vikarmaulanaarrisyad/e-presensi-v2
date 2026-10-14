"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  User, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Trash2, 
  X,
  Calendar,
  MapPin,
  Zap,
  Palmtree,
  Camera,
  Maximize2,
  ExternalLink,
  Download,
  Cloud
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { singleRecordAttendanceAction, deleteAttendanceLogAction } from "@/server/actions/attendance.actions";
import { 
  parseDailySchedules, 
  getDayScheduleForDate 
} from "@/features/attendance/lib/daily-schedule-helper";
import { getOptimizedPhotoUrl, getPhotoDownloadUrl } from "@/features/attendance/lib/photo-helper";
import { 
  swalLoading, 
  swalSuccess, 
  swalError, 
  swalClose, 
  swalConfirm 
} from "@/lib/swal";
import type { TeacherWithAttendance } from "@/server/repositories/attendance.repo";

interface SingleAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacher: TeacherWithAttendance | null;
  dateStr: string;
  madrasahId: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  dailySchedules?: string | null;
  isHoliday?: boolean;
  holidayName?: string | null;
}

type AttendanceStatusType = "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT" | "DUTY";

export function SingleAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  teacher,
  dateStr,
  madrasahId,
  defaultStartTime = "07:00",
  defaultEndTime = "14:00",
  dailySchedules,
  isHoliday = false,
  holidayName = null,
}: SingleAttendanceModalProps) {
  const daySchedule = useMemo(() => {
    const allSchedules = parseDailySchedules(dailySchedules);
    return getDayScheduleForDate(dateStr, allSchedules);
  }, [dateStr, dailySchedules]);

  const [status, setStatus] = useState<AttendanceStatusType>("PRESENT");
  const [checkInTime, setCheckInTime] = useState(daySchedule.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(daySchedule.checkOutTime);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState(false);

  // Reset lightbox error when photo changes
  useEffect(() => {
    setLightboxImgError(false);
  }, [zoomedPhoto]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoomedPhoto) {
        setZoomedPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedPhoto]);

  useEffect(() => {
    setIsProcessing(false);
    if (teacher?.attendanceLog) {
      const log = teacher.attendanceLog;
      setStatus(log.status);

      if (log.checkInTime) {
        const d = new Date(log.checkInTime);
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        setCheckInTime(`${hh}:${mm}`);
      } else {
        setCheckInTime(daySchedule.checkInTime);
      }

      if (log.checkOutTime) {
        const d = new Date(log.checkOutTime);
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        setCheckOutTime(`${hh}:${mm}`);
      } else {
        setCheckOutTime(daySchedule.checkOutTime);
      }

      setNotes(log.notes || "");
    } else {
      setStatus("PRESENT");
      setCheckInTime(daySchedule.checkInTime);
      setCheckOutTime(daySchedule.checkOutTime);
      setNotes("");
    }
  }, [teacher, daySchedule]);

  if (!isOpen || !teacher) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sembunyikan modal secara visual (tetap mounted sampai server action selesai)
    setIsProcessing(true);

    try {
      swalLoading("Menyimpan Presensi Guru...", teacher.name);

      const result = await singleRecordAttendanceAction({
        madrasahId,
        userId: teacher.id,
        dateStr,
        status,
        checkInTime: status === "PRESENT" || status === "LATE" ? checkInTime : null,
        checkOutTime:
          (status === "PRESENT" || status === "LATE") && checkOutTime
            ? checkOutTime
            : null,
        notes: notes.trim() || undefined,
      });

      swalClose();

      if (result.error) {
        setIsProcessing(false);
        swalError("Gagal Menyimpan", result.error);
        return;
      }

      await swalSuccess("Berhasil Disimpan", `Presensi untuk ${teacher.name} berhasil diperbarui.`);
      onClose();
      onSuccess();
    } catch (err: any) {
      swalClose();
      setIsProcessing(false);
      swalError("Terjadi Kesalahan", err.message || "Gagal memproses data.");
    }
  };

  const handleDelete = async () => {
    if (!teacher.attendanceLog) return;

    const confirmed = await swalConfirm(
      "Hapus Data Presensi?",
      `Catatan kehadiran ${teacher.name} pada tanggal ${formatDateDisplay(dateStr)} akan dihapus. Guru akan ditandai belum presensi.`,
      "Ya, Hapus Data",
      "Batal"
    );

    if (!confirmed) return;

    // Sembunyikan modal secara visual (tetap mounted sampai server action selesai)
    setIsProcessing(true);

    try {
      swalLoading("Menghapus Data Presensi...", teacher.name);

      const res = await deleteAttendanceLogAction(teacher.attendanceLog.id, madrasahId);

      swalClose();

      if (res.error) {
        setIsProcessing(false);
        swalError("Gagal Menghapus", res.error);
        return;
      }

      await swalSuccess("Presensi Dihapus", "Catatan kehadiran guru berhasil dihapus.");
      onClose();
      onSuccess();
    } catch (err: any) {
      swalClose();
      setIsProcessing(false);
      swalError("Terjadi Kesalahan", err.message || "Gagal menghapus data.");
    }
  };

  if (isProcessing) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-transparent overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border/80 flex items-start justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {teacher.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground truncate">
                {teacher.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                NIP: {teacher.nip || "Belum diisi"}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="size-4 text-primary shrink-0" />
            <span>Tanggal: <strong>{formatDateDisplay(dateStr)}</strong></span>
          </div>

          {/* Holiday Notice Banner */}
          {isHoliday && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Palmtree className="size-4 text-amber-600 shrink-0" />
              <span>
                Tanggal ini adalah <strong>{holidayName || "Hari Libur"}</strong>. Guru bebas presensi reguler kecuali ada kegiatan dinas khusus.
              </span>
            </div>
          )}

          {/* Foto Selfie Presensi Terverifikasi (Jika ada) */}
          {Boolean(teacher.attendanceLog?.checkInPhotoUrl || teacher.attendanceLog?.checkOutPhotoUrl) && (
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Camera className="size-3.5 text-primary" />
                  <span>Foto Presensi Terverifikasi</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Klik foto untuk melihat ukuran penuh
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Foto Masuk */}
                {teacher.attendanceLog?.checkInPhotoUrl ? (
                  <div
                    onClick={() =>
                      setZoomedPhoto({
                        url: teacher.attendanceLog!.checkInPhotoUrl!,
                        title: `Foto Selfie Masuk - ${teacher.name}`,
                        subtitle: `Waktu Masuk: ${checkInTime} ${
                          teacher.attendanceLog?.checkInDistance
                            ? `• Jarak Radius: ${teacher.attendanceLog.checkInDistance.toFixed(1)} m`
                            : ""
                        }`,
                      })
                    }
                    className="relative aspect-4/3 rounded-lg overflow-hidden border border-border/80 bg-black/5 dark:bg-white/5 group cursor-pointer shadow-2xs"
                  >
                    <img
                      src={getOptimizedPhotoUrl(teacher.attendanceLog.checkInPhotoUrl)}
                      alt="Foto Masuk"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-semibold text-white backdrop-blur-2xs">
                      Masuk
                    </div>
                    {(teacher.attendanceLog.checkInPhotoUrl.includes("googleusercontent.com") ||
                      teacher.attendanceLog.checkInPhotoUrl.includes("drive.google.com")) && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-0.5">
                        <Cloud className="size-2.5" />
                        <span>Drive</span>
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Maximize2 className="size-4" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-4/3 rounded-lg border border-dashed border-border flex flex-col items-center justify-center p-2 text-center bg-muted/10">
                    <span className="text-[11px] text-muted-foreground">
                      Tanpa Foto Masuk
                    </span>
                  </div>
                )}

                {/* Foto Pulang */}
                {teacher.attendanceLog?.checkOutPhotoUrl ? (
                  <div
                    onClick={() =>
                      setZoomedPhoto({
                        url: teacher.attendanceLog!.checkOutPhotoUrl!,
                        title: `Foto Selfie Pulang - ${teacher.name}`,
                        subtitle: `Waktu Pulang: ${checkOutTime || "-"}`,
                      })
                    }
                    className="relative aspect-4/3 rounded-lg overflow-hidden border border-border/80 bg-black/5 dark:bg-white/5 group cursor-pointer shadow-2xs"
                  >
                    <img
                      src={getOptimizedPhotoUrl(teacher.attendanceLog.checkOutPhotoUrl)}
                      alt="Foto Pulang"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-semibold text-white backdrop-blur-2xs">
                      Pulang
                    </div>
                    {(teacher.attendanceLog.checkOutPhotoUrl.includes("googleusercontent.com") ||
                      teacher.attendanceLog.checkOutPhotoUrl.includes("drive.google.com")) && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-0.5">
                        <Cloud className="size-2.5" />
                        <span>Drive</span>
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Maximize2 className="size-4" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-4/3 rounded-lg border border-dashed border-border flex flex-col items-center justify-center p-2 text-center bg-muted/10">
                    <span className="text-[11px] text-muted-foreground">
                      {teacher.attendanceLog?.checkOutTime ? "Pulang Tanpa Foto" : "Belum Foto Pulang"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Status Kehadiran
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatusType)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
            >
              <option value="PRESENT">Hadir Tepat Waktu (PRESENT)</option>
              <option value="LATE">Terlambat (LATE)</option>
              <option value="DUTY">💼 Dinas Luar / Perjalanan Dinas (DUTY)</option>
              <option value="PERMIT">Izin Keperluan / Cuti (PERMIT)</option>
              <option value="SICK">Sakit (SICK)</option>
              <option value="ABSENT">Alpa / Tanpa Keterangan (ABSENT)</option>
            </select>
          </div>

          {/* Time inputs for PRESENT & LATE */}
          {(status === "PRESENT" || status === "LATE") && (
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Waktu Kehadiran:</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Hari {daySchedule.dayName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Jam Masuk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder="Opsional"
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Zap className="size-3 text-amber-500" />
                  Preset Pulang:
                </span>
                <button
                  type="button"
                  onClick={() => setCheckOutTime("14:30")}
                  className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                    checkOutTime === "14:30"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border/80 text-foreground hover:bg-muted"
                  }`}
                >
                  Senin-Kamis (14.30)
                </button>
                <button
                  type="button"
                  onClick={() => setCheckOutTime("11:30")}
                  className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                    checkOutTime === "11:30"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border/80 text-foreground hover:bg-muted"
                  }`}
                >
                  Jumat (11.30)
                </button>
                <button
                  type="button"
                  onClick={() => setCheckOutTime("15:00")}
                  className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                    checkOutTime === "15:00"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border/80 text-foreground hover:bg-muted"
                  }`}
                >
                  Sabtu (15.00)
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Keterangan / Catatan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan keterangan..."
              className="w-full p-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2">
            {teacher.attendanceLog ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                leftIcon={<Trash2 className="size-3.5" />}
              >
                Hapus
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="size-3.5" />}
              >
                Simpan
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {zoomedPhoto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setZoomedPhoto(null)}
        >
          {/* Lightbox Topbar */}
          <div
            className="flex items-center justify-between text-white border-b border-white/10 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {zoomedPhoto.title}
              </h3>
              {zoomedPhoto.subtitle && (
                <p className="text-xs text-white/70 mt-0.5">
                  {zoomedPhoto.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getOptimizedPhotoUrl(zoomedPhoto.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Buka Foto Asli di Tab Baru"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Buka Asli</span>
              </a>

              <a
                href={getPhotoDownloadUrl(zoomedPhoto.url)}
                download={`presensi-${Date.now()}.jpg`}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh Gambar"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Unduh</span>
              </a>

              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Tutup (ESC)"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            {lightboxImgError ? (
              <div 
                className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-2xl max-w-md text-center gap-3 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertTriangle className="size-10 text-amber-400" />
                <h4 className="text-white font-bold text-sm">Gagal Menampilkan Foto</h4>
                <p className="text-white/70 text-xs leading-relaxed">
                  Gambar tidak dapat dimuat secara langsung karena pembatasan akses atau kendala jaringan.
                </p>
                <a
                  href={getOptimizedPhotoUrl(zoomedPhoto.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mt-2"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Buka Gambar di Tab Baru</span>
                </a>
              </div>
            ) : (
              <img
                src={getOptimizedPhotoUrl(zoomedPhoto.url)}
                alt={zoomedPhoto.title}
                referrerPolicy="no-referrer"
                onError={() => setLightboxImgError(true)}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
              />
            )}
          </div>

          {/* Lightbox Footer */}
          <div className="text-center text-xs text-white/60 pt-2 border-t border-white/10">
            Klik area gelap atau tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/90 font-mono">ESC</kbd> untuk menutup tampilan penuh.
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
