"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Calendar, 
  Send, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Paperclip,
  Clock
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { submitTeacherPermitAction } from "@/server/actions/mobile-attendance.actions";
import { swalSuccess, swalError, swalLoading, swalClose } from "@/lib/swal";

interface MobilePermitViewProps {
  userId: string;
  onSuccess: () => void;
}

export function MobilePermitView({ userId, onSuccess }: MobilePermitViewProps) {
  const [status, setStatus] = useState<"PERMIT" | "SICK">("PERMIT");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      swalError("File Terlalu Besar", "Ukuran lampiran maksimal adalah 2MB.");
      return;
    }

    setAttachmentFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      swalError("Keterangan Wajib Diisi", "Silakan tuliskan alasan atau keterangan izin/sakit Anda.");
      return;
    }

    swalLoading("Mengirim Pengajuan...", "Sedang menyimpan permohonan izin ke sistem...");
    setIsSubmitting(true);
    try {
      const res = await submitTeacherPermitAction({
        userId,
        status,
        startDate,
        endDate,
        notes,
        attachmentBase64: attachmentBase64 || undefined,
      });

      swalClose();
      if (res?.error) {
        swalError("Gagal Mengajukan", res.error);
        return;
      }

      swalSuccess("Pengajuan Berhasil Dikirim!", res.message, 2000);
      setNotes("");
      setAttachmentBase64(null);
      setAttachmentFileName(null);
      onSuccess();
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengirim", err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* 1. Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-5 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-200" />
            </div>
            <h3 className="text-base font-bold">Pengajuan Izin & Sakit</h3>
          </div>
          <p className="text-xs text-blue-100/90 leading-relaxed">
            Formulir permohonan tidak hadir untuk guru dan tenaga kependidikan madrasah.
          </p>
        </div>
      </div>

      {/* 2. Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-4"
      >
        {/* Toggle Type: Izin vs Sakit */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Jenis Permohonan:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus("PERMIT")}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                status === "PERMIT"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>📋 Izin Keperluan</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("SICK")}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                status === "SICK"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>🩺 Sakit</span>
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Mulai Tanggal:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Sampai Tanggal:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Keterangan / Alasan:
          </label>
          <textarea
            rows={3}
            placeholder={
              status === "SICK"
                ? "Contoh: Mengalami demam dan disarankan istirahat oleh dokter..."
                : "Contoh: Ada keperluan dinas luar / pelatihan kurikulum Kemenag..."
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Real Document Attachment Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-3.5 text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
            attachmentFileName
              ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-400"
          }`}
        >
          <Paperclip
            className={`w-5 h-5 ${attachmentFileName ? "text-emerald-600" : "text-slate-400"}`}
          />
          {attachmentFileName ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate max-w-[240px]">
                {attachmentFileName}
              </span>
              <span className="text-[10px] text-emerald-600">
                ✓ Dokumen terlampir (Klik untuk ganti)
              </span>
            </div>
          ) : (
            <>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Lampirkan Surat Keterangan Dokter / Undangan
              </span>
              <span className="text-[10px] text-slate-400">
                Format: JPG, PNG, PDF (Maks. 2MB)
              </span>
            </>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-600/20 text-xs gap-2"
        >
          <Send className="w-4 h-4" />
          Kirim Pengajuan Izin
        </Button>
      </form>
    </div>
  );
}
