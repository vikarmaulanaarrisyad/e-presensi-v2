"use client";

import React, { useState, useMemo } from "react";
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
  Filter
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { ImportExcelModal } from "./import-excel-modal";
import { TeacherFormModal, type TeacherData } from "./teacher-form-modal";
import { 
  exportTeachersToExcel, 
  downloadTeacherTemplate 
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
  email: string;
  nip: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
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
  };
}

export function TeacherManagementView({ initialData }: TeacherManagementViewProps) {
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialData.teachers || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<TeacherData | null>(null);

  // Reload data
  const reloadData = async () => {
    const res = await fetchTeachersData(initialData.madrasahId);
    if (res?.data?.teachers) {
      setTeachers(res.data.teachers as any);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((t) => t.isActive).length;
    const inactive = total - active;
    const hasNip = teachers.filter((t) => Boolean(t.nip && t.nip.trim().length > 0)).length;
    return { total, active, inactive, hasNip };
  }, [teachers]);

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Status Filter
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchNip = t.nip ? t.nip.toLowerCase().includes(q) : false;
      const matchPhone = t.phone ? t.phone.toLowerCase().includes(q) : false;

      return matchName || matchEmail || matchNip || matchPhone;
    });
  }, [teachers, searchQuery, statusFilter]);

  // Toggle Active Status
  const handleToggleStatus = async (teacher: TeacherItem) => {
    const newStatus = !teacher.isActive;
    const actionText = newStatus ? "Mengaktifkan" : "Menonaktifkan";

    swalLoading(`${actionText} Guru...`, "Memperbarui izin akses di sistem...");
    const res = await toggleTeacherStatusAction(teacher.id, newStatus);
    swalClose();

    if (res?.success) {
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, isActive: newStatus } : t))
      );
      swalSuccess(
        `Status Diperbarui`,
        `Guru ${teacher.name} kini berstatus ${newStatus ? "Aktif" : "Non-Aktif"}.`
      );
    } else {
      swalError("Gagal Mengubah Status", res?.error || "Terjadi kesalahan.");
    }
  };

  // Reset Password
  const handleResetPassword = async (teacher: TeacherItem) => {
    const isConfirmed = await swalConfirm(
      "Reset Password Guru?",
      `Password untuk "${teacher.name}" akan direset ke password standar: "Password123!". Lanjutkan?`,
      "Ya, Reset Password",
      "Batal"
    );

    if (!isConfirmed) return;

    swalLoading("Mereset Password...", "Menyimpan password baru...");
    const res = await resetTeacherPasswordAction(teacher.id, "Password123!");
    swalClose();

    if (res?.success) {
      swalSuccess("Password Berhasil Direset!", `Password guru "${teacher.name}" telah direset ke: Password123!`);
    } else {
      swalError("Gagal Reset Password", res?.error || "Terjadi kesalahan.");
    }
  };

  // Delete Teacher
  const handleDeleteTeacher = async (teacher: TeacherItem) => {
    const isConfirmed = await swalConfirm(
      "Hapus Data Guru?",
      `Apakah Anda yakin ingin menghapus akun guru "${teacher.name}"? Riwayat presensi terkait juga akan dihapus.`,
      "Ya, Hapus Guru",
      "Batal"
    );

    if (!isConfirmed) return;

    swalLoading("Menghapus...", "Sedang menghapus akun dari database...");
    const res = await deleteTeacherAction(teacher.id);
    swalClose();

    if (res?.success) {
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
      swalSuccess("Dihapus!", `Guru ${teacher.name} telah dihapus.`);
    } else {
      swalError("Gagal Menghapus", res?.error || "Gagal menghapus data guru.");
    }
  };

  // Open Edit Form
  const handleEdit = (teacher: TeacherItem) => {
    setTeacherToEdit({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      nip: teacher.nip,
      phone: teacher.phone,
      isActive: teacher.isActive,
    });
    setIsFormModalOpen(true);
  };

  // Open Create Form
  const handleCreate = () => {
    setTeacherToEdit(null);
    setIsFormModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full select-none">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-sm border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Manajemen Data Guru & Tenaga Kependidikan
            </h1>
            <Badge variant="gold">Modul Guru</Badge>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Kelola daftar pendidik, NIP/NIK, kredensial login mobile, status aktifasi, dan impor data massal dari spreadsheet Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadTeacherTemplate}
            leftIcon={<Download className="size-3.5" />}
            className="border-white/20 text-white hover:bg-white/10 text-xs"
          >
            Format Excel
          </Button>

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<FileSpreadsheet className="size-4" />}
            className="shadow-sm text-xs font-bold"
          >
            Import Excel
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleCreate}
            leftIcon={<Plus className="size-4" />}
            className="bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-sm"
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
              Total Pendidik
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
              Guru Aktif
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {stats.active}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Dapat melakukan presensi mobile
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
        </div>

        {/* Guru Non-Aktif */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Non-Aktif / Cuti
            </span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block">
              {stats.inactive}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Akses presensi dinonaktifkan
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-slate-500/10 text-slate-600 flex items-center justify-center">
            <UserX className="size-5" />
          </div>
        </div>

        {/* Memiliki NIP */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
              Memiliki NIP
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {stats.hasNip}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              {stats.total > 0 ? `${Math.round((stats.hasNip / stats.total) * 100)}% dari total guru` : "0%"}
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <FileCheck className="size-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-5">
        {/* Table Toolbar: Search, Status Filter & Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama guru, NIP, email, no HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Aktif ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "inactive"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Non-Aktif ({stats.inactive})
              </button>
            </div>

            {/* Export Excel Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportTeachersToExcel(filteredTeachers, initialData.madrasahName)}
              leftIcon={<Download className="size-3.5" />}
              className="h-9 text-xs"
            >
              Export Excel
            </Button>
          </div>
        </div>

        {/* Teachers Datatable */}
        <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/70">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Guru / Tenaga Pendidik</th>
                <th className="py-3 px-4">NIP / NIK</th>
                <th className="py-3 px-4">Kontak (Email & WA)</th>
                <th className="py-3 px-4 text-center">Total Presensi</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="size-8 text-muted-foreground/40" />
                      <span className="font-semibold text-foreground text-sm">
                        Tidak ada guru yang sesuai
                      </span>
                      <span className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery
                          ? `Tidak ditemukan guru dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                          : "Belum ada guru yang didaftarkan. Gunakan tombol Tambah Guru atau Import Excel di atas."}
                      </span>
                      {!searchQuery && (
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => setIsImportModalOpen(true)}
                          leftIcon={<Upload className="size-3.5" />}
                          className="mt-2 text-xs"
                        >
                          Import Data dari Excel Sekarang
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                  const initialLetter = teacher.name.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Number */}
                      <td className="py-3.5 px-4 text-center text-muted-foreground font-mono">
                        {idx + 1}
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-[#0A5C36] to-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {initialLetter}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {teacher.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Didaftarkan {new Date(teacher.createdAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {teacher.nip ? (
                          <span className="px-2 py-0.5 rounded-md bg-muted font-semibold text-foreground border border-border">
                            {teacher.nip}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">
                            Non-PNS / Belum Ada
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                            <Mail className="size-3 text-muted-foreground shrink-0" />
                            <span>{teacher.email}</span>
                          </div>
                          {teacher.phone ? (
                            <a
                              href={`https://wa.me/${teacher.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-mono"
                            >
                              <Phone className="size-3 text-emerald-500 shrink-0" />
                              <span>{teacher.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Tidak ada no HP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Presensi */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                          {teacher._count?.attendanceLogs ?? 0} Kali
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(teacher)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
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
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                            title="Reset Password ke Password123!"
                          >
                            <KeyRound className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit Biodata Guru"
                          >
                            <Edit3 className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
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
        onSuccess={reloadData}
      />
    </div>
  );
}
