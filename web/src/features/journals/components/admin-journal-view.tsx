"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  Download,
  FileSpreadsheet,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  School,
  Sparkles,
  UserCheck,
  GraduationCap,
  Calendar,
  Clock,
  Printer,
  Eye,
  X,
  Camera,
  Image as ImageIcon,
  Users,
  AlertCircle,
  Filter,
  FileText,
  ChevronRight,
  Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/atoms/button";
import {
  getMadrasahJournalsAdminAction,
  createTeachingJournalAction,
  updateTeachingJournalAction,
  deleteTeachingJournalAction,
} from "@/server/actions/teaching-journal.actions";
import {
  swalLoading,
  swalSuccess,
  swalError,
  swalClose,
  swalConfirm,
} from "@/lib/swal";

export interface JournalItem {
  id: string;
  date: string;
  className: string;
  subjectName: string;
  sessionHours: string;
  topicTitle: string;
  activities: string;
  studentPresence?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  teacherId?: string;
  teacherName?: string;
  teacherNip?: string;
  teacherAvatar?: string | null;
}

interface AdminJournalViewProps {
  initialData: {
    madrasah: {
      id: string;
      name: string;
      nsm?: string | null;
      address?: string | null;
    };
    teachers: {
      id: string;
      name: string;
      nip?: string | null;
    }[];
  };
}

const commonClasses = [
  "VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B",
  "X MIPA 1", "X MIPA 2", "XI MIPA", "XII MIPA"
];

const commonSubjects = [
  "Al-Qur'an Hadits", "Akidah Akhlak", "Fiqih", "SKI",
  "Bahasa Arab", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris"
];

const commonHours = [
  "Jam 1 - 2 (07.15 - 08.35)",
  "Jam 3 - 4 (08.35 - 09.55)",
  "Jam 5 - 6 (10.15 - 11.35)",
  "Jam 7 - 8 (12.00 - 13.20)",
  "Jam 9 - 10 (13.20 - 14.40)",
];

