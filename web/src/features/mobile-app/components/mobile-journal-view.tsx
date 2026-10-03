"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
  deleteTeachingJournalAction,
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

export function MobileJournalView({ userId }: MobileJournalViewProps) {
  const router = useRouter();

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
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Portal mount check for photo preview
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Navigate to dedicated Add Page
  const handleOpenAdd = () => {
    router.push(`/guru/jurnal/tambah?date=${selectedDate}`);
  };

  // Navigate to dedicated Edit Page
  const handleOpenEdit = (journal: JournalItem) => {
    router.push(`/guru/jurnal/tambah?id=${journal.id}`);
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



      {/* ── 5. FULL PHOTO PREVIEW MODAL ── */}
      {isMounted && previewPhoto && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
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
        </div>,
        document.body
      )}
    </div>
  );
}
