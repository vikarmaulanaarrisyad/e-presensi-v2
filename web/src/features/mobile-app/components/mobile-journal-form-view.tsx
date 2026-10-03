"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Users,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Trash2,
  Sparkles,
  Info,
  Check,
  X,
  Building2,
  Plus
} from "lucide-react";
import {
  createTeachingJournalAction,
  updateTeachingJournalAction,
  getTeachingJournalByIdAction,
  deleteTeachingJournalAction,
  TeachingJournalPayload,
} from "@/server/actions/teaching-journal.actions";
import { swalSuccess, swalError, swalLoading, swalClose, swalConfirm } from "@/lib/swal";

interface MobileJournalFormViewProps {
  teacher: {
    id: string;
    name: string;
    nip: string;
    madrasahName: string;
    madrasahAddress?: string;
  };
  initialJournalId?: string | null;
  initialDate?: string | null;
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
  "Jam 1-2 (07:30 - 09:00)",
  "Jam 3-4 (09:15 - 10:45)",
  "Jam 5-6 (11:00 - 12:30)",
  "Jam 7-8 (13:00 - 14:30)"
];

const quickActivities = [
  "Ceramah & Diskusi",
  "Tanya Jawab Interaktif",
  "Praktik Langsung",
  "Penugasan Mandiri",
  "Evaluasi / Penilaian Harian"
];

const quickPresences = [
  "Hadir lengkap (Nihil alpa)",
  "Hadir 32, Izin 1",
  "Hadir 30, Sakit 2",
  "Hadir 31, Izin 1, Sakit 1"
];