export function AdminJournalView({ initialData }: AdminJournalViewProps) {
  const { madrasah, teachers } = initialData;

  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "month">("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Modals state
  const [journalDetail, setJournalDetail] = useState<JournalItem | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [journalToEdit, setJournalToEdit] = useState<JournalItem | null>(null);

  // Form State
  const [formUserId, setFormUserId] = useState<string>(teachers[0]?.id || "");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formClass, setFormClass] = useState<string>("VII A");
  const [formSubject, setFormSubject] = useState<string>("Al-Qur'an Hadits");
  const [formHours, setFormHours] = useState<string>("Jam 1 - 2 (07.15 - 08.35)");
  const [formTopic, setFormTopic] = useState<string>("");
  const [formActivities, setFormActivities] = useState<string>("");
  const [formStudentPresence, setFormStudentPresence] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formPhoto, setFormPhoto] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch journals
  const loadJournals = async () => {
    setIsLoading(true);
    try {
      const res = await getMadrasahJournalsAdminAction(madrasah.id, {
        teacherId: selectedTeacherId !== "all" ? selectedTeacherId : undefined,
        className: selectedClass !== "all" ? selectedClass : undefined,
        dateStr: selectedDate || undefined,
      });

      if (res?.success && res.data) {
        setJournals(res.data);
      } else {
        setJournals([]);
      }
    } catch (err) {
      console.error("Gagal memuat jurnal admin:", err);
      setJournals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, [selectedTeacherId, selectedClass, selectedDate]);

  // Available classes list
  const availableClasses = useMemo(() => {
    const set = new Set<string>(commonClasses);
    journals.forEach((j) => {
      if (j.className) set.add(j.className);
    });
    return Array.from(set).sort();
  }, [journals]);

  // Filtered Journals based on Period & Search
  const filteredJournals = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = todayStr.substring(0, 7); // "YYYY-MM"

    return journals.filter((j) => {
      // Period Filter
      if (periodFilter === "today" && j.date !== todayStr) return false;
      if (periodFilter === "month" && !j.date.startsWith(currentMonth)) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTeacher = j.teacherName ? j.teacherName.toLowerCase().includes(q) : false;
      const matchNip = j.teacherNip ? j.teacherNip.toLowerCase().includes(q) : false;
      const matchSubject = j.subjectName.toLowerCase().includes(q);
      const matchClass = j.className.toLowerCase().includes(q);
      const matchTopic = j.topicTitle.toLowerCase().includes(q);
      const matchActivities = j.activities.toLowerCase().includes(q);
      const matchNotes = j.notes ? j.notes.toLowerCase().includes(q) : false;

      return (
        matchTeacher ||
        matchNip ||
        matchSubject ||
        matchClass ||
        matchTopic ||
        matchActivities ||
        matchNotes
      );
    });
  }, [journals, periodFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = journals.length;
    const uniqueTeachers = new Set(journals.map((j) => j.teacherId || j.teacherName)).size;
    const uniqueClasses = new Set(journals.map((j) => j.className)).size;
    const withPhotos = journals.filter((j) => Boolean(j.photoUrl)).length;
    return { total, uniqueTeachers, uniqueClasses, withPhotos };
  }, [journals]);

  // Handle Open Create Modal
  const handleOpenCreate = () => {
    setJournalToEdit(null);
    setFormUserId(teachers[0]?.id || "");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormClass("VII A");
    setFormSubject("Al-Qur'an Hadits");
    setFormHours("Jam 1 - 2 (07.15 - 08.35)");
    setFormTopic("");
    setFormActivities("");
    setFormStudentPresence("");
    setFormNotes("");
    setFormPhoto("");
    setIsFormModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (j: JournalItem) => {
    setJournalToEdit(j);
    setFormUserId(j.teacherId || teachers[0]?.id || "");
    setFormDate(j.date);
    setFormClass(j.className);
    setFormSubject(j.subjectName);
    setFormHours(j.sessionHours);
    setFormTopic(j.topicTitle);
    setFormActivities(j.activities);
    setFormStudentPresence(j.studentPresence || "");
    setFormNotes(j.notes || "");
    setFormPhoto(j.photoUrl || "");
    setIsFormModalOpen(true);
  };

  // Submit Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() || !formActivities.trim()) {
      swalError("Kolom Kurang Lengkap", "Judul materi dan uraian aktivitas pembelajaran wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    swalLoading(journalToEdit ? "Menyimpan perubahan jurnal..." : "Menyimpan jurnal baru...");

    try {
      if (journalToEdit) {
        const res = await updateTeachingJournalAction(journalToEdit.id, {
          date: formDate,
          className: formClass,
          subjectName: formSubject,
          sessionHours: formHours,
          topicTitle: formTopic,
          activities: formActivities,
          studentPresence: formStudentPresence || undefined,
          notes: formNotes || undefined,
          photoUrl: formPhoto || undefined,
        });
        swalClose();

        if (res.success) {
          swalSuccess("Berhasil Diperbarui", "Catatan jurnal pembelajaran berhasil disimpan.");
          setIsFormModalOpen(false);
          loadJournals();
        } else {
          swalError("Gagal Memperbarui", res.error || "Terjadi kesalahan.");
        }
      } else {
        const res = await createTeachingJournalAction({
          userId: formUserId,
          date: formDate,
          className: formClass,
          subjectName: formSubject,
          sessionHours: formHours,
          topicTitle: formTopic,
          activities: formActivities,
          studentPresence: formStudentPresence || undefined,
          notes: formNotes || undefined,
          photoUrl: formPhoto || undefined,
        });
        swalClose();

        if (res.success) {
          swalSuccess("Berhasil Dibuat", "Jurnal pembelajaran berhasil dicatat ke sistem.");
          setIsFormModalOpen(false);
          loadJournals();
        } else {
          swalError("Gagal Menyimpan", res.error || "Terjadi kesalahan.");
        }
      }
    } catch (err: any) {
      swalClose();
      swalError("Terjadi Kesalahan", err?.message || "Gagal menyimpan jurnal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Journal
  const handleDeleteJournal = async (j: JournalItem) => {
    const confirmed = await swalConfirm(
      "Hapus Jurnal Pembelajaran?",
      `Apakah Anda yakin ingin menghapus jurnal "${j.topicTitle}" (${j.subjectName} - ${j.className})?`,
      "Ya, Hapus Jurnal",
      "error"
    );

    if (!confirmed) return;

    swalLoading("Menghapus data jurnal...");
    const res = await deleteTeachingJournalAction(j.id);
    swalClose();

    if (res?.success) {
      setJournals((prev) => prev.filter((item) => item.id !== j.id));
      swalSuccess("Berhasil Dihapus", "Catatan jurnal KBM telah dihapus.");
    } else {
      swalError("Gagal Menghapus", res?.error || "Terjadi kesalahan saat menghapus.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredJournals.length === 0) {
      swalError("Tidak Ada Data", "Tidak ada data jurnal yang dapat diekspor dengan filter saat ini.");
      return;
    }

    const headers = [
      "No",
      "Tanggal",
      "Guru Pengajar",
      "NIP",
      "Kelas",
      "Mata Pelajaran",
      "Jam Pelajaran",
      "Topik / Materi KBM",
      "Aktivitas Pembelajaran",
      "Kehadiran Siswa",
      "Catatan / Kendala",
      "Dokumentasi Foto",
    ];

    const rows = filteredJournals.map((j, idx) => [
      idx + 1,
      new Date(j.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      j.teacherName || "Guru",
      j.teacherNip || "-",
      j.className,
      j.subjectName,
      j.sessionHours,
      j.topicTitle,
      j.activities,
      j.studentPresence || "Hadir Semua",
      j.notes || "-",
      j.photoUrl ? "Ada Foto" : "Tidak Ada",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 26 },
      { wch: 20 },
      { wch: 10 },
      { wch: 22 },
      { wch: 24 },
      { wch: 30 },
      { wch: 40 },
      { wch: 20 },
      { wch: 25 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal KBM");

    const fileName = `Jurnal_KBM_${madrasah.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    swalSuccess("File Excel Diunduh", `Rekap jurnal KBM berhasil disimpan sebagai ${fileName}.`);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full select-none animate-in fade-in duration-200">
      {/* ── TOP BANNER / BREADCRUMB ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <School className="size-3.5 text-primary" />
            <span>{madrasah.name}</span>
            <span>&bull;</span>
            <span className="font-mono">NSM: {madrasah.nsm || "-"}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Jurnal Pembelajaran &amp; Aktivitas KBM Guru
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              KBM Terverifikasi
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoring kegiatan belajar mengajar, materi pembelajaran, ketercapaian jam mengajar, dan absensi siswa harian oleh dewan guru.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="size-4 text-emerald-600" />}
            className="text-xs font-semibold text-foreground hover:bg-muted"
          >
            Cetak Jurnal
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
            className="text-xs font-semibold border-emerald-500/30 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Export Excel Jurnal
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="size-4" />}
            className="text-xs font-semibold shadow-xs"
          >
            Tambah Jurnal KBM
          </Button>
        </div>
      </div>

      {/* ── 4 KPI CARDS (Matching Teacher Management) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jurnal */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
              Total Jurnal KBM
            </span>
            <span className="text-2xl font-black text-foreground mt-1 block">
              {stats.total}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Dokumentasi KBM di {madrasah.name}
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen className="size-5" />
          </div>
        </div>

        {/* Guru Aktif Mengajar */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
              Guru Aktif Mengajar
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {stats.uniqueTeachers}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Dewan guru pengisi jurnal aktif
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
        </div>

        {/* Rombel & Kelas */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
              Kelas &amp; Rombel Terlayani
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              {stats.uniqueClasses}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Rombongan belajar terdata KBM
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <GraduationCap className="size-5" />
          </div>
        </div>

        {/* Dokumentasi Foto */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
              Foto Dokumentasi
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {stats.withPhotos}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Jurnal dengan bukti foto kegiatan
            </span>
          </div>
          <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Camera className="size-5" />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CARD ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari guru, mapel, kelas, atau topik materi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-9 rounded-xl bg-background border border-border text-xs focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Periode Filter */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setPeriodFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  periodFilter === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({journals.length})
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("today")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  periodFilter === "today"
                    ? "bg-emerald-500 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("month")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  periodFilter === "month"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bulan Ini
              </button>
            </div>

            {/* Filter Guru */}
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs max-w-[180px]"
            >
              <option value="all">Semua Guru ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Filter Kelas */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 px-2.5 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  title="Reset Tanggal"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── JOURNALS DATATABLE ── */}
        <div className="border border-border/80 rounded-xl overflow-hidden shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/70">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 min-w-[200px]">Guru Pengajar &amp; NIP</th>
                <th className="py-3 px-3">Tanggal &amp; Jam Ke</th>
                <th className="py-3 px-3">Kelas &amp; Mapel</th>
                <th className="py-3 px-4 min-w-[220px]">Topik Materi &amp; Aktivitas</th>
                <th className="py-3 px-3">Absensi Siswa</th>
                <th className="py-3 px-3 text-center">Foto</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Memuat data jurnal KBM...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="size-8 text-muted-foreground/40" />
                      <span className="font-semibold text-foreground text-sm">
                        Tidak ada jurnal KBM yang sesuai
                      </span>
                      <span className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery
                          ? `Tidak ditemukan jurnal dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                          : "Belum ada catatan jurnal KBM untuk filter ini. Guru dapat mengisi dari aplikasi mobile atau klik Tambah Jurnal di atas."}
                      </span>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleOpenCreate}
                        leftIcon={<Plus className="size-3.5" />}
                        className="mt-2 text-xs"
                      >
                        Tambah Jurnal KBM Sekarang
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJournals.map((j, idx) => {
                  const initialLetter = (j.teacherName || "G").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={j.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Number */}
                      <td className="py-3 px-3 text-center text-muted-foreground font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Guru & NIP */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-[#0A5C36] to-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {initialLetter}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {j.teacherName || "Guru GTK"}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {j.teacherNip ? (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  NIP. {j.teacherNip}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  Guru Madrasah
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tanggal & Jam Ke */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-xs">
                            {new Date(j.date).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3 text-muted-foreground/70" />
                            {j.sessionHours}
                          </span>
                        </div>
                      </td>

                      {/* Kelas & Mapel */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 w-fit">
                            Kelas {j.className}
                          </span>
                          <span className="font-semibold text-foreground text-xs">
                            {j.subjectName}
                          </span>
                        </div>
                      </td>

                      {/* Topik Materi & Aktivitas */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-xs line-clamp-1">
                            {j.topicTitle}
                          </span>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                            {j.activities}
                          </p>
                          {j.notes && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded w-fit mt-1">
                              Catatan: {j.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Absensi Siswa */}
                      <td className="py-3 px-3">
                        {j.studentPresence ? (
                          <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border text-[11px] font-medium block w-fit">
                            {j.studentPresence}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">
                            Hadir Semua
                          </span>
                        )}
                      </td>

                      {/* Foto Dokumentasi */}
                      <td className="py-3 px-3 text-center">
                        {j.photoUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhoto({
                                url: j.photoUrl!,
                                title: `${j.subjectName} - Kelas ${j.className} (${j.teacherName || "Guru"})`,
                              })
                            }
                            className="size-8 rounded-lg overflow-hidden border border-border inline-block hover:ring-2 hover:ring-primary transition-all shadow-2xs group/img"
                            title="Klik untuk melihat foto"
                          >
                            <img
                              src={j.photoUrl}
                              alt="Bukti KBM"
                              className="size-full object-cover group-hover/img:scale-110 transition-transform"
                            />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">-</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => setJournalDetail(j)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Lihat Detail Jurnal KBM"
                          >
                            <Eye className="size-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(j)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Edit Jurnal KBM"
                          >
                            <Edit3 className="size-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteJournal(j)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Hapus Jurnal KBM"
                          >
                            <Trash2 className="size-4" />
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
            Menampilkan <strong>{filteredJournals.length}</strong> dari <strong>{journals.length}</strong> catatan jurnal KBM
          </span>
          <span className="italic text-[11px]">
            Data jurnal KBM tersinkronisasi otomatis dari aplikasi mobile guru
          </span>
        </div>
      </div>

      {/* ── DETAIL MODAL JURNAL KBM (Matching Teacher Detail Modal) ── */}
      {journalDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-[#00288E] to-[#0A5C36] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <BookOpen className="size-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    Rincian Jurnal Pembelajaran KBM
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Dokumentasi aktivitas belajar mengajar harian guru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJournalDetail(null)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto">
              {/* Teacher Info Card */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center gap-3">
                <div className="size-12 rounded-full bg-primary text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                  {(journalDetail.teacherName || "G").charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-foreground">
                    {journalDetail.teacherName || "Guru Pengajar"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-semibold text-primary">
                      {journalDetail.subjectName}
                    </span>
                    <span>&bull;</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                      Kelas {journalDetail.className}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">Tanggal KBM</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {new Date(journalDetail.date).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background">
                  <span className="text-[10px] text-muted-foreground block font-medium">Jam Pelajaran</span>
                  <span className="font-bold text-foreground text-xs mt-0.5 block">
                    {journalDetail.sessionHours}
                  </span>
                </div>
              </div>

              {/* Topik & Aktivitas */}
              <div className="p-3.5 rounded-lg border border-border bg-background flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Materi / Pokok Bahasan
                </span>
                <span className="text-sm font-bold text-foreground">
                  {journalDetail.topicTitle}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2">
                  Uraian Aktivitas Kelas
                </span>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {journalDetail.activities}
                </p>
              </div>

              {/* Catatan & Absensi Siswa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Presensi Kehadiran Siswa</span>
                  <span className="text-xs font-semibold text-foreground">
                    {journalDetail.studentPresence || "Hadir Semua (Nihil)"}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Catatan / Kendala Siswa</span>
                  <span className="text-xs font-semibold text-foreground">
                    {journalDetail.notes || "-"}
                  </span>
                </div>
              </div>

              {/* Foto Dokumentasi */}
              {journalDetail.photoUrl && (
                <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Camera className="size-3.5 text-primary" />
                    Foto Dokumentasi Pembelajaran
                  </span>
                  <div className="rounded-xl overflow-hidden border border-border bg-slate-950 flex items-center justify-center max-h-56">
                    <img
                      src={journalDetail.photoUrl}
                      alt="Foto Dokumentasi KBM"
                      className="max-h-56 w-auto object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() =>
                        setPreviewPhoto({
                          url: journalDetail.photoUrl!,
                          title: `${journalDetail.subjectName} - Kelas ${journalDetail.className}`,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border flex items-center justify-between bg-muted/30">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setJournalDetail(null);
                  handleOpenEdit(journalDetail);
                }}
                leftIcon={<Edit3 className="size-3.5" />}
              >
                Edit Jurnal
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setJournalDetail(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT JURNAL FORM MODAL ── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-[#00288E] to-[#0A5C36] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <BookOpen className="size-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {journalToEdit ? "Edit Jurnal Pembelajaran KBM" : "Tambah Jurnal KBM Baru"}
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Isi rincian materi, jam mengajar, dan absensi siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="p-5 flex flex-col gap-4 text-xs overflow-y-auto">
              {/* Guru Pengajar */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Guru Pengajar <span className="text-destructive">*</span>
                </label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  disabled={Boolean(journalToEdit)}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs disabled:opacity-60"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.nip ? `(NIP. ${t.nip})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Jam Ke */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Tanggal KBM <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Jam Pelajaran Ke <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                  >
                    {commonHours.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kelas & Mata Pelajaran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Kelas / Rombel <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    placeholder="Contoh: VII A"
                    required
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Mata Pelajaran <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Contoh: Fiqih"
                    required
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                  />
                </div>
              </div>

              {/* Materi / Topik */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Materi / Pokok Bahasan <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Contoh: Ketentuan Shalat Jamak & Qashar"
                  required
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                />
              </div>

              {/* Uraian Aktivitas */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Uraian Aktivitas Pembelajaran <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formActivities}
                  onChange={(e) => setFormActivities(e.target.value)}
                  placeholder="Contoh: Penjelasan syarat sah jamak qashar, diskusi kelompok, tanya jawab, dan latihan soal bab 3."
                  required
                  className="w-full p-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs resize-none"
                />
              </div>

              {/* Kehadiran Siswa & Catatan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Absensi Siswa (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formStudentPresence}
                    onChange={(e) => setFormStudentPresence(e.target.value)}
                    placeholder="Contoh: Sakit 1, Izin 0, Alfa 0"
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Catatan / Kendala
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Contoh: Jam KBM terpangkas upacara"
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none text-foreground shadow-2xs"
                  />
                </div>
              </div>

              {/* Foto Dokumentasi (Upload / Preview) */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Foto Dokumentasi KBM (Opsional)
                </label>
                {formPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-border h-32 bg-slate-900 group">
                    <img
                      src={formPhoto}
                      alt="Pratinjau Foto"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormPhoto("")}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
                      title="Hapus Foto"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-colors">
                    <Camera className="size-6 text-muted-foreground mb-1" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Pilih Foto Dokumentasi (Maks. 2MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-3 border-t border-border flex items-center justify-end gap-2 bg-muted/30 -mx-5 -mb-5 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  isLoading={isSubmitting}
                  leftIcon={<CheckCircle2 className="size-3.5" />}
                >
                  {journalToEdit ? "Simpan Perubahan" : "Simpan Jurnal KBM"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PHOTO LIGHTBOX MODAL ── */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-border">
            <div className="px-4 py-3 bg-[#0b1c30] text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="size-4 text-accent" />
                {previewPhoto.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-2 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewPhoto.url}
                alt="Foto Dokumentasi KBM"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
