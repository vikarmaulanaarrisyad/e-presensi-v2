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
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
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
        nip: r.nip || null,
        email: r.email,
        phone: r.phone || null,
        password: r.password || null,
      }));

    setIsImporting(true);
    swalLoading("Mengimpor Data Guru...", `Menyimpan ${validRows.length} akun guru ke database...`);

    const res = await importTeachersAction(madrasahId, validRows);
    setIsImporting(false);
    swalClose();

    if (res?.success) {
      let msg = `Berhasil mendaftarkan ${res.importedCount} guru baru.`;
      if (res.skippedCount && res.skippedCount > 0) {
        msg += ` (${res.skippedCount} email dilewati karena sudah terdaftar sebelumnya).`;
      }
      swalSuccess("Import Excel Selesai!", msg);
      onImportSuccess();
      onClose();
    } else {
      swalError("Gagal Mengimpor", res?.error || "Terjadi kesalahan saat menyimpan data.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/70 flex items-center justify-between bg-gradient-to-r from-[#042817] to-[#0A5C36] text-white">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-accent">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Import Data Guru Massal (Excel)
              </h2>
              <p className="text-xs text-emerald-100/90">
                Unggah spreadsheet .xlsx atau .xls untuk mendaftarkan akun guru sekaligus.
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
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Download Template Banner */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-emerald-500/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Belum punya format Excel yang sesuai?
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Unduh template resmi berformat .xlsx yang telah disesuaikan dengan kolom nama, NIP, email, dan no HP.
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTeacherTemplate}
              leftIcon={<Download className="size-3.5" />}
              className="shrink-0 text-xs"
            >
              Unduh Template Excel
            </Button>
          </div>

          {/* Upload Area */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/80 bg-muted/20 hover:bg-muted/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center group"
            >
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="size-7" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground block">
                  Klik untuk pilih file Excel (.xlsx / .xls)
                </span>
                <span className="text-xs text-muted-foreground block mt-1">
                  Maksimal ukuran file 10 MB. Mendukung ratusan baris data guru sekaligus.
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
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
                      {(file.size / 1024).toFixed(1)} KB • {isParsing ? "Sedang memindai..." : "Selesai dianalisis"}
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
                      Hasil Analisis Baris Data:
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        Total: {parsedData.rows.length} Baris
                      </Badge>
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
                  <div className="border border-border/80 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 border-b border-border/60 backdrop-blur-sm">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Nama Lengkap</th>
                          <th className="py-2.5 px-3">NIP</th>
                          <th className="py-2.5 px-3">Email Login</th>
                          <th className="py-2.5 px-3">No WhatsApp</th>
                          <th className="py-2.5 px-3 text-center">Status Validasi</th>
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
                            <td className="py-2 px-3 text-muted-foreground">{row.index}</td>
                            <td className="py-2 px-3 font-semibold text-foreground">{row.name || "-"}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">{row.nip || "-"}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{row.email || "-"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{row.phone || "-"}</td>
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
                    Catatan: Password awal guru otomatis diset <strong>Password123!</strong> (atau sesuai kolom Excel). Guru dapat mengubah kata sandi mandiri melalui aplikasi mobile.
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
            rightIcon={<ArrowRight className="size-4" />}
          >
            Import {parsedData?.validCount ? `${parsedData.validCount} Data Guru` : "ke Database"}
          </Button>
        </div>
      </div>
    </div>
  );
}
