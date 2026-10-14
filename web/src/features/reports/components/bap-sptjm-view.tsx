"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Award,
  Users,
  ScrollText,
  FileCheck2,
} from "lucide-react";
import {
  fetchBapSptjmDataAction,
  type BapSptjmData,
} from "@/server/actions/report.actions";
import {
  exportSptjmPdf,
  exportBapPdf,
  exportBapSptjmPackagePdf,
} from "../utils/export-bap-sptjm";
import { exportBapToExcel } from "../utils/export-bap-excel";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

interface BapSptjmViewProps {
  madrasahId: string;
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

export function BapSptjmView({ madrasahId }: BapSptjmViewProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [data, setData] = useState<BapSptjmData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Active document preview mode
  const [activeDocTab, setActiveDocTab] = useState<"SPTJM" | "BAP">("SPTJM");
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // Editable Document Metadata
  const [nomorSptjm, setNomorSptjm] = useState<string>("");
  const [nomorBap, setNomorBap] = useState<string>("");
  const [tanggalSurat, setTanggalSurat] = useState<string>("");
  const [kotaMadrasah, setKotaMadrasah] = useState<string>("Wonosobo");
  const [namaKamad, setNamaKamad] = useState<string>("");
  const [nipKamad, setNipKamad] = useState<string>("");
  const [pangkatKamad, setPangkatKamad] = useState<string>("Pembina Tk. I / IV.b");
  const [namaPengawas, setNamaPengawas] = useState<string>("");
  const [nipPengawas, setNipPengawas] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchBapSptjmDataAction({
        madrasahId,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res?.success && res.data) {
        setData(res.data);
        const mm = String(selectedMonth).padStart(2, "0");
        const defaultSptjmNo = `B-0${selectedMonth}/Ma.${res.data.madrasah.nsm.slice(-4) || "00"}/PP.00.0/${mm}/${selectedYear}`;
        const defaultBapNo = `BA-0${selectedMonth}/Ma.${res.data.madrasah.nsm.slice(-4) || "00"}/BAP/${mm}/${selectedYear}`;

        setNomorSptjm((prev) => (prev ? prev : defaultSptjmNo));
        setNomorBap((prev) => (prev ? prev : defaultBapNo));
        setTanggalSurat((prev) =>
          prev
            ? prev
            : `${res.data.period.endDateStr.split("/")[0]} ${res.data.period.monthName} ${selectedYear}`
        );

        if (res.data.headmaster) {
          setNamaKamad((prev) => (prev ? prev : res.data.headmaster?.name || ""));
          setNipKamad((prev) => (prev ? prev : res.data.headmaster?.nip || ""));
          if (res.data.headmaster.pangkatGol) {
            setPangkatKamad((prev) => (prev ? prev : res.data.headmaster?.pangkatGol || ""));
          }
        }
      } else {
        swalError("Gagal Memuat Data", res?.error || "Terjadi kesalahan.");
      }
    } catch (err: any) {
      swalError("Terjadi Kesalahan", err.message || "Gagal menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, madrasahId]);

  // Handlers
  const handleDownloadSptjm = async () => {
    if (!data) return;
    try {
      swalLoading("Menyiapkan Dokumen PDF...", "Merender SPTJM Resmi format Portrait...");
      await exportSptjmPdf(data, {
        nomorSurat: nomorSptjm,
        tanggalSurat,
        kotaMadrasah,
        namaKamad,
        nipKamad,
        pangkatKamad,
      });
      swalClose();
      swalSuccess("Berhasil Diunduh", "File PDF SPTJM telah disimpan.");
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh", err.message);
    }
  };

  const handleDownloadBap = async () => {
    if (!data) return;
    try {
      swalLoading("Menyiapkan Dokumen PDF...", "Merender BAP Kolektif format F4 Landscape...");
      await exportBapPdf(data, {
        nomorBap,
        tanggalBap: tanggalSurat,
        kotaMadrasah,
        namaKamad,
        nipKamad,
        namaPengawas: namaPengawas.trim() || undefined,
        nipPengawas: nipPengawas.trim() || undefined,
      });
      swalClose();
      swalSuccess("Berhasil Diunduh", "File PDF BAP Presensi telah disimpan.");
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh", err.message);
    }
  };

  const handleDownloadPackage = async () => {
    if (!data) return;
    try {
      swalLoading("Menyiapkan Paket Dokumen...", "Menggabungkan SPTJM dan BAP dalam satu file PDF...");
      await exportBapSptjmPackagePdf(data, {
        nomorSurat: nomorSptjm,
        nomorBap,
        tanggalSurat,
        tanggalBap: tanggalSurat,
        kotaMadrasah,
        namaKamad,
        nipKamad,
        pangkatKamad,
        namaPengawas: namaPengawas.trim() || undefined,
        nipPengawas: nipPengawas.trim() || undefined,
      });
      swalClose();
      swalSuccess("Berhasil Diunduh", "Paket lengkap SPTJM & BAP telah disimpan.");
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh", err.message);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    try {
      swalLoading("Mengekspor ke Excel...", "Menyusun matriks kehadiran kolektif...");
      await exportBapToExcel(data);
      swalClose();
      swalSuccess("Berhasil Diunduh", "File Excel BAP Presensi telah disimpan.");
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengekspor Excel", err.message);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-md">
              <ScrollText className="h-7 w-7 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  SPTJM & BAP Presensi Kemenag
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-100">
                  Syarat TPG / Simpatika
                </span>
              </div>
              <p className="text-sm text-emerald-100/90 mt-0.5">
                Surat Pertanggungjawaban Mutlak & Berita Acara Pemeriksaan Kehadiran Kolektif Bulanan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{showConfigPanel ? "Tutup Pengaturan" : "Atur No. Surat & Kamad"}</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Periode & Actions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Periode Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-foreground">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {data && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <span>{data.period.totalEffectiveDays} Hari Efektif</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPackage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="Unduh paket lengkap SPTJM Portrait + BAP Landscape sekaligus"
          >
            <Download className="size-3.5" />
            <span>Unduh Paket PDF (SPTJM + BAP)</span>
          </button>

          <button
            onClick={handleDownloadSptjm}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer"
            title="Unduh SPTJM Portrait F4"
          >
            <FileCheck2 className="size-3.5 text-emerald-600" />
            <span>PDF SPTJM</span>
          </button>

          <button
            onClick={handleDownloadBap}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer"
            title="Unduh BAP Presensi Landscape F4"
          >
            <FileText className="size-3.5 text-blue-600" />
            <span>PDF BAP</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer"
            title="Ekspor ke spreadsheet Excel .xlsx"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleBrowserPrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer"
            title="Cetak via dialog browser"
          >
            <Printer className="size-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* 3. Collapsible Configuration Panel */}
      {showConfigPanel && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 space-y-4 animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2.5">
            <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="size-3.5" />
              <span>Penyesuaian Nomor Dokumen & Penandatangan</span>
            </h3>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Perubahan langsung tampil pada pratinjau dan cetakan PDF
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Nomor Surat SPTJM:
              </label>
              <input
                type="text"
                value={nomorSptjm}
                onChange={(e) => setNomorSptjm(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border font-mono text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Nomor Berita Acara BAP:
              </label>
              <input
                type="text"
                value={nomorBap}
                onChange={(e) => setNomorBap(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border font-mono text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Kota / Tempat Penetapan:
              </label>
              <input
                type="text"
                value={kotaMadrasah}
                onChange={(e) => setKotaMadrasah(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Tanggal Penetapan Surat:
              </label>
              <input
                type="text"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Nama Kepala Madrasah:
              </label>
              <input
                type="text"
                value={namaKamad}
                onChange={(e) => setNamaKamad(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                NIP Kepala Madrasah:
              </label>
              <input
                type="text"
                value={nipKamad}
                onChange={(e) => setNipKamad(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border font-mono text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                Nama Pengawas Pembina (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd.I"
                value={namaPengawas}
                onChange={(e) => setNamaPengawas(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground block mb-1">
                NIP Pengawas Pembina (Opsional):
              </label>
              <input
                type="text"
                placeholder="197001011995031001"
                value={nipPengawas}
                onChange={(e) => setNipPengawas(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-background border border-border font-mono text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Stat Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Total Pendidik & Pegawai</span>
              <Users className="size-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {data.summary.totalTeachers}{" "}
              <span className="text-xs font-normal text-muted-foreground">orang</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-between">
              <span>Memenuhi Syarat (MS)</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {data.summary.totalEligible}{" "}
              <span className="text-xs font-normal text-emerald-600/80">Guru (TPG)</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-xs">
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center justify-between">
              <span>Tidak Memenuhi (TMS)</span>
              <AlertTriangle className="size-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
              {data.summary.totalIneligible}{" "}
              <span className="text-xs font-normal text-amber-600/80">orang</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Rata-rata Kehadiran</span>
              <Award className="size-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {data.summary.averageAttendance}%{" "}
              <span className="text-xs font-normal text-muted-foreground">disiplin</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Document View Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveDocTab("SPTJM")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeDocTab === "SPTJM"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <ScrollText className="size-4" />
          <span>Surat Pertanggungjawaban Mutlak (SPTJM)</span>
        </button>

        <button
          onClick={() => setActiveDocTab("BAP")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeDocTab === "BAP"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <FileText className="size-4" />
          <span>Berita Acara Rekapitulasi Kehadiran (BAP)</span>
        </button>
      </div>

      {/* 6. Document Preview Card */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 rounded-2xl bg-card border border-border">
          <RefreshCw className="size-6 animate-spin text-emerald-600" />
          <span>Memuat data BAP & SPTJM Kemenag...</span>
        </div>
      ) : !data ? (
        <div className="p-16 text-center text-xs text-rose-500 rounded-2xl bg-card border border-rose-200">
          Gagal memuat dokumen. Silakan periksa koneksi atau klik Segarkan.
        </div>
      ) : activeDocTab === "SPTJM" ? (
        /* ======================== SPTJM PREVIEW ======================== */
        <div className="w-full flex justify-center py-4 bg-muted/40 rounded-3xl border border-border overflow-x-auto">
          <div className="w-[800px] min-h-[1100px] bg-white text-slate-900 p-12 rounded-xl shadow-2xl border border-slate-200 font-serif leading-relaxed text-sm select-text printable-sptjm">
            {/* Kop Madrasah */}
            <div className="text-center border-b-4 border-double border-slate-900 pb-3 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Kementerian Agama Republik Indonesia
              </h4>
              <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight mt-0.5">
                {data.madrasah.name}
              </h2>
              <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                NSM: {data.madrasah.nsm || "-"} &bull; NPSN: {data.madrasah.npsn || "-"}
              </p>
              <p className="text-[11px] text-slate-600 font-sans">
                {data.madrasah.address || "Alamat Madrasah"}
                {data.madrasah.phone ? ` &bull; Telp: ${data.madrasah.phone}` : ""}
                {data.madrasah.email ? ` &bull; Email: ${data.madrasah.email}` : ""}
              </p>
            </div>

            {/* Judul Surat */}
            <div className="text-center mb-6">
              <h3 className="text-base font-bold underline tracking-wide uppercase">
                SURAT PERTANGGUNGJAWABAN MUTLAK (SPTJM)
              </h3>
              <p className="text-xs font-bold uppercase mt-0.5">
                KEHADIRAN GURU DAN TENAGA KEPENDIDIKAN
              </p>
              <p className="text-xs font-sans text-slate-700 mt-1">
                Nomor: {nomorSptjm}
              </p>
            </div>

            {/* Identitas Kepala Madrasah */}
            <div className="space-y-1 mb-6 text-xs font-sans">
              <p className="font-serif text-sm mb-2">Yang bertanda tangan di bawah ini:</p>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-3 font-medium">Nama Lengkap</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8 font-bold">{namaKamad || data.headmaster?.name || "Kepala Madrasah"}</span>

                <span className="col-span-3 font-medium">NIP</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8 font-mono">{nipKamad || data.headmaster?.nip || "-"}</span>

                <span className="col-span-3 font-medium">Pangkat / Golongan</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8">{pangkatKamad || data.headmaster?.pangkatGol || "-"}</span>

                <span className="col-span-3 font-medium">Jabatan</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8">{data.headmaster?.jabatan || `Kepala ${data.madrasah.name}`}</span>

                <span className="col-span-3 font-medium">Unit Kerja</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8 font-bold">{data.madrasah.name}</span>

                <span className="col-span-3 font-medium">Alamat Unit Kerja</span>
                <span className="col-span-1">:</span>
                <span className="col-span-8">{data.madrasah.address || "-"}</span>
              </div>
            </div>

            {/* Pernyataan */}
            <div className="space-y-3 text-xs leading-relaxed text-justify mb-6">
              <p>
                Dengan ini menyatakan dengan sesungguhnya dan penuh tanggung jawab bahwa:
              </p>

              <ol className="list-decimal list-outside pl-5 space-y-2">
                <li>
                  Data kehadiran Pendidik dan Tenaga Kependidikan pada <b>{data.madrasah.name}</b> untuk periode bulan <b>{data.period.monthName} {data.period.year}</b> sebagaimana tercantum dalam Berita Acara Pemeriksaan (BAP) Kehadiran terlampir sejumlah <b>{data.summary.totalTeachers} orang</b> adalah <b>BENAR dan SAH</b> berdasarkan rekaman presensi elektronik (fingerprint/mobile GPS).
                </li>
                <li>
                  Seluruh Pendidik yang diajukan benar-benar aktif melaksanakan tugas pembelajaran dan memenuhi batas minimal kehadiran sesuai ketentuan petunjuk teknis pencairan <b>Tunjangan Profesi Guru (TPG) / Tunjangan Kinerja</b> Kementerian Agama RI. Sebanyak <b>{data.summary.totalEligible} orang</b> dinyatakan <b>MEMENUHI SYARAT (MS)</b> dengan rata-rata kedisiplinan kehadiran madrasah sebesar <b>{data.summary.averageAttendance}%</b>.
                </li>
                <li>
                  Bukti fisik pendukung berupa arsip presensi digital, surat tugas dinas luar resmi, serta surat keterangan sakit/izin tersimpan dengan rapi pada madrasah dan siap diverifikasi sewaktu-waktu oleh Tim Pengawas atau Pejabat Berwenang Kementerian Agama.
                </li>
                <li>
                  Apabila di kemudian hari terbukti pernyataan ini tidak benar atau ditemukan pemalsuan data yang menimbulkan kerugian keuangan negara, saya bersedia bertanggung jawab penuh secara administratif maupun hukum pidana, serta bersedia mengembalikan seluruh kerugian tersebut ke Kas Negara sesuai ketentuan perundang-undangan.
                </li>
              </ol>

              <p className="pt-2">
                Demikian Surat Pertanggungjawaban Mutlak (SPTJM) ini saya buat dengan sadar dan sesungguhnya untuk dipergunakan sebagaimana mestinya sebagai syarat pencairan Tunjangan Profesi Guru (TPG) / Simpatika Kemenag.
              </p>
            </div>

            {/* Tanda Tangan & Kotak Materai */}
            <div className="flex justify-end pt-4 font-sans">
              <div className="w-64 text-center space-y-1 text-xs">
                <p>
                  {kotaMadrasah}, {tanggalSurat}
                </p>
                <p className="font-bold">Kepala {data.madrasah.name}</p>

                {/* Materai Placeholder */}
                <div className="my-3 mx-auto w-24 h-16 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[10px] text-slate-400 font-mono">
                  <span>MATERAI</span>
                  <span className="font-bold">Rp 10.000</span>
                </div>

                <p className="font-bold underline text-sm pt-1">
                  {namaKamad || data.headmaster?.name || "Kepala Madrasah"}
                </p>
                <p className="font-mono text-[11px]">
                  NIP. {nipKamad || data.headmaster?.nip || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== BAP PREVIEW ======================== */
        <div className="w-full flex justify-center py-4 bg-muted/40 rounded-3xl border border-border overflow-x-auto">
          <div className="w-[1100px] min-h-[700px] bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-200 font-sans text-xs select-text printable-bap">
            {/* Kop BAP */}
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Kementerian Agama Republik Indonesia
              </h4>
              <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
                BERITA ACARA PEMERIKSAAN KEHADIRAN GURU & TENAGA KEPENDIDIKAN
              </h2>
              <p className="text-xs font-bold text-emerald-800 uppercase">
                {data.madrasah.name} &bull; BULAN {data.period.monthName.toUpperCase()} {data.period.year}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Nomor: {nomorBap} &bull; Hari Efektif: {data.period.totalEffectiveDays} Hari &bull; Periode: {data.period.startDateStr} s/d {data.period.endDateStr}
              </p>
            </div>

            {/* Tabel Rekapitulasi Kolektif */}
            <div className="overflow-x-auto rounded border border-slate-300 mb-4">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white text-[10px] uppercase font-bold text-center">
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 w-8">No</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 text-left min-w-[180px]">Nama Lengkap & Gelar</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 min-w-[120px]">NIP / NUPTK</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 text-left min-w-[110px]">Jabatan</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 w-16">Status</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 w-10">HE</th>
                    <th colSpan={6} className="border border-emerald-950 p-1">Rincian Kehadiran (Hari)</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 w-12">Total Hadir</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 w-14">% Hadir</th>
                    <th rowSpan={2} className="border border-emerald-950 p-1.5 w-24">Status TPG</th>
                  </tr>
                  <tr className="bg-emerald-800 text-white text-[9px] uppercase font-bold text-center">
                    <th className="border border-emerald-950 p-1 w-8">H</th>
                    <th className="border border-emerald-950 p-1 w-8">DL</th>
                    <th className="border border-emerald-950 p-1 w-8">TL</th>
                    <th className="border border-emerald-950 p-1 w-8">I</th>
                    <th className="border border-emerald-950 p-1 w-8">S</th>
                    <th className="border border-emerald-950 p-1 w-8">A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.rows.map((row) => (
                    <tr key={row.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 p-1.5 text-center font-mono">{row.no}</td>
                      <td className="border border-slate-300 p-1.5 font-bold text-slate-800">{row.name}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono text-[10px]">
                        {row.nip !== "-" ? row.nip : row.nuptk !== "-" ? row.nuptk : row.pegId}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700">{row.jabatan}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-[10px]">{row.statusKepegawaian}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">{row.workDays}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-emerald-700 font-bold">{row.hadir}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-indigo-700 font-bold">{row.dinasLuar}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-amber-700">{row.terlambat}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-blue-700">{row.izin}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-purple-700">{row.sakit}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-rose-700 font-bold">{row.alpa}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-extrabold text-slate-900 bg-slate-50">
                        {row.totalHadir}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-black">
                        {row.attendancePercentage}%
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            row.isEligibleTpg
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {row.isEligibleTpg ? "MEMENUHI SYARAT" : "TMS"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Keterangan & Tanda Tangan */}
            <div className="grid grid-cols-3 gap-6 pt-2 text-xs">
              {/* Operator */}
              <div className="text-center space-y-1">
                <p className="text-slate-500">Pembuat Berita Acara / Operator,</p>
                <p className="font-bold">Petugas Presensi Simpatika</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">
                  {data.operator?.name || "Operator Madrasah"}
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  NIP. {data.operator?.nip || "-"}
                </p>
              </div>

              {/* Pengawas (jika ada) */}
              <div className="text-center space-y-1">
                {namaPengawas ? (
                  <>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="font-bold">Pengawas Pembina Madrasah</p>
                    <div className="h-16" />
                    <p className="font-bold underline text-slate-900">{namaPengawas}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      NIP. {nipPengawas || "-"}
                    </p>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-[10px] space-y-1 text-slate-600">
                    <p className="font-bold text-slate-800">Catatan Validasi:</p>
                    <p>&bull; H = Hadir Tepat Waktu</p>
                    <p>&bull; DL = Dinas Luar (Dihitung 100% Hadir)</p>
                    <p>&bull; Syarat TPG: Kehadiran &ge; 85% & Tanpa Alpa</p>
                  </div>
                )}
              </div>

              {/* Kepala Madrasah */}
              <div className="text-center space-y-1">
                <p className="text-slate-500">
                  {kotaMadrasah}, {tanggalSurat}
                </p>
                <p className="font-bold">Kepala {data.madrasah.name}</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">
                  {namaKamad || data.headmaster?.name || "Kepala Madrasah"}
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  NIP. {nipKamad || data.headmaster?.nip || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
