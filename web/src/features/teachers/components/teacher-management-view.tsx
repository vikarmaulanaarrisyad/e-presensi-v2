"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  Mail, 
  School, 
  Sparkles,
  UserCheck,
  UserX,
  FileCheck,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  Printer,
  Briefcase,
  IdCard,
  Award,
  Calendar,
  MapPin,
  Eye,
  X
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { ImportExcelModal } from "./import-excel-modal";
import { TeacherFormModal, type TeacherData } from "./teacher-form-modal";
import { 
  exportTeachersToExcel, 
  downloadTeacherTemplate,
  formatTeacherName,
  maskNik,
  stripLeadingQuote 
} from "@/lib/excel-helpers";
import { 
  toggleTeacherStatusAction, 
  deleteTeacherAction, 
  resetTeacherPasswordAction,
  fetchTeachersData
} from "@/server/actions/teacher.actions";
import { 
  swalLoading, 
  swalSuccess, 
  swalError, 
  swalClose, 
  swalConfirm 
} from "@/lib/swal";

export interface TeacherItem {
  id: string;
  name: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  email: string;
  nip: string | null;
  nik?: string | null;
  pegId?: string | null;
  nuptk?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | Date | null;
  gender?: string | null;
  statusKepegawaian?: string | null;
  jenisGtk?: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  positionId?: string | null;
  position?: {
    id: string;
    name: string;
    code?: string | null;
    isHeadmaster?: boolean;
  } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    attendanceLogs: number;
  };
}

interface TeacherManagementViewProps {
  initialData: {
    madrasahId: string;
    madrasahName: string;
    nsm: string;
    radiusMeters: number;
    teachers: TeacherItem[];
    positions?: {
      id: string;
      name: string;
      code?: string | null;
      isHeadmaster?: boolean;
    }[];
  };
}

