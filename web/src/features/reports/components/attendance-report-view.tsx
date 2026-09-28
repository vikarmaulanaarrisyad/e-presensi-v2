"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Printer, 
  FileDown, 
  FileSpreadsheet, 
  Calendar, 
  User, 
  Search, 
  SlidersHorizontal, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  FileText,
  Building2,
  Clock
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { AttendancePrintSheet } from "./attendance-print-sheet";
import { 
  fetchAttendanceReportData, 
  type AttendanceReportData 
} from "@/server/actions/report.actions";
import { exportReportToPdf } from "../utils/export-pdf";
import { exportReportToExcel } from "../utils/export-excel";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

interface TeacherOption {
  id: string;
  name: string;
  nip: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
}

interface AttendanceReportViewProps {
  initialData: {
    madrasah: {
      id: string;
      name: string;
      nsm: string;
      address: string | null;
    };
    teachers: TeacherOption[];
  };
}

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const YEARS = [2024, 2025, 2026, 2027];

export function AttendanceReportView({ initialData }: AttendanceReportViewProps) {
  // State for filters
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("sample-wariah");
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // Default Januari to match sample
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default 2025 to match sample
  const [filterType, setFilterType] = useState<string>("all");
  const [dateLanguage, setDateLanguage] = useState<"en" | "id">("en");

  // Loading & data state
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const printSheetRef = useRef<HTMLDivElement>(null);

  // Load report data
  const loadReport = async () => {
    setIsLoading(true);
    const res = await fetchAttendanceReportData({
      madrasahId: initialData.madrasah.id,
      teacherId: selectedTeacherId,
      month: selectedMonth,
      year: selectedYear,
      filterType,
      isSampleWariah: selectedTeacherId === "sample-wariah",
    });

    if (res?.data) {
      setReportData(res.data);
    } else {
      swalError("Gagal Memuat Laporan", res?.error || "Terjadi kesalahan sistem.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [selectedTeacherId, selectedMonth, selectedYear, filterType]);

  // Direct Print Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!reportData) return;
    try {
      setIsExportingPdf(true);
      swalLoading(
        "Menyiapkan Dokumen PDF F4...",
        "Merender lembar presensi format F4 Landscape dengan margin 1,5 cm..."
      );

      const sanitizedName = reportData.employee.name.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Laporan_Rincian_Harian_${sanitizedName}_${reportData.period.month}_${reportData.period.year}.pdf`;

      await exportReportToPdf("printable-attendance-sheet", filename);
      swalClose();
      swalSuccess("PDF Berhasil Diunduh", `File ${filename} telah tersimpan di komputer Anda.`);
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh PDF", err?.message || "Terjadi kesalahan saat merender PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!reportData) return;
    try {
      swalLoading("Menyiapkan Spreadsheet...", "Mengonversi rincian presensi ke format Excel...");
      exportReportToExcel(reportData);
      swalClose();
      swalSuccess("Excel Berhasil Diunduh", "File laporan rincian harian telah siap.");
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh Excel", err?.message || "Terjadi kesalahan ekspor spreadsheet.");
    }
  };

  // Reset to default sample
  const handleResetSample = () => {
    setSelectedTeacherId("sample-wariah");
    setSelectedMonth(1);
    setSelectedYear(2025);
    setFilterType("all");
    setDateLanguage("en");
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full select-none">
      {/* 1. Executive Page Header (Hidden when printing) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="size-6 text-primary" />
              <span>Cetak Presensi & Rekapitulasi Rincian Harian</span>
            </h1>
            <Badge variant="gold">Format Kemenag F4</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cetak langsung ke printer fisik atau unduh berkas presensi dalam bentuk PDF & EXCEL sesuai standar format kertas F4 margin 1,5 cm.
          </p>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
            className="text-xs font-semibold border-emerald-500/30 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Download EXCEL
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            leftIcon={<FileDown className="size-4 text-rose-600" />}
            className="text-xs font-semibold border-rose-500/30 text-rose-800 bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {isExportingPdf ? "Memproses PDF..." : "Download PDF (F4)"}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="size-4" />}
            className="text-xs font-semibold shadow-sm"
          >
            Langsung Cetak Printer (F4)
          </Button>
        </div>
      </div>

      {/* 2. Control Toolbar / Filter Bar (Hidden when printing) */}
      <div className="no-print p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filter Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            {/* Pilih Guru */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" />
                <span>Pilih Guru / Pendidik</span>
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="sample-wariah">
                  ★ Contoh Gambar: WARIAH (PIN: 12)
                </option>
                <optgroup label="Guru Terdaftar di Database">
                  {initialData.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.nip || "Tanpa NIP"})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Pilih Bulan */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Bulan Periode</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Tahun */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>Tahun Akademik</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Jenis */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-primary" />
                <span>Filter Jenis</span>
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">Semua Hari (Penuh 1 Bulan)</option>
                <option value="present">Hanya Hari Hadir</option>
                <option value="late">Hanya Hari Terlambat</option>
                <option value="holiday">Hanya Hari Libur</option>
              </select>
            </div>
          </div>

          {/* Quick Preset / Reset to Image Button */}
          <div className="flex sm:flex-col justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetSample}
              leftIcon={<RotateCcw className="size-3.5" />}
              className="text-xs font-medium whitespace-nowrap"
            >
              Muat Contoh Gambar
            </Button>
          </div>
        </div>

        {/* Paper & Specs Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-[11px]">
              Kertas: F4 (215 x 330 mm) Landscape
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Margin: 1,5 cm (15 mm)
            </Badge>
            <Badge variant="gold" className="text-[11px]">
              Highlight Libur: Kuning Terang
            </Badge>
          </div>

          {/* Zoom and Language Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <span>Format Hari:</span>
              <button
                type="button"
                onClick={() => setDateLanguage("en")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  dateLanguage === "en"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                English (Wednesday)
              </button>
              <button
                type="button"
                onClick={() => setDateLanguage("id")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  dateLanguage === "id"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                Indonesia (Rabu)
              </button>
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                className="size-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                title="Perkecil Tampilan"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="w-12 text-center text-xs font-mono font-medium">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="size-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                title="Perbesar Tampilan"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Printable Sheet Preview Container */}
      <div className="w-full flex flex-col items-center justify-center bg-slate-900/5 dark:bg-slate-950/40 p-4 sm:p-8 rounded-3xl border border-border/80 overflow-x-auto min-h-[600px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Memuat Laporan Rincian Harian...</span>
          </div>
        ) : reportData ? (
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="w-full flex justify-center py-2"
          >
            <AttendancePrintSheet
              ref={printSheetRef}
              data={reportData}
              dateLanguage={dateLanguage}
            />
          </div>
        ) : (
          <div className="text-muted-foreground text-sm py-12">
            Data laporan tidak tersedia. Silakan pilih guru dan periode yang valid.
          </div>
        )}
      </div>
    </div>
  );
}
