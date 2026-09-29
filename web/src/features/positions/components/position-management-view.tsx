"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  Crown, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Save, 
  ArrowLeft,
  GraduationCap,
  Building2,
  HelpCircle,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { FormInput } from "@/components/molecules/form-field";
import { 
  createPositionAction, 
  updatePositionAction, 
  deletePositionAction, 
  seedDefaultPositionsAction,
  fetchPositionsData 
} from "@/server/actions/position.actions";
import { swalLoading, swalSuccess, swalError, swalClose, swalConfirm } from "@/lib/swal";

export interface PositionItem {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isHeadmaster: boolean;
  order: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    users: number;
  };
  users?: {
    id: string;
    name: string;
    nip: string | null;
    avatarUrl: string | null;
    isActive: boolean;
  }[];
}

interface PositionManagementViewProps {
  initialData: {
    madrasahId: string;
    madrasahName: string;
    nsm: string;
    positions: PositionItem[];
  };
}

export function PositionManagementView({ initialData }: PositionManagementViewProps) {
  const [positions, setPositions] = useState<PositionItem[]>(initialData.positions || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "headmaster" | "staff">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formOrder, setFormOrder] = useState<number>(0);
  const [formIsHeadmaster, setFormIsHeadmaster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reload positions from DB
  const reloadData = async () => {
    const res = await fetchPositionsData(initialData.madrasahId);
    if (res?.data?.positions) {
      setPositions(res.data.positions as any);
    }
  };

  // KPI Calculations
  const headmasterPosition = useMemo(
    () => positions.find((p) => p.isHeadmaster),
    [positions]
  );

  const headmasterUsers = headmasterPosition?.users || [];
  const totalAssignedUsers = useMemo(
    () => positions.reduce((acc, p) => acc + (p._count?.users || 0), 0),
    [positions]
  );

  // Filtered Positions
  const filteredPositions = useMemo(() => {
    return positions.filter((pos) => {
      const matchSearch =
        pos.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pos.code && pos.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pos.description && pos.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchFilter =
        filterType === "all" ||
        (filterType === "headmaster" && pos.isHeadmaster) ||
        (filterType === "staff" && !pos.isHeadmaster);

      return matchSearch && matchFilter;
    });
  }, [positions, searchQuery, filterType]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPosition(null);
    setFormName("");
    setFormCode("");
    setFormDesc("");
    setFormOrder(positions.length + 1);
    setFormIsHeadmaster(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (pos: PositionItem) => {
    setEditingPosition(pos);
    setFormName(pos.name);
    setFormCode(pos.code || "");
    setFormDesc(pos.description || "");
    setFormOrder(pos.order || 0);
    setFormIsHeadmaster(pos.isHeadmaster);
    setIsModalOpen(true);
  };

  // Submit Position Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      swalError("Nama Jabatan Wajib Diisi", "Silakan masukkan nama jabatan yang valid.");
      return;
    }

    setIsSubmitting(true);
    swalLoading(
      editingPosition ? "Menyimpan Perubahan..." : "Menambahkan Jabatan...",
      "Memproses data jabatan di database..."
    );

    try {
      let res: any;
      if (editingPosition) {
        res = await updatePositionAction(editingPosition.id, {
          name: formName.trim(),
          code: formCode.trim() || null,
          description: formDesc.trim() || null,
          isHeadmaster: formIsHeadmaster,
          order: formOrder,
        });
      } else {
        res = await createPositionAction(initialData.madrasahId, {
          name: formName.trim(),
          code: formCode.trim() || null,
          description: formDesc.trim() || null,
          isHeadmaster: formIsHeadmaster,
          order: formOrder,
        });
      }

      swalClose();

      if (res?.error) {
        swalError("Gagal Menyimpan", res.error);
      } else {
        swalSuccess(
          editingPosition ? "Jabatan Diperbarui!" : "Jabatan Berhasil Dibuat!",
          editingPosition
            ? `Perubahan jabatan ${formName} telah disimpan.`
            : `Jabatan baru ${formName} siap digunakan pada data guru.`
        );
        setIsModalOpen(false);
        reloadData();
      }
    } catch (err: any) {
      swalClose();
      swalError("Terjadi Kesalahan", err?.message || "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Position
  const handleDeletePosition = async (pos: PositionItem) => {
    const isConfirmed = await swalConfirm(
      `Hapus Jabatan "${pos.name}"?`,
      pos._count?.users && pos._count.users > 0
        ? `Terdapat ${pos._count.users} pegawai yang saat ini memegang jabatan ini. Jika dihapus, jabatan pegawai terkait akan dikosongkan.`
        : "Jabatan ini akan dihapus secara permanen dari sistem."
    );

    if (!isConfirmed) return;

    swalLoading("Menghapus Jabatan...", "Menghapus jabatan dari database...");
    const res = await deletePositionAction(pos.id);
    swalClose();

    if (res?.error) {
      swalError("Gagal Menghapus", res.error);
    } else {
      swalSuccess("Jabatan Dihapus!", `Jabatan "${pos.name}" berhasil dihapus.`);
      reloadData();
    }
  };

  // Seed Default Kemenag Positions
  const handleSeedDefaults = async () => {
    const isConfirmed = await swalConfirm(
      "Muat Standar Jabatan Kemenag?",
      "Sistem akan mendaftarkan 10 formasi jabatan standar madrasah (Kepala Madrasah, Wakil Kepala, Guru Kelas, Mapel, TU, BK, dll) secara otomatis."
    );

    if (!isConfirmed) return;

    swalLoading("Menerapkan Standar Kemenag...", "Menyusun formasi jabatan resmi ke database...");
    const res = await seedDefaultPositionsAction(initialData.madrasahId);
    swalClose();

    if (res && "error" in res) {
      swalError("Gagal Memuat Preset", (res as any).error);
    } else {
      swalSuccess("Standar Kemenag Diterapkan!", "Formasi jabatan standar madrasah berhasil dimuat.");
      reloadData();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/teachers"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
              title="Kembali ke Kelola Guru"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Briefcase className="size-6 text-primary shrink-0" />
              <span>Master Jabatan & Struktur Madrasah</span>
            </h1>
            <Badge variant="gold">Organisasi Madrasah</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola hierarki jabatan, penugasan Kepala Madrasah, wakil kepala, guru kelas, serta tenaga kependidikan untuk {initialData.madrasahName}.
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeedDefaults}
            leftIcon={<RotateCcw className="size-3.5 text-amber-600 dark:text-amber-400" />}
            className="text-xs font-semibold border-amber-500/30 text-amber-800 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
          >
            Standar Kemenag
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="size-4" />}
            className="text-xs font-bold shadow-xs"
          >
            Tambah Jabatan
          </Button>
        </div>
      </div>

      {/* ── 2. KPI METRIC SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Jabatan */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Jabatan
            </span>
            <span className="text-2xl font-black text-foreground mt-1">
              {positions.length}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Formasi terdaftar di madrasah
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Briefcase className="size-5" />
          </div>
        </div>

        {/* Card 2: Kepala Madrasah */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card border border-amber-500/30 shadow-sm flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Crown className="size-3.5 text-amber-600" />
              <span>Kepala Madrasah</span>
            </span>
            <span className="text-sm font-extrabold text-foreground mt-1 truncate">
              {headmasterUsers.length > 0
                ? headmasterUsers[0].name
                : "Belum Ditetapkan"}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {headmasterUsers.length > 0 && headmasterUsers[0].nip
                ? `NIP. ${headmasterUsers[0].nip}`
                : "Tandai pada salah satu guru"}
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Crown className="size-5 text-amber-600" />
          </div>
        </div>

        {/* Card 3: Guru & Pegawai Terplot */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pegawai Terplot
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {totalAssignedUsers} Orang
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Telah memiliki jabatan spesifik
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Users className="size-5" />
          </div>
        </div>

        {/* Card 4: Status Sinkronisasi Dokumen */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Format Laporan F4
            </span>
            <span className="text-sm font-extrabold text-foreground mt-1">
              Tercetak di Rekap
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Otomatis terisi di lembar presensi
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="size-5" />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari nama jabatan, kode, deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === "all"
                ? "bg-primary text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({positions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType("headmaster")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterType === "headmaster"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crown className="size-3" />
            <span>Kepala Madrasah</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("staff")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === "staff"
                ? "bg-primary text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Guru & Tendik
          </button>
        </div>
      </div>

      {/* ── 4. POSITIONS DATATABLE ── */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-12 text-center">Urutan</th>
                <th className="py-3 px-4">Nama Jabatan & Kode</th>
                <th className="py-3 px-4">Deskripsi / Peran Pokok</th>
                <th className="py-3 px-4">Pegawai Pemegang Jabatan</th>
                <th className="py-3 px-4 text-center">Tipe Penugasan</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Briefcase className="size-8 text-muted-foreground/40" />
                      <span className="font-semibold text-sm">Tidak ada data jabatan ditemukan</span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Silakan buat jabatan baru atau terapkan formasi standar Kemenag dengan tombol di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos, idx) => {
                  return (
                    <tr
                      key={pos.id}
                      className={`hover:bg-muted/30 transition-colors group ${
                        pos.isHeadmaster ? "bg-amber-500/5 hover:bg-amber-500/10" : ""
                      }`}
                    >
                      {/* Urutan */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-muted-foreground">
                        {pos.order || idx + 1}
                      </td>

                      {/* Nama & Kode */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                            pos.isHeadmaster
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {pos.isHeadmaster ? <Crown className="size-4" /> : <GraduationCap className="size-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              {pos.name}
                              {pos.isHeadmaster && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold">
                                  KAMAD
                                </span>
                              )}
                            </span>
                            {pos.code && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                Kode: {pos.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3.5 px-4 max-w-xs text-muted-foreground">
                        {pos.description || "-"}
                      </td>

                      {/* Pegawai Pemegang Jabatan */}
                      <td className="py-3.5 px-4">
                        {pos.users && pos.users.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-foreground">
                              {pos.users.length} Pegawai
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {pos.users.slice(0, 3).map((u) => (
                                <span
                                  key={u.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] text-foreground font-medium border border-border"
                                >
                                  {u.name}
                                </span>
                              ))}
                              {pos.users.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{pos.users.length - 3} lainnya
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">
                            Belum ada guru diplot
                          </span>
                        )}
                      </td>

                      {/* Tipe Penugasan */}
                      <td className="py-3.5 px-4 text-center">
                        {pos.isHeadmaster ? (
                          <Badge variant="gold" icon={<Crown className="size-3" />}>
                            Kepala Madrasah
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Fungsional / Staf
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pos)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit Jabatan"
                          >
                            <Edit3 className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePosition(pos)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Hapus Jabatan"
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

        {/* Table Footer */}
        <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
          <span>
            Menampilkan <strong>{filteredPositions.length}</strong> jabatan
          </span>
          <span className="italic text-[11px]">
            Jabatan bertanda 👑 Kepala Madrasah otomatis digunakan sebagai penanggung jawab resmi laporan.
          </span>
        </div>
      </div>

      {/* ── 5. MODAL FORM: TAMBAH / EDIT JABATAN ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/70 flex items-center justify-between bg-gradient-to-r from-[#042817] to-[#0A5C36] text-white">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200">
                  <Briefcase className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingPosition ? "Edit Jabatan Madrasah" : "Tambah Jabatan Baru"}
                  </h3>
                  <p className="text-xs text-emerald-100/80">
                    {editingPosition
                      ? "Perbarui nama, kode, atau status penanggung jawab."
                      : "Daftarkan jabatan atau tugas tambahan baru untuk pegawai madrasah."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 flex flex-col gap-4">
              <FormInput
                label="Nama Jabatan Resmi"
                placeholder="Contoh: Kepala Madrasah / Guru Kelas / Wakamad"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Kode Singkatan (Opsional)"
                  placeholder="Contoh: KAMAD / GURU / TU"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />

                <FormInput
                  label="Nomor Urutan Tampilan"
                  type="number"
                  placeholder="Contoh: 1"
                  value={String(formOrder)}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Deskripsi / Tugas Pokok
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan tugas utama atau uraian tanggung jawab jabatan ini..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Special Headmaster Toggle */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="headmasterCheck"
                  checked={formIsHeadmaster}
                  onChange={(e) => setFormIsHeadmaster(e.target.checked)}
                  className="mt-0.5 size-4 rounded text-amber-600 focus:ring-amber-500 border-border"
                />
                <label htmlFor="headmasterCheck" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">
                    👑 Tandai sebagai Kepala Madrasah
                  </span>
                  <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 block leading-relaxed">
                    Pegawai dengan jabatan ini akan ditetapkan sebagai Kepala Madrasah resmi penandatangan laporan rekapitulasi presensi dan dokumen Kemenag.
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSubmitting}
                  leftIcon={<Save className="size-4" />}
                >
                  {editingPosition ? "Simpan Perubahan" : "Tambah Jabatan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