export function MobileJournalFormView({
  teacher,
  initialJournalId,
  initialDate,
}: MobileJournalFormViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const journalIdFromQuery = initialJournalId || searchParams.get("id");
  const dateFromQuery = initialDate || searchParams.get("date");

  const getTodayDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [isEditing, setIsEditing] = useState<boolean>(Boolean(journalIdFromQuery));
  const [isLoadingJournal, setIsLoadingJournal] = useState<boolean>(Boolean(journalIdFromQuery));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<TeachingJournalPayload>({
    date: dateFromQuery || getTodayDateStr(),
    className: "",
    subjectName: "",
    sessionHours: "Jam 1-2 (07:30 - 09:00)",
    topicTitle: "",
    activities: "",
    studentPresence: "Hadir lengkap (Nihil alpa)",
    notes: "",
    photoUrl: "",
  });

  // Fetch journal if editing
  useEffect(() => {
    if (!journalIdFromQuery) return;

    let isMounted = true;
    const fetchJournal = async () => {
      setIsLoadingJournal(true);
      try {
        const res = await getTeachingJournalByIdAction(journalIdFromQuery);
        if (isMounted) {
          if (res?.journal) {
            setFormData({
              date: res.journal.date,
              className: res.journal.className || "",
              subjectName: res.journal.subjectName || "",
              sessionHours: res.journal.sessionHours || "Jam 1-2 (07:30 - 09:00)",
              topicTitle: res.journal.topicTitle || "",
              activities: res.journal.activities || "",
              studentPresence: res.journal.studentPresence || "Hadir lengkap (Nihil alpa)",
              notes: res.journal.notes || "",
              photoUrl: res.journal.photoUrl || "",
            });
            setIsEditing(true);
          } else if (res?.error) {
            swalError("Gagal Memuat Jurnal", res.error);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          swalError("Error", err.message || "Gagal mengambil data jurnal.");
        }
      } finally {
        if (isMounted) setIsLoadingJournal(false);
      }
    };

    fetchJournal();

    return () => {
      isMounted = false;
    };
  }, [journalIdFromQuery]);

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        swalError("Ukuran Terlalu Besar", "Ukuran foto maksimal adalah 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Append Activity Tag
  const handleAddActivityTag = (tag: string) => {
    setFormData((prev) => {
      const current = prev.activities.trim();
      const updated = current ? `${current}\n• ${tag}` : `• ${tag}`;
      return { ...prev, activities: updated };
    });
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.className.trim()) {
      swalError("Form Belum Lengkap", "Silakan isi atau pilih Kelas / Rombel.");
      return;
    }
    if (!formData.subjectName.trim()) {
      swalError("Form Belum Lengkap", "Silakan isi atau pilih Mata Pelajaran.");
      return;
    }
    if (!formData.topicTitle.trim()) {
      swalError("Form Belum Lengkap", "Silakan masukkan Materi Pokok / Bahasan KBM.");
      return;
    }
    if (!formData.activities.trim()) {
      swalError("Form Belum Lengkap", "Silakan tuliskan ringkasan aktivitas KBM.");
      return;
    }

    setIsSaving(true);
    swalLoading(
      isEditing ? "Menyimpan Perubahan..." : "Mencatat Jurnal KBM...",
      "Menyimpan rincian aktivitas pembelajaran ke pangkalan data madrasah..."
    );

    try {
      let res;
      if (isEditing && journalIdFromQuery) {
        res = await updateTeachingJournalAction(journalIdFromQuery, formData);
      } else {
        res = await createTeachingJournalAction({ ...formData, userId: teacher.id });
      }

      setIsSaving(false);
      swalClose();

      if (res?.error) {
        swalError("Gagal Menyimpan", res.error);
        return;
      }

      await swalSuccess(
        isEditing ? "Jurnal Diperbarui!" : "Jurnal Berhasil Dicatat!",
        res?.message || "Data aktivitas pembelajaran telah tersimpan resmi.",
        2000
      );

      // Return to guru dashboard on journal tab
      router.push("/guru?tab=journal");
      router.refresh();
    } catch (err: any) {
      setIsSaving(false);
      swalClose();
      swalError("Kesalahan Sistem", err.message || "Gagal menghubungkan ke server.");
    }
  };

  // Handle Delete Journal
  const handleDelete = async () => {
    if (!journalIdFromQuery) return;

    const isConfirmed = await swalConfirm(
      "Hapus Jurnal Pembelajaran?",
      `Apakah Anda yakin ingin menghapus catatan KBM "${formData.topicTitle || "ini"}"? Tindakan ini tidak dapat dibatalkan.`,
      "Ya, Hapus Jurnal",
      "Batal"
    );

    if (!isConfirmed) return;

    swalLoading("Menghapus...", "Sedang menghapus catatan jurnal KBM...");
    try {
      const res = await deleteTeachingJournalAction(journalIdFromQuery);
      swalClose();
      if (res?.error) {
        swalError("Gagal Menghapus", res.error);
        return;
      }
      await swalSuccess("Terhapus!", "Catatan jurnal berhasil dihapus.", 1800);
      router.push("/guru?tab=journal");
      router.refresh();
    } catch (err: any) {
      swalClose();
      swalError("Kesalahan", err.message || "Gagal menghapus jurnal pembelajaran.");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col text-[#0b1c30] select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        backgroundColor: "#f8f9ff",
      }}
    >
      {/* ── TOP APP BAR ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5eeff] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/guru?tab=journal")}
            className="w-9 h-9 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            title="Kembali ke Jurnal KBM"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-[#0b1c30] leading-tight flex items-center gap-1.5">
              <span>{isEditing ? "Edit Jurnal KBM" : "Tulis Jurnal Baru"}</span>
            </h1>
            <p className="text-[11px] text-[#444653]">
              Catatan aktivitas & materi pembelajaran
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#006c4a] text-[10px] font-bold">
          <Sparkles className="w-3 h-3 text-[#006c4a]" />
          <span>Halaman Penuh</span>
        </div>
      </header>

      {/* ── MAIN SCROLLABLE CONTAINER ── */}
      <main className="flex-1 p-4 pb-28 max-w-lg mx-auto w-full flex flex-col gap-4">
        {/* Banner Guru Info */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#006c4a] to-[#005137] text-white shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold leading-tight">{teacher.name}</span>
              <span className="text-[11px] text-emerald-100 font-medium">NIP: {teacher.nip || "-"}</span>
              <span className="text-[10px] text-emerald-200 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3" />
                {teacher.madrasahName}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px]">
            {isEditing ? "Mode Edit" : "KBM Reguler"}
          </span>
        </div>

        {/* Loading Spinner for Edit Fetch */}
        {isLoadingJournal ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-[#444653]">
            <Loader2 className="w-8 h-8 animate-spin text-[#006c4a]" />
            <span className="text-[13px] font-semibold">Memuat data jurnal KBM...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* ── 1. TANGGAL KBM ── */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-3">
              <label className="text-[12px] font-bold text-[#0b1c30] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#006c4a]" />
                  1. Tanggal Pelaksanaan KBM
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">Wajib Diisi</span>
              </label>

              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-[#f8f9ff] text-[13px] font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
              />

              {/* Quick Date Chips */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#f0f2ff]">
                {[
                  { label: "Hari Ini", offset: 0 },
                  { label: "Kemarin", offset: 1 },
                  { label: "2 Hari Lalu", offset: 2 },
                ].map((chip) => {
                  const d = new Date();
                  d.setDate(d.getDate() - chip.offset);
                  const ds = d.toISOString().split("T")[0];
                  const isSelected = formData.date === ds;

                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, date: ds })}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all border ${
                        isSelected
                          ? "bg-[#006c4a] text-white border-[#006c4a] shadow-xs"
                          : "bg-[#eff4ff] text-[#444653] border-[#dde1ff] hover:bg-[#dce9ff]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 2. KELAS & MATA PELAJARAN ── */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0b1c30]">
                <GraduationCap className="w-4 h-4 text-[#006c4a]" />
                <span>2. Kelas & Mata Pelajaran</span>
              </div>

              {/* Kelas */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#444653]">Kelas / Rombongan Belajar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: VII A, VIII B, dsb."
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[13px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {commonClasses.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, className: c })}
                      className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold transition-all border ${
                        formData.className === c
                          ? "bg-[#006c4a] text-white border-[#006c4a]"
                          : "bg-[#eff4ff] text-[#00288e] border-[#dde1ff] hover:bg-[#dce9ff]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f2ff]">
                <label className="text-[11px] font-bold text-[#444653]">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Fiqih, Matematika, dsb."
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[13px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {commonSubjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, subjectName: s })}
                      className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold transition-all border ${
                        formData.subjectName === s
                          ? "bg-[#006c4a] text-white border-[#006c4a]"
                          : "bg-[#eff4ff] text-[#00288e] border-[#dde1ff] hover:bg-[#dce9ff]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 3. JAM PELAJARAN / WAKTU ── */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-2.5">
              <label className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#006c4a]" />
                <span>3. Jam Pelajaran / Waktu Sesi</span>
              </label>

              <input
                type="text"
                required
                placeholder="Contoh: Jam 1-2 (07:30 - 09:00)"
                value={formData.sessionHours}
                onChange={(e) => setFormData({ ...formData, sessionHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[13px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
              />

              <div className="flex flex-wrap gap-1.5">
                {commonHours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setFormData({ ...formData, sessionHours: h })}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                      formData.sessionHours === h
                        ? "bg-[#006c4a] text-white border-[#006c4a]"
                        : "bg-[#eff4ff] text-[#00288e] border-[#dde1ff] hover:bg-[#dce9ff]"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 4. MATERI POKOK & URAIAN AKTIVITAS ── */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0b1c30]">
                <FileText className="w-4 h-4 text-[#006c4a]" />
                <span>4. Materi Pokok & Aktivitas KBM</span>
              </div>

              {/* Materi Pokok */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#444653]">Materi Pokok / Bahasan KBM</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bab 2 - Ketentuan Sholat Berjamaah & Masbuq"
                  value={formData.topicTitle}
                  onChange={(e) => setFormData({ ...formData, topicTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[13px] font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
              </div>

              {/* Uraian Aktivitas */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f2ff]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#444653]">Uraian Aktivitas Pembelajaran</label>
                  <span className="text-[10px] text-[#006c4a] font-semibold">Klik tag di bawah untuk menambah</span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Jelaskan ringkasan materi yang disampaikan, metode pembelajaran, respon siswa, dan penugasan yang diberikan..."
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a] leading-relaxed"
                />

                {/* Quick Activity Inspiration Tags */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {quickActivities.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => handleAddActivityTag(act)}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] border border-[#dde1ff]"
                    >
                      <Plus className="w-3 h-3" />
                      {act}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 5. PRESENSI SISWA & CATATAN ── */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0b1c30]">
                <Users className="w-4 h-4 text-[#006c4a]" />
                <span>5. Presensi Siswa & Catatan Evaluasi</span>
              </div>

              {/* Presensi Siswa */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#444653]">Presensi Siswa di Kelas</label>
                <input
                  type="text"
                  placeholder="Contoh: Hadir lengkap (Nihil alpa)"
                  value={formData.studentPresence || ""}
                  onChange={(e) => setFormData({ ...formData, studentPresence: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
                <div className="flex flex-wrap gap-1.5">
                  {quickPresences.map((qp) => (
                    <button
                      key={qp}
                      type="button"
                      onClick={() => setFormData({ ...formData, studentPresence: qp })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-[#005137] border border-emerald-200 hover:bg-emerald-100"
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan / Tindak Lanjut */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f2ff]">
                <label className="text-[11px] font-bold text-[#444653]">
                  Catatan Tindak Lanjut / Penugasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tugas mandiri dikumpulkan hari Kamis"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
              </div>
            </div>

            {/* ── 6. FOTO DOKUMENTASI KBM ── */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5eeff] shadow-xs flex flex-col gap-2.5">
              <label className="text-[12px] font-bold text-[#0b1c30] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#006c4a]" />
                  6. Foto Dokumentasi KBM (Opsional)
                </span>
                <span className="text-[11px] text-[#444653]">Format JPG/PNG</span>
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="text-[11px] text-[#444653] file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[#eff4ff] file:text-[#00288e] hover:file:bg-[#dce9ff] cursor-pointer"
              />

              {formData.photoUrl && (
                <div className="relative mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.photoUrl}
                    alt="Preview Dokumentasi"
                    className="w-full h-44 object-cover rounded-xl border border-[#dde1ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photoUrl: "" })}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-xs shadow-md transition-all active:scale-95"
                    title="Hapus Foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-[#006c4a] hover:bg-[#005a3e] text-white font-bold text-[14px] shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>{isEditing ? "Simpan Perubahan Jurnal" : "Simpan Jurnal KBM"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/guru?tab=journal")}
                  className="flex-1 py-3 rounded-xl border border-[#dde1ff] bg-white text-[#444653] hover:bg-[#f8f9ff] font-bold text-[13px] transition-colors flex items-center justify-center"
                >
                  Batal
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#ba1a1a] font-bold text-[13px] border border-red-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
