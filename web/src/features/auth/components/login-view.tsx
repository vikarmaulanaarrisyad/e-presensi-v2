"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  School, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Sparkles,
  Clock,
  Radio,
  HelpCircle,
  Smartphone,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { loginWithCredentials } from "@/server/actions/auth.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

export function LoginView() {
  const router = useRouter();

  // Role Switcher Tab: 'admin_madrasah', 'guru', or 'superadmin'
  const [selectedRole, setSelectedRole] = useState<"admin_madrasah" | "guru" | "superadmin">("admin_madrasah");

  // Form State
  const [email, setEmail] = useState("admin@min1jaksel.sch.id");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Digital Clock (WIB)
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " WIB"
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Role Switching
  const handleSelectRole = (role: "admin_madrasah" | "guru" | "superadmin") => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === "superadmin") {
      setEmail("superadmin@kemenag.go.id");
      setPassword("Password123!");
    } else if (role === "guru") {
      setEmail("199203152019031002");
      setPassword("Password123!");
    } else {
      setEmail("admin@min1jaksel.sch.id");
      setPassword("Password123!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Silakan masukkan email atau NIP akun Anda.");
      return;
    }
    if (!password) {
      setErrorMessage("Silakan masukkan kata sandi.");
      return;
    }

    setIsLoading(true);
    swalLoading("Memverifikasi Akun...", "Sedang memeriksa kredensial pada server database...");

    try {
      const res = await loginWithCredentials({ email, password });

      if (res?.error) {
        swalClose();
        swalError("Gagal Masuk", res.error);
        setErrorMessage(res.error);
        setIsLoading(false);
        return;
      }

      swalClose();
      swalSuccess("Autentikasi Berhasil!", "Selamat datang kembali. Mengarahkan ke panel...", 1800);
      setSuccessMessage("Autentikasi berhasil! Mengarahkan...");
      
      setTimeout(() => {
        if (selectedRole === "guru" || email.includes("fauzi") || email.includes("199203152019031002") || email.includes("siti")) {
          router.push("/guru");
        } else if (email.includes("superadmin")) {
          router.push("/superadmin");
        } else {
          router.push("/admin");
        }
        router.refresh();
      }, 700);
    } catch {
      swalClose();
      swalError("Koneksi Gagal", "Gagal menghubungkan ke server. Silakan coba beberapa saat lagi.");
      setErrorMessage("Gagal menghubungkan ke server. Silakan coba beberapa saat lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAF8] text-foreground font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT PANEL: Executive Ministry Identity & Glassmorphism   */}
      {/* ========================================================= */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-[#032514] via-[#0A5C36] to-[#01170b] text-white overflow-hidden shadow-2xl">
        {/* Subtle Decorative Geometric Pattern Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#C59B27_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-32 -left-32 size-[500px] rounded-full bg-emerald-400/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 size-[450px] rounded-full bg-[#D4AF37]/10 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 size-[400px] rounded-full bg-emerald-600/20 blur-[140px] pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Ministry Gold / Green Emblem Insignia */}
            <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-[#0A5C36] p-0.5 shadow-lg shadow-black/30 border border-white/20 flex items-center justify-center">
              <div className="size-full rounded-[14px] bg-[#05331d] flex items-center justify-center text-[#D4AF37]">
                <School className="size-6 text-[#E5C158]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  SIAP-PRESENSI
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[#D4AF37]/20 text-[#F3E3AC] border border-[#D4AF37]/40">
                  MI v2.0
                </span>
              </div>
              <span className="text-xs text-emerald-200/90 block font-medium">
                Direktorat KSKK Madrasah &bull; Ditjen Pendis Kemenag RI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-emerald-100 font-medium">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Server Cloud Aktif</span>
          </div>
        </div>

        {/* Middle Feature Hero & Floating Interactive Status Widget */}
        <div className="relative z-10 my-auto py-10 max-w-xl flex flex-col gap-8">
          <div className="flex flex-col gap-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#F3E3AC] w-fit shadow-inner">
              <Sparkles className="size-3.5 text-[#E5C158]" />
              <span>Multi-Tenant Geofencing GPS & Haversine Distance</span>
            </div>

            <h1 className="text-3xl xl:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
              Sistem Presensi Guru <br />
              <span className="bg-gradient-to-r from-white via-emerald-100 to-[#F3E3AC] bg-clip-text text-transparent">
                Madrasah Ibtidaiyah
              </span>
            </h1>

            <p className="text-sm xl:text-base text-emerald-100/85 leading-relaxed">
              Solusi absensi digital resmi Kementerian Agama untuk meningkatkan kedisiplinan dan transparansi data kehadiran guru dengan radius geofence akurat.
            </p>
          </div>

          {/* Floating Live Dashboard Status Card (Glassmorphism) */}
          <div className="rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/20 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Clock className="size-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {currentDate || "Memuat Tanggal..."}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-200/80 block">
                    {currentTime || "00:00:00 WIB"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-400/30">
                <Radio className="size-3 animate-spin text-emerald-400" />
                <span>Geofence Radar Online</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-lg xl:text-xl font-bold text-white block">1.240+</span>
                <span className="text-[10px] text-emerald-200/80 block">Madrasah</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-lg xl:text-xl font-bold text-[#F3E3AC] block">50 Meter</span>
                <span className="text-[10px] text-emerald-200/80 block">Radius Standar</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-lg xl:text-xl font-bold text-emerald-300 block">99.9%</span>
                <span className="text-[10px] text-emerald-200/80 block">Akurasi GPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Trust Seals */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-200/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#E5C158]" />
            <span>Enkripsi Database PostgreSQL Supabase &bull; Data Isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>RBAC Protected</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Crisp, Professional & High-Usability Form    */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-14 xl:p-20 max-w-2xl mx-auto w-full">
        {/* Mobile Header (Shown on small screens only) */}
        <div className="flex lg:hidden items-center justify-between pb-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <School className="size-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-foreground tracking-tight block">
                SIAP-PRESENSI MI
              </span>
              <span className="text-xs text-muted-foreground block -mt-0.5">
                Kementerian Agama RI
              </span>
            </div>
          </div>
          <Badge variant="gold">v2.0</Badge>
        </div>

        {/* Center Card */}
        <div className="my-auto py-6 sm:py-8 flex flex-col gap-6">
          {/* Header Greeting */}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Masuk ke Portal Presensi
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Silakan pilih kategori peran Anda atau langsung gunakan akun resmi yang terdaftar.
            </p>
          </div>

          {/* Role Segmented Controller Tabs */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pilih Peran Pengguna:
            </span>
            <div className="grid grid-cols-3 p-1.5 rounded-xl bg-muted/70 border border-border gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectRole("admin_madrasah")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedRole === "admin_madrasah"
                    ? "bg-background text-primary shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className={`size-3.5 ${selectedRole === "admin_madrasah" ? "text-primary" : ""}`} />
                <span className="truncate">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole("guru")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedRole === "guru"
                    ? "bg-emerald-600 text-white shadow-sm border border-emerald-600 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className={`size-3.5 ${selectedRole === "guru" ? "text-white" : ""}`} />
                <span className="truncate">Guru (Mobile)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole("superadmin")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedRole === "superadmin"
                    ? "bg-background text-primary shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className={`size-3.5 ${selectedRole === "superadmin" ? "text-primary" : ""}`} />
                <span className="truncate">Superadmin</span>
              </button>
            </div>
          </div>

          {/* Mobile Teacher App Banner Shortcut */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 block">
                  Aplikasi Mobile Guru (Flutter Experience)
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Presensi selfie kamera & radar geofence langsung di web
                </span>
              </div>
            </div>
            <a
              href="/guru"
              className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-xl shadow transition-colors shrink-0"
            >
              Buka Mobile →
            </a>
          </div>

          {/* Quick Demo Autofill Notice Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/60 border border-border/80 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                Kredensial demo terisi otomatis: <strong className="text-foreground">{selectedRole === "superadmin" ? "Superadmin Pusat" : selectedRole === "guru" ? "Ahmad Fauzi (Guru MIN 1)" : "MIN 1 Jakarta Selatan"}</strong>
              </span>
            </div>
            <span className="text-[11px] font-semibold text-primary">Siap Diuji</span>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Success Message Box */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label 
                htmlFor="email" 
                className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between"
              >
                <span>Email Akun Madrasah / Kemenag</span>
                <span className="text-[11px] text-muted-foreground font-normal lowercase">harus terdaftar</span>
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@kemenag.go.id atau madrasah"
                leftIcon={<Mail className="size-4" />}
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password" 
                  className="text-xs font-semibold text-foreground uppercase tracking-wider"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => alert("Silakan hubungi administrator pusat Kemenag untuk melakukan reset kata sandi.")}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Lupa Kata Sandi?
                </button>
              </div>

              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="size-4" />}
                disabled={isLoading}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
                    title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary accent-[#0A5C36] cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  Ingat sesi di komputer ini
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="default"
                size="lg"
                isLoading={isLoading}
                className="w-full text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                rightIcon={<ArrowRight className="size-4" />}
              >
                Masuk ke Panel {selectedRole === "superadmin" ? "Superadmin" : "Madrasah"}
              </Button>
            </div>
          </form>

          {/* Teacher Mobile Notice Card */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <Smartphone className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="font-bold">Khusus Guru / Tenaga Pendidik:</span>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Presensi harian dan rekam kehadiran menggunakan aplikasi mobile <strong>Flutter E-Presensi</strong> dengan kamera selfie dan validasi GPS.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; 2026 Kementerian Agama RI</span>
          <div className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors" onClick={() => alert("Bantuan teknis: hubungi support@kemenag.go.id")}>
            <HelpCircle className="size-3.5" />
            <span>Pusat Bantuan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