export function TeacherManagementView({ initialData }: TeacherManagementViewProps) {
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialData.teachers || []);
  const [positions, setPositions] = useState(initialData.positions || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [kepegawaianFilter, setKepegawaianFilter] = useState<string>("all");

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<TeacherData | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<TeacherItem | null>(null);

  // Reload data
  const reloadData = async () => {
    const res = await fetchTeachersData(initialData.madrasahId);
    if (res?.data?.teachers) {
      setTeachers(res.data.teachers as any);
    }
    if ((res?.data as any)?.positions) {
      setPositions((res?.data as any).positions);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((t) => t.isActive).length;
    const emisLinked = teachers.filter((t) => Boolean((t.pegId && t.pegId.trim()) || (t.nuptk && t.nuptk.trim()))).length;
    const pnsCount = teachers.filter((t) => t.statusKepegawaian === "PNS" || t.statusKepegawaian === "PPPK" || Boolean(t.nip && t.nip.trim())).length;
    return { total, active, emisLinked, pnsCount };
  }, [teachers]);

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Status Filter
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;

      // Kepegawaian Filter
      if (kepegawaianFilter !== "all") {
        if (kepegawaianFilter === "PNS" && t.statusKepegawaian !== "PNS") return false;
        if (kepegawaianFilter === "PPPK" && t.statusKepegawaian !== "PPPK") return false;
        if (kepegawaianFilter === "NON_PNS" && (t.statusKepegawaian === "PNS" || t.statusKepegawaian === "PPPK")) return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchNip = t.nip ? t.nip.toLowerCase().includes(q) : false;
      const matchNik = t.nik ? t.nik.toLowerCase().includes(q) : false;
      const matchPegId = t.pegId ? t.pegId.toLowerCase().includes(q) : false;
      const matchNuptk = t.nuptk ? t.nuptk.toLowerCase().includes(q) : false;
      const matchPhone = t.phone ? t.phone.toLowerCase().includes(q) : false;
      const matchTempatLahir = t.tempatLahir ? t.tempatLahir.toLowerCase().includes(q) : false;

      return matchName || matchEmail || matchNip || matchNik || matchPegId || matchNuptk || matchPhone || matchTempatLahir;
    });
  }, [teachers, searchQuery, statusFilter, kepegawaianFilter]);

  // Handle Edit Teacher
  const handleEdit = (teacher: TeacherItem) => {
    setTeacherToEdit({
      id: teacher.id,
      name: teacher.name,
      gelarDepan: teacher.gelarDepan,
      gelarBelakang: teacher.gelarBelakang,
      email: teacher.email,
      nip: teacher.nip,
      nik: teacher.nik,
      pegId: teacher.pegId,
      nuptk: teacher.nuptk,
      tempatLahir: teacher.tempatLahir,
      tanggalLahir: teacher.tanggalLahir,
      gender: teacher.gender,
      statusKepegawaian: teacher.statusKepegawaian,
      jenisGtk: teacher.jenisGtk,
      phone: teacher.phone,
      isActive: teacher.isActive,
      positionId: teacher.positionId,
    });
    setIsFormModalOpen(true);
  };

  // Handle Create Teacher
  const handleCreate = () => {
    setTeacherToEdit(null);
    setIsFormModalOpen(true);
  };

  // Toggle Active Status
  const handleToggleStatus = async (teacher: TeacherItem) => {
    const newStatus = !teacher.isActive;
    const actionLabel = newStatus ? "Mengaktifkan" : "Menonaktifkan";

    const confirmed = await swalConfirm(
      `${actionLabel} Guru?`,
      `Apakah Anda yakin ingin ${actionLabel.toLowerCase()} akses presensi untuk ${formatTeacherName(teacher.name, teacher.gelarDepan, teacher.gelarBelakang)}?`,
      newStatus ? "Aktifkan" : "Nonaktifkan",
      newStatus ? "question" : "warning"
    );

    if (!confirmed) return;

    swalLoading(`${actionLabel} akun...`);
    const res = await toggleTeacherStatusAction(teacher.id, newStatus);
    swalClose();

    if (res?.success) {
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, isActive: newStatus } : t))
      );
      swalSuccess(
        "Status Diperbarui",
        `Guru berhasil di-${newStatus ? "aktifkan" : "nonaktifkan"}.`
      );
    } else {
      swalError("Gagal Mengubah Status", res?.error || "Terjadi kesalahan pada server.");
    }
  };

  // Reset Password
  const handleResetPassword = async (teacher: TeacherItem) => {
    const fullName = formatTeacherName(teacher.name, teacher.gelarDepan, teacher.gelarBelakang);
    const confirmed = await swalConfirm(
      "Reset Kata Sandi?",
      `Kata sandi untuk ${fullName} akan direset menjadi default: Password123!`,
      "Ya, Reset Sandi",
      "warning"
    );

    if (!confirmed) return;

    swalLoading("Mereset Kata Sandi...");
    const res = await resetTeacherPasswordAction(teacher.id, "Password123!");
    swalClose();

    if (res?.success) {
      swalSuccess(
        "Kata Sandi Direset!",
        `Kata sandi baru untuk ${fullName} adalah: Password123!`
      );
    } else {
      swalError("Gagal Reset", res?.error || "Terjadi kesalahan saat mereset sandi.");
    }
  };

  // Delete Teacher
  const handleDeleteTeacher = async (teacher: TeacherItem) => {
    const fullName = formatTeacherName(teacher.name, teacher.gelarDepan, teacher.gelarBelakang);
    const confirmed = await swalConfirm(
      "Hapus Data Guru?",
      `Perhatian: Menghapus ${fullName} akan menghapus riwayat presensi yang terkait secara permanen!`,
      "Ya, Hapus Permanen",
      "error"
    );

    if (!confirmed) return;

    swalLoading("Menghapus Data Guru...");
    const res = await deleteTeacherAction(teacher.id);
    swalClose();

    if (res?.success) {
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
      swalSuccess("Berhasil Dihapus", `Data guru ${fullName} telah dihapus dari sistem.`);
    } else {
      swalError("Gagal Menghapus", res?.error || "Terjadi kesalahan saat menghapus data.");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full select-none animate-in fade-in duration-200">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <School className="size-3.5 text-primary" />
            <span>{initialData.madrasahName}</span>
            <span>&bull;</span>
            <span className="font-mono">NSM: {initialData.nsm}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Manajemen Data Guru &amp; Tenaga Kependidikan
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              EMIS 4.0 Synced
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola data pendidik, gelar akademik, Peg ID, NUPTK, NIP, serta sinkronisasi Excel unduhan resmi EMISGTK Kemenag.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/reports">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Printer className="size-4 text-emerald-600" />}
              className="text-xs font-semibold text-foreground hover:bg-muted"
            >
              Cetak Presensi F4
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadTeacherTemplate}
            leftIcon={<Download className="size-3.5 text-muted-foreground" />}
            className="text-xs font-medium"
            title="Download Template Format EMIS GTK 4.0"
          >
            Format EMIS 4.0
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
            className="text-xs font-semibold border-emerald-500/30 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Import Excel EMIS
          </Button>

          <Link
            href="/admin/positions"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/25 shadow-xs transition-colors cursor-pointer"
            title="Kelola Master Jabatan & Kepala Madrasah"
          >
            <Briefcase className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>Master Jabatan</span>
          </Link>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleCreate}
            leftIcon={<Plus className="size-4" />}
            className="text-xs font-semibold shadow-xs"
          >
            Tambah Guru
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guru */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
              Total Pendidik &amp; GTK
            </span>
            <span className="text-2xl font-black text-foreground mt-1 block">
              {stats.total}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Terdaftar di {initialData.madrasahName}
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="size-5" />
          </div>
        </div>

        {/* Guru Aktif */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
              Guru Aktif Presensi
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {stats.active}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Akses absensi GPS aktif
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
        </div>

        {/* Terdata EMIS 4.0 */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
              Terdata EMIS / Simpatika
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              {stats.emisLinked}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Memiliki Peg ID / NUPTK resmi
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <IdCard className="size-5" />
          </div>
        </div>

        {/* PNS / PPPK */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
              PNS &amp; PPPK
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {stats.pnsCount}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Pegawai ASN Satuan Pendidikan
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Award className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama, gelar, PegID, NUPTK, NIP, NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 rounded-xl bg-background border border-border text-xs focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Keaktifan */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({teachers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-emerald-500 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Aktif ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "inactive"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Non-Aktif ({stats.total - stats.active})
              </button>
            </div>

            {/* Filter Kepegawaian */}
            <select
              value={kepegawaianFilter}
              onChange={(e) => setKepegawaianFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
            >
              <option value="all">Semua Status Pegawai</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="NON_PNS">Non-PNS / GTY / Honor</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportTeachersToExcel(filteredTeachers, initialData.madrasahName)}
              leftIcon={<Download className="size-3.5" />}
              className="h-9 text-xs"
            >
              Export Excel EMIS
            </Button>
          </div>
        </div>

        {/* Teachers Datatable */}
        <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/70">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 min-w-[220px]">Guru / GTK &amp; Gelar</th>
                <th className="py-3 px-3">Peg ID &amp; NUPTK</th>
                <th className="py-3 px-3">NIP / NIK</th>
                <th className="py-3 px-3">Tempat, Tgl Lahir</th>
                <th className="py-3 px-3">Kontak Akun</th>
                <th className="py-3 px-3 text-center">Presensi</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="size-8 text-muted-foreground/40" />
                      <span className="font-semibold text-foreground text-sm">
                        Tidak ada guru yang sesuai
                      </span>
                      <span className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery
                          ? `Tidak ditemukan guru dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                          : "Belum ada guru yang didaftarkan. Gunakan tombol Tambah Guru atau Import Excel EMIS di atas."}
                      </span>
                      {!searchQuery && (
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => setIsImportModalOpen(true)}
                          leftIcon={<Upload className="size-3.5" />}
                          className="mt-2 text-xs"
                        >
                          Import File Excel EMIS Sekarang
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                  const initialLetter = teacher.name.charAt(0).toUpperCase();
                  const displayName = formatTeacherName(teacher.name, teacher.gelarDepan, teacher.gelarBelakang);

                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Number */}
                      <td className="py-3 px-3 text-center text-muted-foreground font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Name, Gelar & Position */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-[#0A5C36] to-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {initialLetter}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {/* Position Badge */}
                              {teacher.position ? (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    teacher.position.isHeadmaster
                                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                      : "bg-primary/10 text-primary border border-primary/20"
                                  }`}
                                >
                                  {teacher.position.isHeadmaster ? "👑 " : "📌 "}
                                  {teacher.position.name}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  {teacher.jenisGtk || "Guru Madrasah"}
                                </span>
                              )}

                              {/* Status Kepegawaian Badge */}
                              {teacher.statusKepegawaian && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border font-medium">
                                  {teacher.statusKepegawaian}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PegID & NUPTK */}
                      <td className="py-3 px-3 font-mono text-xs">
                        {teacher.pegId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-1 py-0.2 rounded">
                              PEG
                            </span>
                            <span className="font-bold text-foreground text-[11px]">
                              {stripLeadingQuote(teacher.pegId)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">
                            Belum Ada PegID
                          </span>
                        )}
                        {teacher.nuptk && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1 py-0.2 rounded">
                              NUPTK
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {stripLeadingQuote(teacher.nuptk)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* NIP & NIK */}
                      <td className="py-3 px-3 font-mono text-xs">
                        {teacher.nip ? (
                          <span className="px-1.5 py-0.5 rounded bg-muted font-semibold text-foreground border border-border text-[11px] block w-fit">
                            {stripLeadingQuote(teacher.nip)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic block">
                            Non-PNS
                          </span>
                        )}
                        {teacher.nik && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono" title="NIK disamarkan untuk perlindungan data">
                            NIK: {maskNik(teacher.nik)}
                          </span>
                        )}
                      </td>

                      {/* Tempat & Tanggal Lahir */}
                      <td className="py-3 px-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          {teacher.gender && (
                            <span
                              className={`px-1 rounded text-[9px] font-bold ${
                                teacher.gender === "L" || teacher.gender.toLowerCase().startsWith("l")
                                  ? "bg-blue-500/15 text-blue-600"
                                  : "bg-rose-500/15 text-rose-600"
                              }`}
                            >
                              {teacher.gender === "L" || teacher.gender.toLowerCase().startsWith("l") ? "L" : "P"}
                            </span>
                          )}
                          <span>{teacher.tempatLahir || "-"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {teacher.tanggalLahir
                            ? new Date(teacher.tanggalLahir).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-[11px] text-foreground font-mono truncate max-w-[150px]">
                            <Mail className="size-2.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{teacher.email}</span>
                          </div>
                          {teacher.phone ? (
                            <a
                              href={`https://wa.me/${teacher.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-mono"
                            >
                              <Phone className="size-2.5 text-emerald-500 shrink-0" />
                              <span>{teacher.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              No WA (-)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Presensi */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">
                          {teacher._count?.attendanceLogs ?? 0} Kali
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(teacher)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            teacher.isActive
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20"
                              : "bg-slate-500/15 text-slate-700 dark:text-slate-400 hover:bg-slate-500/25 border border-slate-500/20"
                          }`}
                          title="Klik untuk ubah status aktif/non-aktif"
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              teacher.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{teacher.isActive ? "Aktif" : "Non-Aktif"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setTeacherDetail(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="Lihat Detail Profil EMIS GTK"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          <Link
                            href={`/admin/reports?teacherId=${teacher.id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="Cetak Lembar Presensi F4 Guru Ini"
                          >
                            <Printer className="size-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleResetPassword(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Reset Password ke Password123!"
                          >
                            <KeyRound className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Edit Biodata Guru & EMIS GTK"
                          >
                            <Edit3 className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus Guru"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>
            Menampilkan <strong>{filteredTeachers.length}</strong> dari <strong>{teachers.length}</strong> pendidik
          </span>
          <span className="italic text-[11px]">
            Password standar akun baru: <strong>Password123!</strong>
          </span>
        </div>
      </div>

      {/* DETAIL MODAL GTK EMIS 4.0 */}
      {teacherDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-[#00288E] to-[#0A5C36] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <IdCard className="size-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    Kartu Data GTK (EMIS 4.0 Kemenag)
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Rincian identitas pendidik &amp; nomor registrasi resmi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTeacherDetail(null)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 text-xs">
              {/* Full Name & Position Banner */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center gap-3">
                <div className="size-12 rounded-full bg-primary text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                  {teacherDetail.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-foreground">
                    {formatTeacherName(teacherDetail.name, teacherDetail.gelarDepan, teacherDetail.gelarBelakang)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-semibold text-primary">
                      {teacherDetail.position?.name || teacherDetail.jenisGtk || "Guru Madrasah"}
                    </span>
                    <span>&bull;</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                      {teacherDetail.statusKepegawaian || "PNS"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">Peg ID (EMIS)</span>
                  <span className="font-mono font-bold text-foreground text-xs mt-0.5 block">
                    {stripLeadingQuote(teacherDetail.pegId) || "-"}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">NUPTK</span>
                  <span className="font-mono font-bold text-foreground text-xs mt-0.5 block">
                    {stripLeadingQuote(teacherDetail.nuptk) || "-"}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">NIP</span>
                  <span className="font-mono font-bold text-foreground text-xs mt-0.5 block">
                    {stripLeadingQuote(teacherDetail.nip) || "Non-PNS"}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground block font-medium">NIK KTP</span>
                    <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">Tersamar</span>
                  </div>
                  <span className="font-mono font-bold text-foreground text-xs mt-0.5 block">
                    {maskNik(teacherDetail.nik)}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">Tempat, Tanggal Lahir</span>
                  <span className="text-foreground text-xs mt-0.5 block">
                    {teacherDetail.tempatLahir ? `${teacherDetail.tempatLahir}, ` : ""}
                    {teacherDetail.tanggalLahir
                      ? new Date(teacherDetail.tanggalLahir).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">Jenis Kelamin</span>
                  <span className="text-foreground text-xs mt-0.5 block">
                    {teacherDetail.gender === "L" || teacherDetail.gender?.toLowerCase().startsWith("l")
                      ? "Laki-laki (L)"
                      : teacherDetail.gender === "P" || teacherDetail.gender?.toLowerCase().startsWith("p")
                      ? "Perempuan (P)"
                      : "-"}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Informasi Kontak &amp; Akun Mobile
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email Login:</span>
                  <span className="font-mono font-semibold text-foreground">{teacherDetail.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">WhatsApp / HP:</span>
                  <span className="font-mono font-semibold text-emerald-600">{teacherDetail.phone || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Presensi:</span>
                  <span className="font-bold text-primary">{teacherDetail._count?.attendanceLogs ?? 0} Kali</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border flex items-center justify-end bg-muted/30">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTeacherDetail(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        madrasahId={initialData.madrasahId}
        onImportSuccess={reloadData}
      />

      <TeacherFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        madrasahId={initialData.madrasahId}
        teacherToEdit={teacherToEdit}
        positions={positions}
        onSuccess={reloadData}
      />
    </div>
  );
}
