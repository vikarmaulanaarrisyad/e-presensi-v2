"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  UserCheck, 
  ArrowRight,
  School,
  Mail,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { loginWithGoogleEmailAction, getRegisteredTeacherEmailsAction } from "@/server/actions/auth.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeacherItem {
  name: string;
  email: string;
  nuptk?: string | null;
  nip?: string | null;
  pegId?: string | null;
  madrasah?: { name: string } | null;
}

export function GoogleLoginModal({ isOpen, onClose }: GoogleLoginModalProps) {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingTeachers(true);
      setErrorMessage(null);
      getRegisteredTeacherEmailsAction()
        .then((res) => {
          if (res?.data) {
            setTeachers(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingTeachers(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginWithEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Silakan masukkan alamat email yang valid (contoh: guru@gmail.com).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    swalLoading("Menghubungkan Akun Google...", `Sedang memverifikasi data guru: ${cleanEmail}...`);

    try {
      const res = await loginWithGoogleEmailAction(cleanEmail);

      if (res?.error) {
        swalClose();
        swalError("Gagal Masuk", res.error);
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      swalClose();
      await swalSuccess(
        "Login Berhasil!",
        `Selamat datang, ${res.name || "Bapak/Ibu Guru"}! Mengarahkan ke Portal E-Presensi...`,
        1500
      );

      onClose();
      setTimeout(() => {
        router.push("/guru");
        router.refresh();
      }, 400);
    } catch {
      swalClose();
      swalError("Koneksi Terputus", "Gagal memproses autentikasi. Silakan coba kembali.");
      setErrorMessage("Terjadi kendala koneksi ke server database.");
      setIsSubmitting(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.nuptk && t.nuptk.toLowerCase().includes(q)) ||
      (t.madrasah?.name && t.madrasah.name.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-50 to-emerald-50/50 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center shrink-0">
              <svg className="size-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Masuk dengan Google / Gmail</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Guru GTK
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Login instan guru menggunakan alamat Gmail resmi terdaftar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Input by Manual Gmail */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="size-3.5 text-emerald-600" />
              <span>Ketik Alamat Gmail Anda</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLoginWithEmail(emailInput);
                    }
                  }}
                  placeholder="contoh: sutriyah@gmail.com"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="button"
                onClick={() => handleLoginWithEmail(emailInput)}
                disabled={isSubmitting || !emailInput.trim()}
                className="h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              atau pilih akun guru di bawah ini
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Teacher Selection List */}
          <div className="flex flex-col gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama guru, email, atau madrasah..."
                className="w-full h-9 pl-9 pr-3.5 rounded-lg border border-slate-200 text-xs bg-slate-50 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* List Container */}
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
              {isLoadingTeachers ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="size-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Memuat daftar akun guru...</span>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ditemukan akun guru yang cocok dengan pencarian.
                </div>
              ) : (
                filteredTeachers.map((teacher, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoginWithEmail(teacher.email)}
                    disabled={isSubmitting}
                    className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 block truncate">
                          {teacher.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="font-mono text-emerald-700 truncate">{teacher.email}</span>
                          {teacher.madrasah?.name && (
                            <span className="text-slate-400 truncate hidden sm:inline">
                              &bull; {teacher.madrasah.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1 pl-2">
                      <span>Pilih</span>
                      <ArrowRight className="size-3" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Kredensial tersinkronisasi otomatis dengan server GTK</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
