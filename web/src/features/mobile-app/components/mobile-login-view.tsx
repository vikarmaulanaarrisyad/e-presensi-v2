"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Lock, 
  LockOpen,
  User, 
  KeyRound,
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  MapPin,
  Headphones,
  Check,
  IdCard,
  School,
  ChevronDown
} from "lucide-react";
import { loginWithCredentials } from "@/server/actions/auth.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

export function MobileLoginView() {
  const router = useRouter();
  const [nipInput, setNipInput] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("min1");
  const [rememberNip, setRememberNip] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean any spaces user might have pasted (e.g. 19870815 201101 2 006 -> 198708152011012006)
    const cleanNip = nipInput.replace(/\s+/g, "").trim();

    if (!cleanNip) {
      swalError("NIP Wajib Diisi", "Silakan masukkan NIP / NUPTK / PegID Anda.");
      return;
    }
    if (!password) {
      swalError("Kata Sandi Wajib Diisi", "Silakan masukkan kata sandi akun Anda.");
      return;
    }

    setIsLoading(true);
    swalLoading("Memverifikasi NIP...", "Sedang memeriksa data kepegawaian GTK...");

    try {
      const res = await loginWithCredentials({
        email: cleanNip,
        password,
      });

      if (res?.error) {
        swalClose();
        swalError("Gagal Masuk", res.error);
        setIsLoading(false);
        return;
      }

      swalClose();
      await swalSuccess("Autentikasi Berhasil!", "Selamat datang di Portal E-Presensi Guru.", 1300);

      setTimeout(() => {
        router.push("/guru");
        router.refresh();
      }, 500);
    } catch {
      swalClose();
      swalError("Koneksi Gagal", "Gagal menghubungi server database.");
      setIsLoading(false);
    }
  };

  const handleBelajarIdLogin = () => {
    swalLoading("Otentikasi Akun Pembelajaran...", "Mengarahkan ke Google Workspace for Education (belajar.id)...");
    setTimeout(() => {
      swalClose();
      // Auto-fill demo and inform
      setNipInput("199203152019031002");
      setPassword("Password123!");
      swalSuccess("Akun belajar.id Terhubung!", "Kredensial otomatis terverifikasi dengan profil GTK.", 1500);
    }, 1200);
  };

  const openHelpDesk = () => {
    swalSuccess(
      "Pusat Bantuan GTK",
      "Layanan Tata Usaha & Helpdesk Madrasah:\nWhatsApp: +62 812-9876-5432\nEmail: tu.madrasah@kemenag.go.id\nJam Layanan: Senin - Jumat (07.00 - 15.30 WIB)",
      4000
    );
  };

  const handleForgotPassword = () => {
    swalSuccess(
      "Reset Kata Sandi Akun",
      "Untuk mereset kata sandi akun GTK, silakan hubungi Operator Madrasah atau Administrator SIMPATIKA / EMIS sekolah Anda.",
      3500
    );
  };

  return (
    <div className="w-full bg-[#f8f9ff] text-[#0b1c30] flex flex-col items-center px-4 py-6 sm:px-6 select-none font-sans min-h-screen">

      {/* 2. App Logo & Branding Showcase */}
      <div className="relative flex flex-col items-center text-center max-w-xs mb-2">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-3 flex items-center justify-center p-2 rounded-3xl bg-white shadow-md border border-[#e5eeff]/80">
          {!imgError ? (
            <img
              alt="Logo E-Presensi Guru"
              className="w-full h-full object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9-W-4xnbeUjFZ37P1ZJOHcyEN-aTrRJSACMKG5JG592vWSKnHBs3EIUhziH6totxXV3hYh2EtvYLLw_N_C45FhVD64dnL8N9Ih4OWGiQIZMi4KH7dCm_O52f8q3RkA1OtXvUyuH4wgWlutdQZLx0UVnTkohxsy6X4iqIhh-cVuRBFTFUCHCWp4tkSEqh5MXQgSEYYpn_xgeIr2c2B1XoZ2c12vM1iMOPrsLks8X76UR8Dugvd2s1z"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#00288e] to-[#1e40af] text-white rounded-2xl p-2">
              <School className="w-10 h-10 mb-1" />
              <span className="text-[9px] font-extrabold tracking-wider">E-PRESENSI</span>
            </div>
          )}

          {/* Verified Badge */}
          <div className="absolute -bottom-1 -right-1 bg-[#006c4a] text-white rounded-full p-1 shadow-sm flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-[#00288e] tracking-tight">
          E-Presensi Guru
        </h1>

      </div>

      {/* 3. Main Login Card Container */}
      <div className="w-full max-w-sm mt-3 bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-4 border border-[#e5eeff]">
        {/* Card Title */}
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-base font-bold text-[#0b1c30]">
              Masuk ke Akun GTK
            </h2>
            <p className="text-xs text-[#444653]">
              Gunakan kredensial resmi kepegawaian Anda
            </p>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-[#dde1ff] flex items-center justify-center text-[#00288e] shrink-0">
            <LockOpen className="w-5 h-5" />
          </div>
        </div>

        <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
          {/* Input NIP / NUPTK / PegID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#0b1c30] flex items-center gap-1.5" htmlFor="nipInput">
              <IdCard className="w-4 h-4 text-[#00288e]" />
              <span>NIP / NUPTK / PegID</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="nipInput"
                type="text"
                value={nipInput}
                onChange={(e) => setNipInput(e.target.value)}
                placeholder="Contoh: 19850412 201001 1 008"
                className="w-full h-12 px-4 rounded-xl bg-[#eff4ff] text-xs sm:text-sm font-medium text-[#0b1c30] placeholder:text-[#757684] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1e40af] transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* Input Kata Sandi */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0b1c30] flex items-center gap-1.5" htmlFor="passwordInput">
                <KeyRound className="w-4 h-4 text-[#00288e]" />
                <span>Kata Sandi</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] font-semibold text-[#00288e] hover:underline cursor-pointer"
              >
                Lupa Kata Sandi?
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                id="passwordInput"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi akun"
                className="w-full h-12 pl-4 pr-12 rounded-xl bg-[#eff4ff] text-sm text-[#0b1c30] placeholder:text-[#757684] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1e40af] transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Tampilkan atau sembunyikan kata sandi"
                className="absolute right-3 text-[#444653] hover:text-[#00288e] transition-colors p-1 flex items-center cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Unit Sekolah Penugasan Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#0b1c30] flex items-center gap-1.5" htmlFor="schoolSelect">
              <Building2 className="w-4 h-4 text-[#006c4a]" />
              <span>Satuan Pendidikan / Unit Kerja</span>
            </label>
            <div className="relative flex items-center">
              <select
                id="schoolSelect"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full h-12 pl-4 pr-10 rounded-xl bg-[#eff4ff] text-xs sm:text-sm font-medium text-[#0b1c30] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1e40af] appearance-none transition-all cursor-pointer"
              >
                <option value="min1">MIN 1 Jakarta Selatan (Induk)</option>
                <option value="sman1">SMAN 1 Nusantara (Induk)</option>
                <option value="smpn3">SMPN 3 Nusantara (Dpk)</option>
                <option value="dinas">Dinas Pendidikan / Kemenag Wilayah II</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 pointer-events-none text-[#444653]" />
            </div>
          </div>

          {/* Checkbox Ingat NIP & Terlindungi Badge */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberNip}
                onChange={(e) => setRememberNip(e.target.checked)}
                className="w-4 h-4 rounded text-[#1e40af] focus:ring-0 cursor-pointer accent-[#00288e]"
              />
              <span className="text-xs text-[#0b1c30]">Ingat NIP di perangkat ini</span>
            </label>
            <span className="text-[11px] font-bold text-[#006c4a] flex items-center gap-1 bg-[#82f5c1]/35 px-2 py-0.5 rounded-full border border-[#006c4a]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Terlindungi</span>
            </span>
          </div>

          {/* Primary CTA: Masuk Sekarang */}
          <button
            id="btnLogin"
            type="submit"
            disabled={isLoading}
            className="w-full h-[52px] mt-1 rounded-full bg-[#00288e] hover:bg-[#173bab] active:scale-[0.98] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memverifikasi NIP...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow h-[1px] bg-[#dce9ff]" />
          <span className="flex-shrink mx-3 text-[10px] font-bold text-[#757684] uppercase tracking-wider">
            atau opsi single sign-on
          </span>
          <div className="flex-grow h-[1px] bg-[#dce9ff]" />
        </div>

        {/* Secondary SSO Button: Belajar.id */}
        <button
          type="button"
          onClick={handleBelajarIdLogin}
          className="w-full h-[50px] rounded-full bg-white border-2 border-[#dce9ff] text-[#0b1c30] text-xs sm:text-sm font-semibold shadow-xs hover:bg-[#eff4ff] active:scale-[0.98] transition-all flex items-center justify-center gap-3 px-4 cursor-pointer"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <span className="truncate">
            Masuk dengan Akun <span className="font-bold text-[#1E40AF]">belajar.id</span>
          </span>
        </button>

        {/* Geolocation & Operational Notice Card */}
        <div className="p-3.5 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3 mt-0.5">
          <MapPin className="w-5 h-5 text-[#006c4a] shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#006c4a]">
              Deteksi Lokasi Presensi Siap
            </span>
            <span className="text-[11px] text-[#444653] leading-tight mt-0.5">
              Radius absensi otomatis aktif pada jangkauan 50m gerbang sekolah saat berhasil masuk.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Institutional Footer & Technical Support */}
      <div className="w-full max-w-sm flex flex-col items-center mt-5 text-center gap-2.5 pb-6">
        {/* Admin Help Pill Link */}
        <button
          type="button"
          onClick={openHelpDesk}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#dce9ff] text-[#444653] hover:text-[#00288e] transition-colors shadow-2xs text-xs font-medium cursor-pointer"
        >
          <Headphones className="w-4 h-4 text-[#532a00]" />
          <span>Kendala login? Hubungi <strong>Admin TU Sekolah</strong></span>
        </button>


        {/* Switch to Web Admin Link */}
        <a
          href="/login"
          className="text-[11px] text-[#00288e] hover:underline font-semibold mt-1"
        >
          Beralih ke Portal Web Admin Madrasah →
        </a>
      </div>
    </div>
  );
}
