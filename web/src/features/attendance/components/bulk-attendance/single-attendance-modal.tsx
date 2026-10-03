"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Zap
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { singleRecordAttendanceAction, deleteAttendanceLogAction } from "@/server/actions/attendance.actions";
import { 
  parseDailySchedules, 
  getDayScheduleForDate 
} from "@/features/attendance/lib/daily-schedule-helper";
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
}

type AttendanceStatusType = "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";

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

  useEffect(() => {
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

    try {
      setIsSubmitting(true);
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
      setIsSubmitting(false);

      if (result.error) {
        swalError("Gagal Menyimpan", result.error);
        return;
      }

      await swalSuccess("Berhasil Disimpan", `Presensi untuk ${teacher.name} berhasil diperbarui.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      swalClose();
      setIsSubmitting(false);
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

    try {
      setIsSubmitting(true);
      swalLoading("Menghapus Data Presensi...", teacher.name);

      const res = await deleteAttendanceLogAction(teacher.attendanceLog.id, madrasahId);

      swalClose();
      setIsSubmitting(false);

      if (res.error) {
        swalError("Gagal Menghapus", res.error);
        return;
      }

      await swalSuccess("Presensi Dihapus", "Catatan kehadiran guru berhasil dihapus.");
      onSuccess();
      onClose();
    } catch (err: any) {
      swalClose();
      setIsSubmitting(false);
      swalError("Terjadi Kesalahan", err.message || "Gagal menghapus data.");
    }
  };

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
              <option value="PERMIT">Izin Dinas / Cuti (PERMIT)</option>
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
    </div>
  );
}
