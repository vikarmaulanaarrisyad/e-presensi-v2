"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Clock,
  CalendarPlus,
  Palmtree,
  X
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { AttendancePrintSheet } from "./attendance-print-sheet";
import { 
  fetchAttendanceReportData, 
  saveSemesterHolidayAction,
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

  // Semester break modal state
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState<boolean>(false);
  const [semesterHolidayName, setSemesterHolidayName] = useState<string>("Libur Akhir Semester Ganjil");
  const [semesterStartDate, setSemesterStartDate] = useState<string>("");
  const [semesterEndDate, setSemesterEndDate] = useState<string>("");
  const [semesterDesc, setSemesterDesc] = useState<string>("Libur Semester Kalender Pendidikan Madrasah");
  const [isSavingSemester, setIsSavingSemester] = useState<boolean>(false);

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

      exportReportToPdf(reportData, filename, dateLanguage);
      swalClose();
      swalSuccess("PDF Berhasil Diunduh", `File ${filename} telah tersimpan di komputer Anda.`);
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh PDF", err?.message || "Terjadi kesalahan saat membuat PDF.");
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

  // Detect if current viewed report has semester holiday ranges
  const detectedSemesterBreaks = useMemo(() => {
    if (!reportData) return [];
    const holidayNames = new Set<string>();
    reportData.rows.forEach((r) => {
      if (
        r.isHoliday &&
        r.keterangan &&
        !r.keterangan.includes("rutin") &&
        (r.keterangan.toLowerCase().includes("semester") ||
          r.keterangan.toLowerCase().includes("kenaikan") ||
          r.keterangan.toLowerCase().includes("ajaran") ||
          r.keterangan.toLowerCase().includes("ramadhan") ||
          r.keterangan.toLowerCase().includes("lebaran"))
      ) {
        holidayNames.add(r.keterangan);
      }
    });
    return Array.from(holidayNames);
  }, [reportData]);

  // Handle Save Semester Holiday
  const handleSaveSemesterBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterHolidayName.trim() || !semesterStartDate || !semesterEndDate) {
      swalError("Form Belum Lengkap", "Silakan masukkan nama libur semester, tanggal mulai, dan tanggal selesai.");
      return;
    }

    if (semesterEndDate < semesterStartDate) {
      swalError("Tanggal Tidak Valid", "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setIsSavingSemester(true);
    swalLoading("Menyimpan Libur Semester...", "Mendaftarkan jadwal libur ke database madrasah...");

    const res = await saveSemesterHolidayAction({
      madrasahId: initialData.madrasah.id,
      name: semesterHolidayName,
      startDate: semesterStartDate,
      endDate: semesterEndDate,
      description: semesterDesc,
    });

    setIsSavingSemester(false);
    swalClose();

    if (res?.success) {
      setIsSemesterModalOpen(false);
      swalSuccess(
        "Libur Semester Diterapkan!",
        "Seluruh tanggal dalam rentang libur semester otomatis berwarna kuning dan dikecualikan dari hari kerja KBM."
      );
      loadReport();
    } else {
      swalError("Gagal Menyimpan", res?.error || "Terjadi kesalahan.");
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
      <div className="no-print flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="size-6 text-primary shrink-0" />
              <span>Cetak Presensi & Rekapitulasi Rincian Harian</span>
            </h1>
            <Badge variant="gold">Format Kemenag F4</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cetak langsung ke printer fisik atau unduh berkas presensi dalam bentuk PDF & EXCEL sesuai standar format kertas F4 margin 1,5 cm.
          </p>
        </div>

        {/* Clean Single-Row Action Button Group */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
            className="h-9 px-3.5 text-xs font-semibold border-emerald-500/30 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs whitespace-nowrap"
          >
            Unduh Excel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            leftIcon={<FileDown className="size-4 text-rose-600" />}
            className="h-9 px-3.5 text-xs font-semibold border-rose-500/30 text-rose-800 bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 shadow-2xs whitespace-nowrap"
          >
            {isExportingPdf ? "Memproses PDF..." : "Unduh PDF (F4)"}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="size-4" />}
            className="h-9 px-4 text-xs font-bold shadow-xs whitespace-nowrap"
          >
            Cetak Printer (F4)
          </Button>
        </div>
      </div>

      {/* 2. Control Toolbar / Filter Bar (Hidden when printing) */}
      <div className="no-print p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
        {/* Toolbar Header with Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Parameter & Filter Laporan
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const y = selectedYear;
                const m = selectedMonth.toString().padStart(2, "0");
                setSemesterStartDate(`${y}-${m}-20`);
                setSemesterEndDate(`${y}-${m}-31`);
                setIsSemesterModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
              title="Atur libur semester ganjil atau genap / kenaikan kelas"
            >
              <CalendarPlus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Atur Libur Semester</span>
            </button>

            <button
              type="button"
              onClick={handleResetSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
              title="Muat data contoh persis seperti pada gambar (WARIAH - MI IKHSANIYAH LEBETENG)"
            >
              <RotateCcw className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span>Muat Contoh Gambar (WARIAH)</span>
            </button>
          </div>
        </div>

        {/* Semester Break Alert Banner if detected */}
        {detectedSemesterBreaks.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Palmtree className="size-4 text-amber-600 shrink-0" />
              <span>
                <strong>Libur Semester Terdeteksi:</strong> {detectedSemesterBreaks.join(", ")}. Seluruh tanggal dalam rentang ini otomatis berwarna kuning dan dikecualikan dari kewajiban presensi (tidak dihitung alpa).
              </span>
            </div>
          </div>
        )}

        {/* 4-Column Balanced Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
          {/* 1. Pilih Guru */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              <span>Pilih Guru / Pendidik</span>
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs"
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

          {/* 2. Pilih Bulan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Bulan Periode</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Tahun */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" />
              <span>Tahun Akademik</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter Jenis */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5 text-primary" />
              <span>Filter Jenis Hari</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs"
            >
              <option value="all">Semua Hari (Penuh 1 Bulan)</option>
              <option value="present">Hanya Hari Hadir</option>
              <option value="late">Hanya Hari Terlambat</option>
              <option value="holiday">Hanya Hari Libur</option>
            </select>
          </div>
        </div>

        {/* Paper Specs & Document Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-border/60">
          {/* Left: Spec Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Spesifikasi:
            </span>
            <Badge variant="default" className="text-[11px] font-medium py-0.5">
              Kertas F4 (215 × 330 mm) Landscape
            </Badge>
            <Badge variant="secondary" className="text-[11px] font-medium py-0.5">
              Margin 1,5 cm
            </Badge>
            <Badge variant="gold" className="text-[11px] font-medium py-0.5">
              Highlight Libur Kuning
            </Badge>
          </div>

          {/* Right: Controls (Language Toggle & Zoom) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language Segmented Control */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setDateLanguage("en")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  dateLanguage === "en"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                English (Wednesday)
              </button>
              <button
                type="button"
                onClick={() => setDateLanguage("id")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  dateLanguage === "id"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Indonesia (Rabu)
              </button>
            </div>

            <div className="h-4 w-px bg-border/80" />

            {/* Zoom Control Pill */}
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-muted/60 border border-border/60">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                className="size-6 rounded flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground transition-all"
                title="Perkecil Tampilan"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="w-11 text-center text-[11px] font-mono font-bold text-foreground">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="size-6 rounded flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground transition-all"
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

      {/* 4. Semester Break Modal */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/80 bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Palmtree className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Atur Jadwal Libur Semester
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Daftarkan rentang libur semester ke kalender akademik madrasah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSemesterModalOpen(false)}
                className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveSemesterBreak} className="p-5 flex flex-col gap-4">
              {/* Quick Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pilih Contoh Preset:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSemesterHolidayName("Libur Akhir Semester Ganjil");
                      setSemesterStartDate(`${selectedYear}-12-22`);
                      setSemesterEndDate(`${selectedYear + 1}-01-03`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                  >
                    Semester Ganjil (Des - Jan)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSemesterHolidayName("Libur Akhir Tahun Ajaran / Kenaikan Kelas");
                      setSemesterStartDate(`${selectedYear}-06-23`);
                      setSemesterEndDate(`${selectedYear}-07-12`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                  >
                    Semester Genap (Jun - Jul)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSemesterHolidayName("Libur Awal Ramadhan & Idul Fitri");
                      setSemesterStartDate(`${selectedYear}-03-24`);
                      setSemesterEndDate(`${selectedYear}-04-07`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                  >
                    Ramadhan / Idul Fitri
                  </button>
                </div>
              </div>

              {/* Nama Libur */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nama Libur Semester / Keterangan
                </label>
                <input
                  type="text"
                  required
                  value={semesterHolidayName}
                  onChange={(e) => setSemesterHolidayName(e.target.value)}
                  placeholder="Contoh: Libur Akhir Semester Ganjil"
                  className="h-10 px-3 rounded-xl bg-background border border-border text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Tanggal Mulai & Tanggal Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={semesterStartDate}
                    onChange={(e) => setSemesterStartDate(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={semesterEndDate}
                    onChange={(e) => setSemesterEndDate(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Catatan Info */}
              <div className="p-3 rounded-xl bg-muted/50 border border-border/80 text-xs text-muted-foreground">
                <p>
                  💡 <strong>Keterangan Sistem:</strong> Seluruh tanggal dalam rentang libur semester akan otomatis:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Disorot dengan warna kuning terang (#FFFF00)</li>
                  <li>Diberi keterangan nama libur semester & shift &quot;Libur&quot;</li>
                  <li>Dikecualikan dari hari kerja efektif (tidak dianggap alpa)</li>
                </ul>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSemesterModalOpen(false)}
                  disabled={isSavingSemester}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSavingSemester}
                  leftIcon={<CheckCircle2 className="size-4" />}
                >
                  {isSavingSemester ? "Menyimpan..." : "Terapkan Libur Semester"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
