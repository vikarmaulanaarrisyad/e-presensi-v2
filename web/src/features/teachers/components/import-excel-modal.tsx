"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  FileCheck2,
  Trash2,
  ArrowRight,
  Sparkles,
  Award
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { 
  downloadTeacherTemplate, 
  parseTeacherExcelFile, 
  type ParsedTeacherRow 
} from "@/lib/excel-helpers";
import { importTeachersAction } from "@/server/actions/teacher.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  madrasahId: string;
  onImportSuccess: () => void;
}

export function ImportExcelModal({
  isOpen,
  onClose,
  madrasahId,
  onImportSuccess,
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<{
    rows: ParsedTeacherRow[];
    validCount: number;
    invalidCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsParsing(true);

    try {
      const result = await parseTeacherExcelFile(selected);
      setParsedData(result);
    } catch (err: any) {
      swalError("Format File Salah", err.message || "Gagal memproses file Excel.");
      setFile(null);
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Reset file selection
  const handleResetFile = () => {
    setFile(null);
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit parsed valid rows to server action
  const handleProcessImport = async () => {
    if (!parsedData || parsedData.validCount === 0) return;

    const validRows = parsedData.rows
      .filter((r) => r.isValid)
      .map((r) => ({
        name: r.name,
        gelarDepan: r.gelarDepan || null,
        gelarBelakang: r.gelarBelakang || null,
        pegId: r.pegId || null,
        nuptk: r.nuptk || null,
        nip: r.nip || null,
        nik: r.nik || null,
        tempatLahir: r.tempatLahir || null,
        tanggalLahir: r.tanggalLahir ? new Date(r.tanggalLahir) : null,
        gender: r.gender || null,
        statusKepegawaian: r.statusKepegawaian || null,
        jenisGtk: r.jenisGtk || null,
        email: r.email,
        phone: r.phone || null,
        password: r.password || null,
      }));

    setIsImporting(true);
    swalLoading(
      "Mengimpor Data Guru...",
      `Menyimpan & menyelaraskan ${validRows.length} data guru dengan standar EMIS 4.0...`
    );

    const res = await importTeachersAction(madrasahId, validRows);
    setIsImporting(false);
    swalClose();

    if (res?.success) {
      let msg = `Berhasil mendaftarkan ${res.importedCount} guru baru.`;
      if ((res as any).updatedCount && (res as any).updatedCount > 0) {
        msg += ` (${(res as any).updatedCount} guru diperbarui datanya).`;
      }
      if (res.skippedCount && res.skippedCount > 0) {
        msg += ` (${res.skippedCount} email dilewati karena sudah ada).`;
      }
      swalSuccess("Import Data Guru Selesai!", msg);
      onImportSuccess();
      onClose();
    } else {
      swalError("Gagal Mengimpor", res?.error || "Terjadi kesalahan saat menyimpan data.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between bg-gradient-to-r from-[#042817] to-[#0A5C36] text-white">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-accent">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  Import Data Guru Massal (EMIS 4.0 / Excel)
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  EMIS GTK Ready
                </span>
              </div>
              <p className="text-xs text-emerald-100/90">
                Mendukung unduhan langsung dari EMIS 4.0 Kemenag atau template presensi GTK.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* Download Template & EMIS Feature Banner */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Langsung Upload Hasil Unduhan EMIS 4.0 atau Gunakan Template Resmi
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Sistem otomatis mendeteksi kolom: <strong>Peg ID, NUPTK, Gelar Depan/Belakang, NIP, NIK, Tempat/Tgl Lahir, dan Jabatan</strong>.
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTeacherTemplate}
              leftIcon={<Download className="size-3.5 text-emerald-600" />}
              className="text-xs font-semibold shrink-0"
            >
              Unduh Template EMIS 4.0
            </Button>
          </div>

          {/* File Upload Dropzone */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/70 hover:bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="size-14 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Upload className="size-7" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-foreground block group-hover:text-primary transition-colors">
                  Klik untuk memilih file spreadsheet EMIS 4.0 (.xlsx / .xls)
                </span>
                <span className="text-xs text-muted-foreground block mt-1">
                  Atau seret &amp; lepas file hasil export dari web EMIS GTK Kemenag ke sini
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Selected File Card */}
              <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      {(file.size / 1024).toFixed(1)} KB • {isParsing ? "Sedang menganalisis kolom EMIS..." : "Selesai dianalisis"}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFile}
                  leftIcon={<Trash2 className="size-3.5 text-rose-500" />}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  Ganti File
                </Button>
              </div>

              {/* Parsing Results Summary */}
              {parsedData && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-foreground">
                      Hasil Analisis Data Guru EMIS 4.0:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        Total: {parsedData.rows.length} Baris
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ✓ {parsedData.validCount} Siap Diimpor
                      </span>
                      {parsedData.invalidCount > 0 && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          ✕ {parsedData.invalidCount} Tidak Lengkap
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-border/80 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 border-b border-border/60 backdrop-blur-sm z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3">Peg ID / NUPTK</th>
                          <th className="py-2.5 px-3">Nama Lengkap &amp; Gelar</th>
                          <th className="py-2.5 px-3">NIP / Status</th>
                          <th className="py-2.5 px-3">Tempat, Tgl Lahir</th>
                          <th className="py-2.5 px-3">Email &amp; No WhatsApp</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {parsedData.rows.map((row) => (
                          <tr
                            key={row.index}
                            className={`transition-colors ${
                              row.isValid ? "hover:bg-muted/20" : "bg-rose-500/5 hover:bg-rose-500/10"
                            }`}
                          >
                            <td className="py-2 px-3 text-center text-muted-foreground font-mono">{row.index}</td>
                            
                            {/* PegID & NUPTK */}
                            <td className="py-2 px-3 font-mono text-[11px]">
                              {row.pegId ? (
                                <span className="font-semibold text-foreground block">
                                  {row.pegId}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic block">-</span>
                              )}
                              {row.nuptk && (
                                <span className="text-[10px] text-muted-foreground block">
                                  NUPTK: {row.nuptk}
                                </span>
                              )}
                            </td>

                            {/* Full Name & Degrees */}
                            <td className="py-2 px-3">
                              <span className="font-bold text-foreground block">
                                {row.fullNameDisplay || row.name || "-"}
                              </span>
                              {(row.gelarDepan || row.gelarBelakang) && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium block">
                                  Gelar: {row.gelarDepan || "-"} / {row.gelarBelakang || "-"}
                                </span>
                              )}
                            </td>

                            {/* NIP & Status Kepegawaian */}
                            <td className="py-2 px-3">
                              <span className="font-mono text-[11px] text-foreground block">
                                {row.nip || "Non-PNS"}
                              </span>
                              {row.statusKepegawaian && (
                                <span className="text-[10px] text-muted-foreground block">
                                  {row.statusKepegawaian}
                                </span>
                              )}
                            </td>

                            {/* Birth */}
                            <td className="py-2 px-3 text-[11px] text-muted-foreground">
                              {row.tempatLahir ? `${row.tempatLahir}, ` : ""}
                              {row.tanggalLahir || "-"}
                              {row.gender && (
                                <span className="ml-1 text-[10px] px-1 rounded bg-muted">
                                  ({row.gender})
                                </span>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="py-2 px-3 font-mono text-[11px]">
                              <span className="block text-foreground truncate max-w-[160px]">{row.email}</span>
                              <span className="text-[10px] text-muted-foreground block">{row.phone || "-"}</span>
                            </td>

                            {/* Validation Status */}
                            <td className="py-2 px-3 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="size-3" /> Siap
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full" title={row.errorReason}>
                                  <AlertCircle className="size-3" /> {row.errorReason}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic">
                    💡 Catatan: Password awal guru otomatis diset <strong>Password123!</strong> (atau sesuai kolom sandi). Jika email di EMIS belum terisi, sistem membuatkan email login unik berbasis PegID/NUPTK/NIP secara otomatis.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/70 flex items-center justify-between bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isImporting}
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="default"
            size="default"
            disabled={!parsedData || parsedData.validCount === 0 || isImporting}
            isLoading={isImporting}
            onClick={handleProcessImport}
            leftIcon={<Upload className="size-4" />}
          >
            {parsedData
              ? `Proses Import ${parsedData.validCount} Guru EMIS 4.0`
              : "Import Data Guru"}
          </Button>
        </div>
      </div>
    </div>
  );
}
