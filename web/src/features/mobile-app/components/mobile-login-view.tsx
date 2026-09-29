"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { loginWithCredentials } from "@/server/actions/auth.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

export function MobileLoginView() {
  const router = useRouter();
  const [emailOrNip, setEmailOrNip] = useState("199203152019031002"); // Ahmad Fauzi default
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Demo Accounts
  const demoAccounts = [
    {
      name: "Ahmad Fauzi, S.Pd.I",
      nip: "199203152019031002",
      roleText: "Guru Kelas 3A",
    },
    {
      name: "Siti Nurhaliza, M.Pd",
      nip: "198711042014022001",
      roleText: "Guru PAI",
    },
  ];

  const handleSelectDemo = (nip: string) => {
    setEmailOrNip(nip);
    setPassword("Password123!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrNip.trim()) {
      swalError("NIP / Email Wajib Diisi", "Silakan masukkan NIP atau Email akun guru Anda.");
      return;
    }
    if (!password) {
      swalError("Password Wajib Diisi", "Silakan masukkan kata sandi akun Anda.");
      return;
    }

    setIsLoading(true);
    swalLoading("Memverifikasi Akun...", "Sedang memeriksa kredensial guru di database...");

    try {
      const res = await loginWithCredentials({
        email: emailOrNip.trim(),
        password,
      });

      if (res?.error) {
        swalClose();
        swalError("Gagal Masuk", res.error);
        setIsLoading(false);
        return;
      }

      swalClose();
      swalSuccess("Autentikasi Berhasil!", "Selamat datang kembali di Portal Guru Mobile.", 1500);

      setTimeout(() => {
        router.push("/guru");
        router.refresh();
      }, 700);
    } catch {
      swalClose();
      swalError("Koneksi Gagal", "Gagal menghubungi server database.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[580px] p-6 text-slate-800 dark:text-slate-100">
      {/* 1. Header Banner */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-700/30 mb-3 border border-emerald-400/30">
          <Smartphone className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          E-Presensi Mobile Guru
        </h2>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
          Kementerian Agama Republik Indonesia
        </p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[260px] leading-relaxed">
          Silakan masuk menggunakan NIP atau Email yang terdaftar di SIMPATIKA / EMIS.
        </p>
      </div>

      {/* 2. Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 my-4">
        {/* NIP or Email Input */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
            NIP / Nomor Identitas / Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Contoh: 199203152019031002"
              value={emailOrNip}
              onChange={(e) => setEmailOrNip(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata sandi..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Demo Switcher */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-2xl p-2.5">
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Pilih Cepat Akun Guru (Untuk Demo / Uji Coba):
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.nip}
                type="button"
                onClick={() => handleSelectDemo(acc.nip)}
                className={`p-2 rounded-xl text-left border transition-all ${
                  emailOrNip === acc.nip
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                }`}
              >
                <span className="text-[11px] font-bold block truncate">{acc.name}</span>
                <span className="text-[9px] opacity-80 font-mono block truncate">NIP: {acc.nip}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white font-bold py-5 rounded-2xl shadow-lg shadow-emerald-900/30 text-xs gap-2 mt-1 active:scale-98 transition-all"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Memproses Autentikasi...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>Masuk Aplikasi Mobile</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>

      {/* 3. Footer Links */}
      <div className="pt-2 text-center flex flex-col items-center gap-1.5">
        <a
          href="/login"
          className="text-[11px] text-slate-500 hover:text-emerald-600 font-medium transition-colors"
        >
          Beralih ke Portal Web Admin Madrasah →
        </a>
        <span className="text-[10px] text-slate-400 font-mono">
          E-Presensi Mobile Kemenag v2.4.0
        </span>
      </div>
    </div>
  );
}
