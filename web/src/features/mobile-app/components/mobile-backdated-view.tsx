"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Camera,
  Upload,
  Check,
  Sparkles,
  Info,
  Calendar,
  X
} from "lucide-react";
import {
  recordMobileAttendanceAction,
  getTeacherAttendanceForDateAction,
} from "@/server/actions/mobile-attendance.actions";
import { swalSuccess, swalError, swalLoading, swalClose } from "@/lib/swal";

interface MobileBackdatedViewProps {
  data: {
    teacher: {
      id: string;
      name: string;
      nip: string;
      email: string;
      phone: string;
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
  };
  onSuccess?: () => void;
}

export function MobileBackdatedView({ data, onSuccess }: MobileBackdatedViewProps) {
  const router = useRouter();
  const { teacher, settings } = data;

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
  const [backdatedOutTime, setBackdatedOutTime] = useState<string>(settings.workEndTime || "14:30");
  const [backdatedNotes, setBackdatedNotes] = useState<string>("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [existingDateLog, setExistingDateLog] = useState<any>(null);
  const [dateHolidayInfo, setDateHolidayInfo] = useState<string | null>(null);
  const [isCheckingDateStatus, setIsCheckingDateStatus] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check existing attendance on target date whenever date changes
  useEffect(() => {
    let isCancelled = false;

    const checkDateStatus = async () => {
      if (!backdatedDate) return;
      setIsCheckingDateStatus(true);
      try {
        const res = await getTeacherAttendanceForDateAction(teacher.id, backdatedDate);
        if (!isCancelled && res?.success) {
          setExistingDateLog(res.log || null);
          setDateHolidayInfo(res.holiday?.name || null);
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setIsCheckingDateStatus(false);
      }
    };

    checkDateStatus();

    return () => {
      isCancelled = true;
    };
  }, [backdatedDate, teacher.id]);

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      swalError("Ukuran Terlalu Besar", "Ukuran foto maksimal adalah 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!backdatedDate) {
      swalError("Pilih Tanggal", "Silakan pilih tanggal presensi terlebih dahulu.");
      return;
    }

    if (!backdatedNotes.trim()) {
      swalError("Isi Keterangan", "Mohon isi alasan atau keterangan presensi susulan.");
      return;
    }

    setIsSubmitting(true);
    swalLoading("Menyimpan Presensi Susulan...", "Sedang mencatat ke server...");

    try {
      const res = await recordMobileAttendanceAction({
        userId: teacher.id,
        type: backdatedType,
        dateStr: backdatedDate,
        customCheckInTime: (backdatedType === "FULL" || backdatedType === "CHECK_IN") ? backdatedInTime : undefined,
        customCheckOutTime: (backdatedType === "FULL" || backdatedType === "CHECK_OUT") ? backdatedOutTime : undefined,
        lat: settings.latitude,
        lng: settings.longitude,
        distance: 0,
        notes: backdatedNotes.trim(),
        photoBase64: photoBase64 || undefined,
      });

      swalClose();

      if (res?.error) {
        swalError("Gagal Mencatat", res.error);
        setIsSubmitting(false);
        return;
      }

      await swalSuccess(
        "Presensi Berhasil Dicatat!",
        res?.message || `Data presensi untuk tanggal ${backdatedDate} telah berhasil disimpan.`,
        2200
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/guru");
        router.refresh();
      }
    } catch {
      swalClose();
      swalError("Kesalahan Server", "Gagal menghubungi database. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  // Calculate work duration
  const calculateWorkDuration = () => {
    if (backdatedType !== "FULL") return null;
    try {
      const [inH, inM] = backdatedInTime.split(":").map(Number);
      const [outH, outM] = backdatedOutTime.split(":").map(Number);
      const diffMins = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMins <= 0) return "Waktu pulang harus lebih akhir dari masuk";
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      return `${h} jam ${m > 0 ? `${m} menit` : ""}`;
    } catch {
      return null;
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-[#f8f9ff] text-[#0b1c30] select-none"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── TOP APP BAR ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5eeff] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/guru")}
            className="w-9 h-9 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-[#0b1c30] leading-tight">
              Presensi Tanggal Terlewat
            </h1>
            <p className="text-[11px] text-[#444653]">
              Catat kehadiran susulan mandiri guru
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Setting Kustom</span>
        </div>
      </header>

      {/* ── MAIN CONTENT SCROLLABLE FORM ── */}
      <main className="flex-1 p-4 pb-28 max-w-lg mx-auto w-full flex flex-col gap-4">
        {/* Banner Info */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-[13px] font-bold">Atur Jam Scan Masuk & Pulang</span>
            <p className="text-[11px] text-emerald-100 leading-relaxed">
              Anda dapat menyetel sendiri waktu scan masuk, scan keluar, atau keduanya untuk tanggal yang sempat terlewat.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── 1. PILIH TANGGAL ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-3">
            <label className="text-[12px] font-bold text-[#0b1c30] flex items-center justify-between">
              <span>1. Pilih Tanggal Presensi</span>
              <span className="text-[11px] text-emerald-700 font-semibold">Maksimal Kemarin</span>
            </label>

            {/* Quick Chips */}
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
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
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

            {/* Date Picker Input */}
            <div className="relative">
              <input
                type="date"
                max={getYesterdayDateString()}
                value={backdatedDate}
                onChange={(e) => setBackdatedDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-[#f8f9ff] text-[#0b1c30] text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              />
            </div>

            {/* Status Tanggal Terpilih */}
            <div className="rounded-xl border p-3 flex flex-col gap-1.5 bg-[#f8f9ff] border-[#dde1ff]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#444653] uppercase tracking-wide">
                  Status Database Pada Tanggal Ini:
                </span>
                {isCheckingDateStatus && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Memeriksa...</span>
                  </div>
                )}
              </div>

              {dateHolidayInfo && (
                <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
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
                      Catatan sebelumnya: {existingDateLog.notes}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-orange-800 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200">
                  Belum ada presensi tercatat (Alpa). Anda dapat mengisi jam masuk dan jam pulang susulan.
                </div>
              )}
            </div>
          </div>

          {/* ── 2. JENIS SCAN PRESENSI ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-3">
            <label className="text-[12px] font-bold text-[#0b1c30]">
              2. Pilih Jenis Scan Yang Ingin Disetel
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBackdatedType("FULL")}
                className={`py-3 px-2 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                  backdatedType === "FULL"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/30"
                    : "bg-white text-[#444653] border-[#dde1ff] hover:bg-[#eff4ff]"
                }`}
              >
                <span className="text-[14px]">⚡</span>
                <span className="leading-tight">Masuk & Pulang</span>
                <span className="text-[9px] opacity-80 font-normal">Setting Lengkap</span>
              </button>

              <button
                type="button"
                onClick={() => setBackdatedType("CHECK_IN")}
                className={`py-3 px-2 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                  backdatedType === "CHECK_IN"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/30"
                    : "bg-white text-[#444653] border-[#dde1ff] hover:bg-[#eff4ff]"
                }`}
              >
                <span className="text-[14px]">🌅</span>
                <span className="leading-tight">Scan Masuk</span>
                <span className="text-[9px] opacity-80 font-normal">Jam Masuk Saja</span>
              </button>

              <button
                type="button"
                onClick={() => setBackdatedType("CHECK_OUT")}
                className={`py-3 px-2 rounded-xl text-[11px] font-bold transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                  backdatedType === "CHECK_OUT"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/30"
                    : "bg-white text-[#444653] border-[#dde1ff] hover:bg-[#eff4ff]"
                }`}
              >
                <span className="text-[14px]">🌇</span>
                <span className="leading-tight">Scan Keluar</span>
                <span className="text-[9px] opacity-80 font-normal">Jam Pulang Saja</span>
              </button>
            </div>
          </div>

          {/* ── 3. SETTING JAM MASUK / KELUAR MANDIRI ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#0b1c30]">
                3. Atur Jam Presensi Sendiri
              </label>
              {calculateWorkDuration() && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Durasi: {calculateWorkDuration()}
                </span>
              )}
            </div>

            {/* Setting Jam Masuk */}
            {(backdatedType === "FULL" || backdatedType === "CHECK_IN") && (
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#f8f9ff] border border-[#dde1ff]">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Scan Masuk (Jam Masuk):</span>
                  </label>
                  <span className="text-[11px] text-[#444653]">Format: HH:MM</span>
                </div>

                <input
                  type="time"
                  required
                  value={backdatedInTime}
                  onChange={(e) => setBackdatedInTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#cbd5e1] bg-white text-[#0b1c30] text-[16px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                {/* Preset Chips Jam Masuk */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#444653] font-semibold">Pilih Cepat:</span>
                  {[
                    { label: "06:30 (Awal)", val: "06:30" },
                    { label: "06:45", val: "06:45" },
                    { label: "07:00 (Jadwal)", val: "07:00" },
                    { label: "07:15 (Toleransi)", val: "07:15" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setBackdatedInTime(p.val)}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        backdatedInTime === p.val
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-[#00288e] border-[#dde1ff] hover:bg-[#eff4ff]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Setting Jam Keluar / Pulang */}
            {(backdatedType === "FULL" || backdatedType === "CHECK_OUT") && (
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#f8f9ff] border border-[#dde1ff]">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Scan Keluar (Jam Pulang):</span>
                  </label>
                  <span className="text-[11px] text-[#444653]">Format: HH:MM</span>
                </div>

                <input
                  type="time"
                  required
                  value={backdatedOutTime}
                  onChange={(e) => setBackdatedOutTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#cbd5e1] bg-white text-[#0b1c30] text-[16px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                {/* Preset Chips Jam Keluar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#444653] font-semibold">Pilih Cepat:</span>
                  {[
                    { label: "14:00", val: "14:00" },
                    { label: "14:30 (Jadwal)", val: "14:30" },
                    { label: "15:00", val: "15:00" },
                    { label: "16:00 (Lembur)", val: "16:00" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setBackdatedOutTime(p.val)}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        backdatedOutTime === p.val
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-[#00288e] border-[#dde1ff] hover:bg-[#eff4ff]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 4. ALASAN / KETERANGAN ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-2.5">
            <label className="text-[12px] font-bold text-[#0b1c30]">
              4. Alasan / Keterangan Terlewat
            </label>

            <div className="flex flex-wrap gap-1.5">
              {[
                "Lupa absen saat kegiatan dinas",
                "Kendala jaringan / server madrasah",
                "Tugas dinas luar / rapat dinas",
                "Mendampingi kegiatan lomba siswa",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBackdatedNotes(preset)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#00288e] border border-[#dde1ff] hover:bg-[#dce9ff] transition-colors cursor-pointer font-medium"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              required
              placeholder="Tuliskan keterangan detail alasan presensi susulan..."
              value={backdatedNotes}
              onChange={(e) => setBackdatedNotes(e.target.value)}
              className="mt-1 px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[#0b1c30] text-[12px] focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* ── 5. LAMPIRAN FOTO BUKTI (OPSIONAL) ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-2.5">
            <label className="text-[12px] font-bold text-[#0b1c30] flex items-center justify-between">
              <span>5. Foto Bukti Kegiatan (Opsional)</span>
              <span className="text-[10px] text-[#444653] font-normal">Kamera / Galeri</span>
            </label>

            {photoBase64 ? (
              <div className="relative rounded-xl overflow-hidden border border-[#dde1ff] max-h-48 flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoBase64}
                  alt="Bukti Presensi"
                  className="w-full h-auto object-contain max-h-48"
                />
                <button
                  type="button"
                  onClick={() => setPhotoBase64(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#dde1ff] hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-[#f8f9ff] hover:bg-[#eff4ff] transition-all">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-[12px] font-bold text-[#0b1c30]">Ambil Foto / Unggah Bukti</span>
                <span className="text-[10px] text-[#444653]">Format JPG / PNG maksimal 5MB</span>
              </label>
            )}
          </div>

          {/* Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-[#eff4ff] border border-[#dde1ff] flex items-center gap-2.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[#444653] leading-relaxed">
              Presensi susulan terverifikasi secara resmi dengan profil GTK <strong>{teacher.name}</strong> di madrasah <strong>{teacher.madrasahName}</strong>.
            </span>
          </div>

          {/* ── SUBMIT BUTTON ── */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-[14px] shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <span>Simpan Presensi Tanggal {backdatedDate}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/guru")}
              className="w-full py-3 rounded-2xl border border-[#dde1ff] bg-white text-[#444653] font-bold text-[13px] hover:bg-[#f8f9ff] transition-colors cursor-pointer"
            >
              Batal & Kembali ke Beranda
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
