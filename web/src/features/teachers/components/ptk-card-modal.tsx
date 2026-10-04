"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Printer, 
  Download, 
  X, 
  IdCard, 
  Layers, 
  KeyRound, 
  QrCode, 
  Scissors, 
  CheckSquare, 
  Square, 
  Users, 
  School, 
  Check, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info,
  Phone,
  Mail,
  Award
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { 
  exportPtkCardsToPdf, 
  printPtkCardsPdf, 
  type PtkCardLayout,
  type PtkCardExportOptions 
} from "../utils/ptk-card-pdf";
import { formatTeacherName, stripLeadingQuote, maskNik } from "@/lib/excel-helpers";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";
import type { TeacherItem } from "./teacher-management-view";

interface PtkCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  madrasah: {
    id: string;
    name: string;
    nsm: string;
    npsn?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  teachers: TeacherItem[];
  preSelectedTeacherId?: string | null;
}

export function PtkCardModal({
  isOpen,
  onClose,
  madrasah,
  teachers,
  preSelectedTeacherId,
}: PtkCardModalProps) {
  // Configuration States
  const [layout, setLayout] = useState<PtkCardLayout>("6_per_page");
  const [defaultPassword, setDefaultPassword] = useState("Password123!");
  const [showQrCode, setShowQrCode] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);
  const [showNik, setShowNik] = useState(false);
  const [notesText, setNotesText] = useState(
    "Jaga kerahasiaan kata sandi. Segera perbarui di profil aplikasi setelah login."
  );

  // Selection mode: "all" | "active" | "custom"
  const [selectionMode, setSelectionMode] = useState<"all" | "active" | "custom">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Preview teacher index
  const [previewTeacherIndex, setPreviewTeacherIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize selected IDs
  useEffect(() => {
    if (!isOpen) return;

    if (preSelectedTeacherId) {
      setSelectionMode("custom");
      setSelectedIds(new Set([preSelectedTeacherId]));
      const idx = teachers.findIndex((t) => t.id === preSelectedTeacherId);
      if (idx !== -1) setPreviewTeacherIndex(idx);
    } else {
      setSelectionMode("all");
      setSelectedIds(new Set(teachers.map((t) => t.id)));
      setPreviewTeacherIndex(0);
    }
  }, [isOpen, preSelectedTeacherId, teachers]);

  // Handle selection mode change
  const handleModeChange = (mode: "all" | "active" | "custom") => {
    setSelectionMode(mode);
    if (mode === "all") {
      setSelectedIds(new Set(teachers.map((t) => t.id)));
    } else if (mode === "active") {
      setSelectedIds(new Set(teachers.filter((t) => t.isActive).map((t) => t.id)));
    }
  };

  const toggleSelectTeacher = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    setSelectionMode("custom");
  };

  const toggleSelectAllCustom = () => {
    if (selectedIds.size === teachers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(teachers.map((t) => t.id)));
    }
    setSelectionMode("custom");
  };

  // Teachers that will be printed
  const teachersToPrint = useMemo(() => {
    if (selectionMode === "all") {
      return teachers;
    }
    if (selectionMode === "active") {
      return teachers.filter((t) => t.isActive);
    }
    return teachers.filter((t) => selectedIds.has(t.id));
  }, [teachers, selectionMode, selectedIds]);

  // Current teacher for live preview
  const currentPreviewTeacher = useMemo(() => {
    if (teachersToPrint.length === 0) return null;
    const safeIdx = Math.min(previewTeacherIndex, teachersToPrint.length - 1);
    return teachersToPrint[safeIdx] || teachersToPrint[0];
  }, [teachersToPrint, previewTeacherIndex]);

  // Calculation for F4 sheets
  const cardsPerPage = layout === "8_per_page" ? 8 : layout === "4_per_page" ? 4 : 6;
  const totalSheetsNeeded = Math.ceil(teachersToPrint.length / cardsPerPage);

  if (!isOpen) return null;

  // Export handlers
  const getExportOptions = (): PtkCardExportOptions => {
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/guru/login` : "/guru/login";
    return {
      madrasah,
      teachers: teachersToPrint,
      defaultPassword,
      portalUrl,
      layout,
      showQrCode,
      showCutLines,
      showNik,
      notesText,
    };
  };

  const handleDownloadPdf = async () => {
    if (teachersToPrint.length === 0) {
      swalError("Pilih Guru", "Tidak ada guru yang dipilih untuk dicetak.");
      return;
    }

    try {
      setIsExporting(true);
      swalLoading("Menyiapkan Kartu PTK (Kertas F4)...", `Sedang menata ${teachersToPrint.length} kartu ke dalam ${totalSheetsNeeded} lembar F4...`);
      const options = getExportOptions();
      await exportPtkCardsToPdf(options);
      swalClose();
      swalSuccess("Unduhan Berhasil!", `File PDF Kartu PTK F4 berhasil diunduh (${totalSheetsNeeded} lembar).`);
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mengunduh PDF", err?.message || "Terjadi kesalahan saat membuat dokumen PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectPrint = async () => {
    if (teachersToPrint.length === 0) {
      swalError("Pilih Guru", "Tidak ada guru yang dipilih untuk dicetak.");
      return;
    }

    try {
      setIsExporting(true);
      swalLoading("Menyiapkan Cetak F4...", "Menghubungkan dokumen kartu PTK ke printer...");
      const options = getExportOptions();
      await printPtkCardsPdf(options);
      swalClose();
    } catch (err: any) {
      swalClose();
      swalError("Gagal Mencetak", err?.message || "Terjadi kesalahan saat memproses cetak langsung.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-[#032514] via-[#0A5C36] to-[#043d22] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
              <IdCard className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Cetak Kartu PTK &amp; Kredensial Login Guru
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-amber-400 text-amber-950 font-mono shadow-xs">
                  Ukuran Kertas F4 (Folio)
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Cetak multi-kartu per lembar F4 lengkap dengan Username, Kata Sandi, dan QR Code untuk dibagikan ke GTK {madrasah.name}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Content - 2 Column Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* LEFT COLUMN: Konfigurasi & Pilihan Cetak (5 Cols) */}
          <div className="lg:col-span-6 p-5 flex flex-col gap-5 overflow-y-auto bg-muted/20">
            {/* 1. Layout Kertas F4 Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>Format Layout Kertas F4</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* 6 Cards */}
                <button
                  type="button"
                  onClick={() => setLayout("6_per_page")}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    layout === "6_per_page"
                      ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary"
                      : "bg-card border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">6 Kartu / F4</span>
                    {layout === "6_per_page" && <Check className="size-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Ukuran 95 x 96 mm
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded w-fit mt-0.5">
                    ★ Direkomendasikan
                  </span>
                </button>

                {/* 8 Cards */}
                <button
                  type="button"
                  onClick={() => setLayout("8_per_page")}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    layout === "8_per_page"
                      ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary"
                      : "bg-card border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">8 Kartu / F4</span>
                    {layout === "8_per_page" && <Check className="size-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Ukuran 95 x 72 mm
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
                    Hemat Kertas (ID Card)
                  </span>
                </button>

                {/* 4 Cards */}
                <button
                  type="button"
                  onClick={() => setLayout("4_per_page")}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    layout === "4_per_page"
                      ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary"
                      : "bg-card border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">4 Kartu / F4</span>
                    {layout === "4_per_page" && <Check className="size-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Ukuran 95 x 144 mm
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
                    Format Slip Serah-Terima
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Pengaturan Kata Sandi Cetak */}
            <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="defaultPasswordInput">
                  <KeyRound className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Kata Sandi yang Dicetak</span>
                </label>
                <span className="text-[10px] text-muted-foreground">Default Madrasah</span>
              </div>

              <div className="relative">
                <input
                  id="defaultPasswordInput"
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="Contoh: Password123!"
                  className="w-full h-9 px-3 font-mono text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary focus:outline-none text-foreground font-bold"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Kata sandi ini yang tertera pada kotak kredensial kartu cetak. Guru diimbau mengganti kata sandi setelah berhasil login pertama.
              </p>
            </div>

            {/* 3. Pilihan Guru yang Dicetak */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  <span>Pilih Pendidik &amp; GTK</span>
                </label>
                <span className="text-xs font-bold text-primary">
                  {teachersToPrint.length} Guru Dipilih
                </span>
              </div>

              {/* Mode Pills */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => handleModeChange("all")}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    selectionMode === "all"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({teachers.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("active")}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    selectionMode === "active"
                      ? "bg-emerald-500 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Aktif Saja ({teachers.filter((t) => t.isActive).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("custom")}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    selectionMode === "custom"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pilih Manual ({selectedIds.size})
                </button>
              </div>

              {/* Custom selection list (collapsible / visible when custom) */}
              {selectionMode === "custom" && (
                <div className="border border-border rounded-xl bg-card p-2 flex flex-col gap-1.5 max-h-44 overflow-y-auto mt-1">
                  <div className="flex items-center justify-between pb-1 px-2 border-b border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Daftar Guru Madrasah:
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllCustom}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      {selectedIds.size === teachers.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>
                  {teachers.map((teacher) => {
                    const isSelected = selectedIds.has(teacher.id);
                    return (
                      <label
                        key={teacher.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTeacher(teacher.id)}
                          className="size-4 rounded accent-primary cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-medium">
                            {formatTeacherName(teacher.name, teacher.gelarDepan, teacher.gelarBelakang)}
                          </span>
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {teacher.nip ? `NIP: ${teacher.nip}` : teacher.pegId ? `PegID: ${teacher.pegId}` : teacher.email}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Opsi Tampilan Tambahan */}
            <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-col gap-2 shadow-xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Pengaturan Elemen Kartu
              </span>

              <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                <span className="flex items-center gap-2">
                  <QrCode className="size-4 text-emerald-600" />
                  <span>Sertakan QR Code Scan Login</span>
                </span>
                <input
                  type="checkbox"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                <span className="flex items-center gap-2">
                  <Scissors className="size-4 text-slate-500" />
                  <span>Garis Panduan Potong (Cut Lines)</span>
                </span>
                <input
                  type="checkbox"
                  checked={showCutLines}
                  onChange={(e) => setShowCutLines(e.target.checked)}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-amber-500" />
                  <span>Tampilkan NIK KTP (Tersamar)</span>
                </span>
                <input
                  type="checkbox"
                  checked={showNik}
                  onChange={(e) => setShowNik(e.target.checked)}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Card Preview & Info Kertas F4 (7 Cols) */}
          <div className="lg:col-span-6 p-5 flex flex-col gap-4 bg-muted/40">
            {/* Sheet Estimator Summary Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-primary/15 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  F4
                </div>
                <div>
                  <span className="text-xs font-extrabold text-foreground block">
                    Kertas F4 (Folio 215 &times; 330 mm)
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    {teachersToPrint.length} Kartu &bull; {cardsPerPage} per Lembar &bull; Membutuhkan <strong>{totalSheetsNeeded} Lembar Kertas</strong>
                  </span>
                </div>
              </div>

              {/* Navigation between preview teachers */}
              {teachersToPrint.length > 1 && (
                <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewTeacherIndex((prev) => (prev > 0 ? prev - 1 : teachersToPrint.length - 1))}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Guru Sebelumnya"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1.5">
                    {previewTeacherIndex + 1}/{teachersToPrint.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewTeacherIndex((prev) => (prev < teachersToPrint.length - 1 ? prev + 1 : 0))}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Guru Selanjutnya"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* LIVE CARD PREVIEW CONTAINER */}
            <div className="flex flex-col items-center justify-center p-3">
              <span className="text-[11px] font-bold text-muted-foreground mb-2 self-start flex items-center gap-1.5">
                <Eye className="size-3.5 text-primary" />
                <span>Pratinjau Visual Kartu PTK (Skala 1:1)</span>
              </span>

              {currentPreviewTeacher ? (
                <div 
                  className={`w-full max-w-[390px] bg-white text-slate-900 rounded-2xl shadow-xl border-2 border-slate-300 overflow-hidden flex flex-col relative transition-all ${
                    showCutLines ? "ring-2 ring-dashed ring-slate-400 ring-offset-4 ring-offset-muted/40" : ""
                  }`}
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-[#0A5C36] to-[#043d22] text-white p-3 flex items-center gap-2.5 relative border-b-2 border-amber-500">
                    <div className="size-9 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img
                        src="/icons/app-logo.png"
                        alt="Logo"
                        className="size-full object-contain"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-amber-300 tracking-wider uppercase block leading-none">
                        KARTU IDENTITAS &amp; AKSES PTK
                      </span>
                      <h4 className="text-xs font-black truncate text-white mt-0.5 leading-tight">
                        {madrasah.name.toUpperCase()}
                      </h4>
                      <span className="text-[9px] text-emerald-100 block font-mono truncate">
                        NSM: {madrasah.nsm || "-"} {madrasah.npsn ? `| NPSN: ${madrasah.npsn}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex flex-col gap-2.5 bg-white">
                    {/* Name & Badges */}
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {formatTeacherName(currentPreviewTeacher.name, currentPreviewTeacher.gelarDepan, currentPreviewTeacher.gelarBelakang)}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {currentPreviewTeacher.position?.name || currentPreviewTeacher.jenisGtk || "Guru Madrasah"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                          {currentPreviewTeacher.statusKepegawaian || "PNS"}
                        </span>
                      </div>
                    </div>

                    {/* Identity Details Grid */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Peg ID (EMIS)</span>
                        <span className="font-mono font-bold text-slate-800">
                          {stripLeadingQuote(currentPreviewTeacher.pegId) || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">NUPTK</span>
                        <span className="font-mono font-bold text-slate-800">
                          {stripLeadingQuote(currentPreviewTeacher.nuptk) || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">NIP</span>
                        <span className="font-mono font-bold text-slate-800">
                          {stripLeadingQuote(currentPreviewTeacher.nip) || "Non-PNS"}
                        </span>
                      </div>
                      {showNik && currentPreviewTeacher.nik ? (
                        <div>
                          <span className="text-[9px] text-slate-500 block">NIK KTP</span>
                          <span className="font-mono text-slate-800">
                            {maskNik(currentPreviewTeacher.nik)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] text-slate-500 block">No. HP / WA</span>
                          <span className="font-mono text-emerald-700 font-semibold">
                            {(() => {
                              const rawPhone = stripLeadingQuote(currentPreviewTeacher.phone);
                              const isPhone = rawPhone && !rawPhone.toLowerCase().includes("pns") && (rawPhone.replace(/[^0-9]/g, "").length >= 7 || rawPhone.startsWith("+"));
                              return isPhone ? rawPhone : "-";
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Credential Box (Kontras & Sangat Jelas) */}
                    <div className="rounded-xl border border-sky-300 bg-sky-50/80 p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-black text-sky-800 uppercase tracking-wider mb-1">
                          <KeyRound className="size-3 text-sky-600" />
                          <span>Kredensial Login E-Presensi</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-500 w-16 text-[10px]">Username:</span>
                          <span className="font-mono font-bold text-sky-900 truncate">
                            {currentPreviewTeacher.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] mt-0.5">
                          <span className="text-slate-500 w-16 text-[10px]">Password:</span>
                          <span className="font-mono font-black text-amber-700 bg-amber-100/80 px-1 rounded border border-amber-200">
                            {defaultPassword}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] mt-0.5 text-slate-500">
                          <span className="w-16">Link Login:</span>
                          <span className="font-mono font-semibold text-slate-800 truncate">
                            /guru/login
                          </span>
                        </div>
                      </div>

                      {/* QR Code Demo Box */}
                      {showQrCode && (
                        <div className="size-16 rounded-lg bg-white border border-slate-300 p-1 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <QrCode className="size-10 text-[#0A5C36]" />
                          <span className="text-[7px] font-black text-emerald-800 mt-0.5">
                            SCAN LOGIN
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer security note */}
                    <div className="text-[9px] text-center text-slate-400 italic pt-0.5 border-t border-slate-100">
                      {notesText}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Tidak ada guru yang dipilih untuk pratinjau.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-4 text-primary shrink-0" />
            <span>
              Siapkan kertas ukuran <strong>F4 / Folio (215 &times; 330 mm)</strong> pada printer Anda.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
            >
              Tutup
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDirectPrint}
              disabled={isExporting || teachersToPrint.length === 0}
              leftIcon={<Printer className="size-4 text-emerald-600" />}
              className="text-xs font-semibold"
            >
              Cetak Langsung
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting || teachersToPrint.length === 0}
              isLoading={isExporting}
              leftIcon={<Download className="size-4" />}
              className="text-xs font-semibold shadow-xs"
            >
              Download PDF ({totalSheetsNeeded} Lembar F4)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
