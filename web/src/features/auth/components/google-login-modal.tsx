"use client";

import React, { useState } from "react";
import { 
  X, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { signIn } from "next-auth/react";

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleLoginModal({ isOpen, onClose }: GoogleLoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuthSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await signIn("google", { callbackUrl: "/guru" });
    } catch {
      setIsLoading(false);
      setErrorMessage("Integrasi Google OAuth sedang tidak tersedia. Silakan masuk menggunakan Email/NIP dan Kata Sandi.");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Single Sign-On Google</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Autentikasi resmi via Google Workspace / madrasah.id
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Keamanan Akun GTK</span>
            </div>
            <p>
              Single Sign-On (SSO) Google hanya dapat digunakan apabila alamat email Anda telah diverifikasi oleh Operator Madrasah.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={handleOAuthSignIn}
            className="w-full h-12 rounded-xl bg-[#00288e] hover:bg-[#173bab] active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            <span>{isLoading ? "Menghubungkan..." : "Lanjutkan dengan Akun Google"}</span>
            <ArrowRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Kembali ke Login Biasa
          </button>
        </div>
      </div>
    </div>
  );
}
