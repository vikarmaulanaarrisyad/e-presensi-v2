"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { loginWithCredentials } from "@/server/actions/auth.actions";

export default function LoginPage() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick fill demo credentials
  const fillCredentials = (type: "superadmin" | "admin") => {
    setErrorMessage(null);
    if (type === "superadmin") {
      setEmail("superadmin@kemenag.go.id");
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
      setErrorMessage("Silakan masukkan email akun Anda.");
      return;
    }
    if (!password) {
      setErrorMessage("Silakan masukkan kata sandi.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginWithCredentials({ email, password });

      if (res?.error) {
        setErrorMessage(res.error);
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Berhasil masuk! Mengalihkan ke dashboard...");
      
      // Determine redirection target based on role or fallback
      setTimeout(() => {
        if (email.includes("superadmin")) {
          router.push("/superadmin");
        } else {
          router.push("/admin");
        }
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage("Gagal menghubungkan ke server. Periksa koneksi internet Anda.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background select-none">
      {/* LEFT PANEL: Rich Kemenag Branding & Visual Storytelling (Desktop) */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-12 bg-gradient-to-br from-[#042817] via-[#0A5C36] to-[#02180e] text-white overflow-hidden">
        {/* Subtle Background Pattern & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.72_0.14_85_/_0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-3 group text-white/90 hover:text-white transition-colors"
          >
            <div className="size-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-accent shadow-inner group-hover:bg-white/20 transition-all">
              <School className="size-6 text-[#D4AF37]" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block">
                E-Presensi Madrasah
              </span>
              <span className="text-xs text-emerald-200 block -mt-0.5 tracking-wide">
                Direktorat KSKK Madrasah &bull; Kemenag RI
              </span>
            </div>
          </Link>

          <Badge variant="gold" icon={<ShieldCheck className="size-3" />}>
            Sistem Resmi Kemenag
          </Badge>
        </div>

        {/* Center Hero Value Proposition */}
        <div className="relative z-10 my-auto max-w-lg flex flex-col gap-6 py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-emerald-100 w-fit">
            <Sparkles className="size-3.5 text-[#D4AF37]" />
            <span>Multi-Tenant Geofencing Platform v2.0</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Kelola Kehadiran Guru Madrasah Lebih Akurat & Transparan.
          </h1>

          <p className="text-sm xl:text-base text-emerald-100/90 leading-relaxed">
            Platform absensi digital terintegrasi untuk Madrasah Ibtidaiyah di seluruh Indonesia dengan validasi koordinat GPS radius otomatis dan proteksi kecurangan.
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <MapPin className="size-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Geofencing Radius</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Validasi Haversine radius presisi per madrasah</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Building2 className="size-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Isolasi Multi-Tenant</h4>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">Data guru & rekapan terisolasi ketat per madrasah</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status / Footer Note */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>Terhubung ke Cloud Database PostgreSQL Supabase</span>
          </div>
          <span>v2.1.0-RC</span>
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 max-w-xl mx-auto w-full">
        {/* Top Back Link & Mobile Branding */}
        <div className="flex items-center justify-between">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Beranda</span>
          </Link>

          {/* Visible on Mobile only */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <School className="size-4" />
            </div>
            <span className="font-bold text-sm text-foreground">E-Presensi</span>
          </div>
        </div>

        {/* Center Login Form Container */}
        <div className="my-auto py-8 flex flex-col gap-6">
          {/* Header Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Masuk ke Dashboard
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Silakan masukkan akun resmi Kementerian Agama atau operator madrasah Anda.
            </p>
          </div>

          {/* Quick Demo Autofill Switcher (Developer & Demo Convenience) */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-3 text-accent-foreground" />
              Demo Akun Cepat (Klik untuk Mengisi):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("superadmin")}
                className="flex-1 text-xs py-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors text-center font-medium flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="size-3.5 text-primary" />
                Superadmin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin")}
                className="flex-1 text-xs py-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors text-center font-medium flex items-center justify-center gap-1.5"
              >
                <Building2 className="size-3.5 text-accent-foreground" />
                Admin Madrasah
              </button>
            </div>
          </div>

          {/* Alert Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Alert Success Message */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Actual Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label 
                htmlFor="email"
                className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between"
              >
                <span>Email Akun</span>
                <span className="text-muted-foreground font-normal lowercase">resmi / terdaftar</span>
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
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Untuk mereset kata sandi, silakan hubungi Helpdesk Kemenag atau Operator Madrasah.");
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Lupa Sandi?
                </Link>
              </div>

              <div className="relative">
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
                      className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-[#0A5C36] cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                Ingat saya di perangkat ini
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="default"
                size="lg"
                isLoading={isLoading}
                className="w-full shadow-md"
                rightIcon={<ArrowRight className="size-4" />}
              >
                Masuk ke Dashboard
              </Button>
            </div>
          </form>

          {/* Help Info Box */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Catatan untuk Guru (Aplikasi Mobile):</strong> Akun guru hanya dapat digunakan untuk melakukan presensi melalui aplikasi Android Flutter E-Presensi.
            </p>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          &copy; 2026 Kementerian Agama RI &bull; E-Presensi v2.0
        </div>
      </div>
    </div>
  );
}
