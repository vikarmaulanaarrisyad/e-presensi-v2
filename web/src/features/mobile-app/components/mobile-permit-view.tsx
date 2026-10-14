"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar, 
  Send, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Paperclip,
  Clock,
  XCircle,
  ListFilter,
  History,
  Check
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { submitTeacherPermitAction } from "@/server/actions/mobile-attendance.actions";
import { getTeacherPermitHistoryAction } from "@/server/actions/permit.actions";
import { swalSuccess, swalError, swalLoading, swalClose } from "@/lib/swal";

interface MobilePermitViewProps {
  userId: string;
  onSuccess: () => void;
}

export function MobilePermitView({ userId, onSuccess }: MobilePermitViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"FORM" | "HISTORY">("FORM");
  const [status, setStatus] = useState<"PERMIT" | "SICK" | "DUTY">("PERMIT");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getTeacherPermitHistoryAction();
      if (res?.success && res.data) {
        setHistoryList(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

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

    swalLoading("Mengirim Pengajuan...", "Sedang menyimpan permohonan izin ke pimpinan...");
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

      swalSuccess("Pengajuan Berhasil Dikirim!", res.message, 2500);
      setNotes("");
      setAttachmentBase64(null);
      setAttachmentFileName(null);
      await loadHistory();
      setActiveSubTab("HISTORY");
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
            <h3 className="text-base font-bold">Pengajuan Izin, Sakit & Dinas Luar</h3>
          </div>
          <p className="text-xs text-blue-100/90 leading-relaxed">
            Permohonan tidak hadir resmi atau perjalanan dinas dan pantau status persetujuan pimpinan madrasah.
          </p>
        </div>
      </div>

      {/* Subtab Toggle Buttons */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveSubTab("FORM")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "FORM"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <FileText className="size-3.5" />
          <span>Buat Pengajuan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab("HISTORY");
            loadHistory();
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "HISTORY"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <History className="size-3.5" />
          <span>Riwayat ({historyList.length})</span>
        </button>
      </div>

      {/* 2. Content Views based on activeSubTab */}
      {activeSubTab === "FORM" ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-4"
        >
          {/* Toggle Type: Izin vs Sakit vs Dinas Luar */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Jenis Permohonan:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStatus("PERMIT")}
                className={`py-2.5 px-2 rounded-2xl text-[11px] font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                  status === "PERMIT"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="text-sm">📋</span>
                <span>Izin</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("SICK")}
                className={`py-2.5 px-2 rounded-2xl text-[11px] font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                  status === "SICK"
                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="text-sm">🩺</span>
                <span>Sakit</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("DUTY")}
                className={`py-2.5 px-2 rounded-2xl text-[11px] font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                  status === "DUTY"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="text-sm">💼</span>
                <span>Dinas Luar</span>
              </button>
            </div>
            {status === "DUTY" && (
              <p className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
                💡 <b>Catatan:</b> Perjalanan dinas luar resmi akan diakui <b>Hadir 100%</b> setelah disetujui pimpinan. Pastikan melampirkan Surat Tugas (ST).
              </p>
            )}
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
                status === "DUTY"
                  ? "Contoh: Menghadiri Rapat Koordinasi KKM / Bimtek Kurikulum Merdeka di Kemenag Kab/Kota..."
                  : status === "SICK"
                  ? "Contoh: Mengalami demam dan disarankan istirahat oleh dokter..."
                  : "Contoh: Ada urusan keluarga mendesak / acara penting..."
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
                  {status === "DUTY"
                    ? "Lampirkan Surat Tugas (ST) / Surat Undangan Resmi"
                    : status === "SICK"
                    ? "Lampirkan Surat Keterangan Dokter"
                    : "Lampirkan Surat Keterangan / Dokumen Pendukung"}
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
            className={`w-full text-white font-bold py-5 rounded-2xl shadow-lg text-xs gap-2 ${
              status === "DUTY"
                ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                : status === "SICK"
                ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/20"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            }`}
          >
            <Send className="w-4 h-4" />
            {status === "DUTY"
              ? "Kirim Pengajuan Dinas Luar"
              : status === "SICK"
              ? "Kirim Pengajuan Sakit"
              : "Kirim Pengajuan Izin"}
          </Button>
        </form>
      ) : (
        /* Riwayat Pengajuan Saya */
        <div className="flex flex-col gap-3">
          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
              Memuat riwayat pengajuan...
            </div>
          ) : historyList.length > 0 ? (
            historyList.map((item) => {
              const isSick = item.type === "SICK";
              const isDuty = item.type === "DUTY";
              const isPending = item.status === "PENDING";
              const isApproved = item.status === "APPROVED";
              const isRejected = item.status === "REJECTED";

              const startFmt = new Date(item.startDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              });
              const endFmt = new Date(item.endDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const dateRange =
                item.startDate === item.endDate ? startFmt : `${startFmt} - ${endFmt}`;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isDuty
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : isSick
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {isDuty ? "💼 Dinas Luar" : isSick ? "🩺 Sakit" : "📋 Izin"} &bull; {item.totalDays} Hari
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        <Clock className="size-3" /> Menunggu
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" /> Disetujui
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        <XCircle className="size-3" /> Ditolak
                      </span>
                    )}
                  </div>

                  {/* Date range & Notes */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                      <Calendar className="size-3 text-blue-600" />
                      <span>{dateRange}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                      &ldquo;{item.notes}&rdquo;
                    </p>
                  </div>

                  {/* Rejection / Approval info */}
                  {isRejected && item.rejectionReason && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300">
                      <b>Catatan Pimpinan:</b> {item.rejectionReason}
                    </div>
                  )}

                  {isApproved && item.approvedBy && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Disetujui oleh: {item.approvedBy.name}</span>
                      <span>
                        {item.approvedAt
                          ? new Date(item.approvedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              Belum ada riwayat permohonan izin yang diajukan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
