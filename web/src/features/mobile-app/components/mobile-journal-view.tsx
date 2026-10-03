"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  GraduationCap,
  Users,
  Camera,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  X,
  ChevronRight,
  Sparkles,
  Image as ImageIcon
} from "lucide-react";
import {
  getTeacherJournalsAction,
  createTeachingJournalAction,
  updateTeachingJournalAction,
  deleteTeachingJournalAction,
  TeachingJournalPayload
} from "@/server/actions/teaching-journal.actions";
import { swalLoading, swalSuccess, swalError, swalClose, swalConfirm } from "@/lib/swal";

interface JournalItem {
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
  createdAt?: string;
}

interface MobileJournalViewProps {
  userId: string;
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

export function MobileJournalView({ userId }: MobileJournalViewProps) {
  const getTodayDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [recentJournals, setRecentJournals] = useState<JournalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"daily" | "history">("daily");

  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<TeachingJournalPayload>({
    date: selectedDate,
    className: "",
    subjectName: "",
    sessionHours: "Jam 1-2 (07:30 - 09:00)",
    topicTitle: "",
    activities: "",
    studentPresence: "Hadir lengkap (Nihil alpa)",
    notes: "",
    photoUrl: "",
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Fetch journals
  const loadJournals = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await getTeacherJournalsAction(dateStr, userId);
      setIsLoading(false);
      if (res?.success) {
        setJournals(res.journals || []);
        setRecentJournals(res.recentJournals || []);
      }
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJournals(selectedDate);
  }, [selectedDate, userId]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingJournalId(null);
    setFormData({
      date: selectedDate,
      className: "",
      subjectName: "",
      sessionHours: "Jam 1-2 (07:30 - 09:00)",
      topicTitle: "",
      activities: "",
      studentPresence: "Hadir lengkap (Nihil alpa)",
      notes: "",
      photoUrl: "",
    });
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (journal: JournalItem) => {
    setEditingJournalId(journal.id);
    setFormData({
      date: journal.date,
      className: journal.className,
      subjectName: journal.subjectName,
      sessionHours: journal.sessionHours,
      topicTitle: journal.topicTitle,
      activities: journal.activities,
      studentPresence: journal.studentPresence || "",
      notes: journal.notes || "",
      photoUrl: journal.photoUrl || "",
    });
    setIsFormOpen(true);
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Journal Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.className.trim() || !formData.subjectName.trim() || !formData.topicTitle.trim()) {
      swalError("Form Belum Lengkap", "Silakan isi Kelas, Mata Pelajaran, dan Materi Pokok.");
      return;
    }

    setIsSaving(true);
    swalLoading(
      editingJournalId ? "Menyimpan Perubahan..." : "Mencatat Jurnal Pembelajaran...",
      "Menyimpan rincian aktivitas KBM ke sistem..."
    );

    try {
      let res;
      if (editingJournalId) {
        res = await updateTeachingJournalAction(editingJournalId, formData);
      } else {
        res = await createTeachingJournalAction({ ...formData, userId });
      }

      setIsSaving(false);
      swalClose();

      if (res?.error) {
        swalError("Gagal Menyimpan", res.error);
        return;
      }

      swalSuccess(
        editingJournalId ? "Jurnal Diperbarui!" : "Jurnal Berhasil Dicatat!",
        res?.message || "Data aktivitas pembelajaran telah tersimpan secara resmi.",
        2200
      );
      setIsFormOpen(false);
      loadJournals(selectedDate);
    } catch (err: any) {
      setIsSaving(false);
      swalClose();
      swalError("Kesalahan Sistem", err.message || "Gagal menghubungkan ke server.");
    }
  };

  // Delete Journal
  const handleDelete = async (journalId: string, topic: string) => {
    const isConfirmed = await swalConfirm(
      "Hapus Jurnal Pembelajaran?",
      `Apakah Anda yakin ingin menghapus catatan KBM "${topic}"?`,
      "Ya, Hapus Jurnal",
      "Batal"
    );

    if (!isConfirmed) return;

    swalLoading("Menghapus...", "Sedang menghapus catatan KBM...");
    try {
      const res = await deleteTeachingJournalAction(journalId);
      swalClose();
      if (res?.error) {
        swalError("Gagal Menghapus", res.error);
        return;
      }
      swalSuccess("Terhapus!", "Catatan jurnal berhasil dihapus.", 1800);
      loadJournals(selectedDate);
    } catch (err: any) {
      swalClose();
      swalError("Kesalahan", err.message || "Gagal menghapus jurnal.");
    }
  };

  return (
    <div
      className="flex flex-col gap-3.5 pb-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── 1. HEADER HERO BANNER ── */}
      <div className="bg-gradient-to-br from-[#006c4a] to-[#005137] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-emerald-100 font-medium">Aktivitas Mengajar</span>
              <h2 className="text-[16px] font-bold text-white leading-tight">Jurnal KBM Harian</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3 py-1.5 rounded-xl bg-white text-[#005137] font-bold text-[12px] shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer hover:bg-emerald-50"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Jurnal</span>
          </button>
        </div>

        {/* Stats Pill Row */}
        <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs z-10 relative">
          <div className="flex items-center gap-1.5 text-emerald-100">
            <Calendar className="w-4 h-4 text-emerald-200" />
            <span>
              {new Date(selectedDate).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
            {journals.length} Sesi KBM Terisi
          </span>
        </div>
      </div>

      {/* ── 2. DATE SELECTOR & MODE TABS ── */}
      <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Daily vs History Mode */}
          <div className="flex items-center p-1 bg-[#eff4ff] rounded-lg border border-[#dde1ff]">
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                viewMode === "daily"
                  ? "bg-white text-[#00288e] shadow-xs"
                  : "text-[#444653] hover:text-[#0b1c30]"
              }`}
            >
              📅 Per Tanggal
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                viewMode === "history"
                  ? "bg-white text-[#00288e] shadow-xs"
                  : "text-[#444653] hover:text-[#0b1c30]"
              }`}
            >
              📑 Riwayat ({recentJournals.length})
            </button>
          </div>

          {/* Date Picker (only in daily mode) */}
          {viewMode === "daily" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[#dde1ff] bg-[#f8f9ff] text-[12px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#006c4a]"
            />
          )}
        </div>

        {/* Quick Date Chips in Daily Mode */}
        {viewMode === "daily" && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#f0f2ff]">
            {[
              { label: "Hari Ini", offset: 0 },
              { label: "Kemarin", offset: 1 },
              { label: "2 Hari Lalu", offset: 2 },
            ].map((chip) => {
              const d = new Date();
              d.setDate(d.getDate() - chip.offset);
              const ds = d.toISOString().split("T")[0];
              const isSelected = selectedDate === ds;

              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setSelectedDate(ds)}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all border ${
                    isSelected
                      ? "bg-[#006c4a] text-white border-[#006c4a]"
                      : "bg-[#eff4ff] text-[#444653] border-[#dde1ff] hover:bg-[#dce9ff]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. JOURNALS LIST ── */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#444653]">
          <Loader2 className="w-6 h-6 animate-spin text-[#006c4a]" />
          <span className="text-[12px]">Memuat jurnal pembelajaran...</span>
        </div>
      ) : (viewMode === "daily" ? journals : recentJournals).length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-xs border border-dashed border-[#dde1ff] flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#006c4a] flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#0b1c30]">Belum Ada Jurnal KBM</h4>
            <p className="text-[12px] text-[#444653] mt-0.5 max-w-xs">
              {viewMode === "daily"
                ? `Belum ada catatan aktivitas mengajar pada tanggal ${selectedDate}.`
                : "Belum ada riwayat jurnal mengajar yang tersimpan."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-1 px-4 py-2 rounded-xl bg-[#006c4a] hover:bg-[#005a3e] text-white font-bold text-[12px] shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Jurnal Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(viewMode === "daily" ? journals : recentJournals).map((journal) => (
            <div
              key={journal.id}
              className="bg-white rounded-2xl p-4 shadow-xs border border-[#e5eeff] flex flex-col gap-3 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006c4a] to-emerald-400" />

              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-[#006c4a] font-bold text-[11px] border border-emerald-200">
                    {journal.className}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 font-bold text-[11px] border border-sky-200">
                    {journal.subjectName}
                  </span>
                </div>

                {/* Edit / Delete Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(journal)}
                    className="w-7 h-7 rounded-lg bg-[#eff4ff] hover:bg-[#dde1ff] text-[#00288e] flex items-center justify-center transition-colors"
                    title="Edit Jurnal"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(journal.id, journal.topicTitle)}
                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-[#ba1a1a] flex items-center justify-center transition-colors"
                    title="Hapus Jurnal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Hours / Session */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#444653] font-medium">
                <Clock className="w-3.5 h-3.5 text-[#006c4a]" />
                <span>{journal.sessionHours}</span>
                {viewMode === "history" && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-[#0b1c30]">{journal.date}</span>
                  </>
                )}
              </div>

              {/* Topic / Materi Pokok */}
              <div>
                <h4 className="text-[14px] font-bold text-[#0b1c30] leading-snug">
                  {journal.topicTitle}
                </h4>
                <p className="text-[12px] text-[#444653] mt-1 leading-relaxed whitespace-pre-line">
                  {journal.activities}
                </p>
              </div>

              {/* Attendance & Notes */}
              <div className="pt-2 border-t border-[#f0f2ff] flex flex-col gap-1.5 text-[11px]">
                {journal.studentPresence && (
                  <div className="flex items-center gap-1.5 text-[#005137] bg-emerald-50/70 px-2.5 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>Presensi Siswa: <strong>{journal.studentPresence}</strong></span>
                  </div>
                )}

                {journal.notes && (
                  <div className="text-[#532a00] bg-amber-50/70 px-2.5 py-1 rounded-lg">
                    <span>Catatan/Tindak Lanjut: {journal.notes}</span>
                  </div>
                )}
              </div>

              {/* Photo Thumbnail */}
              {journal.photoUrl && (
                <div className="pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={journal.photoUrl}
                    alt="Dokumentasi KBM"
                    onClick={() => setPreviewPhoto(journal.photoUrl!)}
                    className="w-full h-36 object-cover rounded-xl border border-[#dde1ff] cursor-pointer hover:opacity-95 transition-opacity"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 4. MODAL FORM: WRITE / EDIT JOURNAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#006c4a] to-[#005137] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold leading-tight">
                    {editingJournalId ? "Edit Jurnal KBM" : "Tulis Jurnal Pembelajaran Baru"}
                  </h3>
                  <p className="text-[11px] text-emerald-100">Catat materi dan perkembangan KBM di kelas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Date Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#0b1c30]">Tanggal KBM</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-[#dde1ff] bg-[#f8f9ff] text-[13px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
              </div>

              {/* Class & Subject in Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Class */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[#0b1c30]">Kelas / Rombel</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: VII A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dde1ff] bg-white text-[12px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                  />
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonClasses.slice(0, 4).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, className: c })}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff]"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[#0b1c30]">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Fiqih"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dde1ff] bg-white text-[12px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                  />
                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["Fiqih", "Al-Qur'an", "Matematika"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, subjectName: s })}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Session Hours */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#0b1c30]">Jam Pelajaran / Waktu</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jam 1-2 (07:30 - 09:00)"
                  value={formData.sessionHours}
                  onChange={(e) => setFormData({ ...formData, sessionHours: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-[#dde1ff] bg-white text-[12px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {commonHours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setFormData({ ...formData, sessionHours: h })}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff]"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#0b1c30]">Materi Pokok / Bahasan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bab 2 - Ketentuan Sholat Berjamaah"
                  value={formData.topicTitle}
                  onChange={(e) => setFormData({ ...formData, topicTitle: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[13px] font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
              </div>

              {/* Activities Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#0b1c30]">Uraian Aktivitas KBM</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan ringkasan materi, metode belajar, dan penugasan yang diberikan kepada siswa..."
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl border border-[#dde1ff] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a] leading-relaxed"
                />
              </div>

              {/* Student Presence */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#0b1c30]">Presensi Siswa di Kelas</label>
                <input
                  type="text"
                  placeholder="Contoh: Hadir: 32, Izin: 1, Sakit: 0"
                  value={formData.studentPresence || ""}
                  onChange={(e) => setFormData({ ...formData, studentPresence: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-[#dde1ff] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
              </div>

              {/* Notes / Follow-up */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#0b1c30]">Catatan Evaluasi / Tindak Lanjut (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Tugas mandiri dikumpulkan hari Kamis"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="px-3.5 py-2 rounded-xl border border-[#dde1ff] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c4a]"
                />
              </div>

              {/* Photo Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#006c4a]" />
                  <span>Foto Dokumentasi KBM (Opsional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="text-[11px] text-[#444653] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#eff4ff] file:text-[#00288e] hover:file:bg-[#dce9ff]"
                />
                {formData.photoUrl && (
                  <div className="relative mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.photoUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-xl border border-[#dde1ff]"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: "" })}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#dde1ff] text-[#444653] font-bold text-[13px] hover:bg-[#f8f9ff] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#006c4a] hover:bg-[#005a3e] text-white font-bold text-[13px] shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Simpan Jurnal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. FULL PHOTO PREVIEW MODAL ── */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1c30] border border-white/20 rounded-3xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between text-white">
              <h4 className="text-[12px] font-bold">Dokumentasi Pembelajaran</h4>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="Dokumentasi KBM"
              className="w-full h-auto rounded-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
