"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  School,
  Building2,
  MapPin,
  Compass,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  HelpCircle,
  LocateFixed,
  Layers,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { registerSchoolAction } from "@/server/actions/madrasah.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

export function RegisterSchoolView() {
  const router = useRouter();

  // Current Step: 1 = Data Sekolah, 2 = Geofence GPS, 3 = Akun Admin
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State: Data Sekolah
  const [schoolName, setSchoolName] = useState("");
  const [nsm, setNsm] = useState("");
  const [npsn, setNpsn] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [address, setAddress] = useState("");

  // Form State: Geofence
  const [latitude, setLatitude] = useState<string>("-6.2088");
  const [longitude, setLongitude] = useState<string>("106.8456");
  const [radiusMeters, setRadiusMeters] = useState<number>(50);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Form State: Akun Admin
  const [adminName, setAdminName] = useState("");
  const [adminNip, setAdminNip] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<{
    schoolName: string;
    nsm: string;
    adminEmail: string;
  } | null>(null);

  // Detect GPS Location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      swalError("GPS Tidak Didukung", "Browser Anda tidak mendukung layanan Geolocation.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setIsLocating(false);
        swalSuccess("Lokasi Ditemukan!", `Koordinat presisi berhasil diambil: ${lat}, ${lng}`, 2000);
      },
      (err) => {
        setIsLocating(false);
        let msg = "Gagal mendeteksi lokasi otomatis. Silakan masukkan koordinat secara manual.";
        if (err.code === 1) {
          msg = "Izin akses lokasi ditolak oleh browser. Silakan aktifkan izin lokasi di pengaturan browser.";
        }
        swalError("Deteksi GPS Gagal", msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Step Validations
  const validateStep1 = () => {
    if (!schoolName.trim() || schoolName.trim().length < 3) {
      setErrorMessage("Nama sekolah / madrasah wajib diisi (minimal 3 karakter).");
      return false;
    }
    if (!nsm.trim() || nsm.trim().length < 4) {
      setErrorMessage("NSM / Kode Registrasi Sekolah wajib diisi (minimal 4 karakter).");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const validateStep2 = () => {
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMessage("Koordinat Latitude dan Longitude harus berupa angka yang valid.");
      return false;
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setErrorMessage("Koordinat latitude atau longitude berada di luar rentang bumi yang valid.");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateStep1() || !validateStep2()) return;

    if (!adminName.trim() || adminName.trim().length < 3) {
      setErrorMessage("Nama lengkap Administrator wajib diisi.");
      return;
    }
    if (!adminEmail.trim() || !/^\S+@\S+\.\S+$/.test(adminEmail.trim())) {
      setErrorMessage("Format email administrator tidak valid.");
      return;
    }
    if (!adminPassword || adminPassword.length < 6) {
      setErrorMessage("Kata sandi minimal 6 karakter.");
      return;
    }
    if (adminPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (!agreeTerms) {
      setErrorMessage("Anda harus menyetujui syarat & ketentuan sistem presensi.");
      return;
    }

    setIsSubmitting(true);
    swalLoading(
      "Mendaftarkan Sekolah...",
      "Menyiapkan database multi-tenant, konfigurasi geofencing, dan akun Administrator..."
    );

    try {
      const res = await registerSchoolAction({
        name: schoolName.trim(),
        nsm: nsm.trim(),
        npsn: npsn.trim() || undefined,
        address: address.trim() || undefined,
        phone: schoolPhone.trim() || undefined,
        email: schoolEmail.trim() || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: radiusMeters || 50,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword: adminPassword,
        adminPhone: adminPhone.trim() || undefined,
        adminNip: adminNip.trim() || undefined,
      });

      swalClose();

      if (res?.error) {
        swalError("Pendaftaran Gagal", res.error);
        setErrorMessage(res.error);
        setIsSubmitting(false);
        return;
      }

      setRegisteredData({
        schoolName: res.data?.schoolName || schoolName,
        nsm: res.data?.nsm || nsm,
        adminEmail: res.data?.adminEmail || adminEmail,
      });

      swalSuccess(
        "Pendaftaran Berhasil!",
        "Sekolah dan Akun Administrator Anda telah aktif. Silakan masuk.",
        3000
      );
    } catch {
      swalClose();
      swalError("Terjadi Kesalahan", "Gagal menghubungi server. Silakan coba kembali beberapa saat lagi.");
      setErrorMessage("Terjadi kesalahan jaringan/server saat melakukan pendaftaran.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAF8] text-foreground font-sans">
      {/* ========================================================= */}
      {/* LEFT BRANDING & INFORMATION PANEL                         */}
      {/* ========================================================= */}
      <div className="relative hidden lg:flex lg:w-5/12 xl:w-4/12 flex-col justify-between p-10 xl:p-12 bg-gradient-to-br from-[#032514] via-[#0A5C36] to-[#01170b] text-white shadow-2xl overflow-hidden sticky top-0 h-screen">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#C59B27_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-emerald-400/15 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-[#D4AF37]/15 blur-[120px] pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-3.5 group">
            <div className="size-11 rounded-2xl bg-white p-1 shadow-lg border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img
                src="/icons/app-logo.png"
                alt="Logo E-Presensi GTK"
                className="size-full object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                SIAP-PRESENSI
              </span>
              <span className="text-[11px] text-emerald-200/80 block">
                Sistem Presensi Satuan Pendidikan
              </span>
            </div>
          </Link>

          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/10 text-emerald-100 border border-white/15">
            Registrasi Baru
          </span>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 my-auto py-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#F3E3AC] w-fit">
              <Sparkles className="size-3.5 text-[#E5C158]" />
              <span>Multi-Tenant & Geofencing Pintar</span>
            </div>
            <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-snug text-white">
              Daftarkan Sekolah Anda Dalam 3 Langkah Mudah
            </h1>
            <p className="text-xs xl:text-sm text-emerald-100/85 leading-relaxed">
              Tingkatkan akurasi absensi guru dan staf dengan sistem presensi berbasis GPS radius akurat, rekapitulasi real-time, dan dashboard terpusat.
            </p>
          </div>

          {/* Stepper Indicator Widget */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/15 p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 1 ? "bg-emerald-400 text-[#032514] shadow-md shadow-emerald-500/30" : "bg-white/10 text-white/50"
              }`}>
                {currentStep > 1 ? <CheckCircle2 className="size-4" /> : "1"}
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-white block">Identitas Satuan Pendidikan</span>
                <span className="text-[10px] text-emerald-200/70">Nama sekolah, NSM, NPSN, dan alamat</span>
              </div>
            </div>

            <div className="h-4 border-l-2 border-dashed border-white/20 ml-4 my--1" />

            <div className="flex items-center gap-3">
              <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 2 ? "bg-emerald-400 text-[#032514] shadow-md shadow-emerald-500/30" : "bg-white/10 text-white/50"
              }`}>
                {currentStep > 2 ? <CheckCircle2 className="size-4" /> : "2"}
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-white block">Pusat Lokasi Geofence</span>
                <span className="text-[10px] text-emerald-200/70">Koordinat GPS & batas radius absensi</span>
              </div>
            </div>

            <div className="h-4 border-l-2 border-dashed border-white/20 ml-4 my--1" />

            <div className="flex items-center gap-3">
              <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3 ? "bg-[#D4AF37] text-[#032514] shadow-md shadow-amber-500/30" : "bg-white/10 text-white/50"
              }`}>
                3
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-white block">Akun Administrator Sekolah</span>
                <span className="text-[10px] text-emerald-200/70">Kredensial login ke panel admin madrasah</span>
              </div>
            </div>
          </div>

          {/* Quick Perks */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px] text-emerald-100/90">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Langsung Aktif</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Multi-User Guru</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-200/70">
          <span>&copy; 2026 E-Presensi Kemenag</span>
          <div className="flex items-center gap-1.5 text-white/80">
            <ShieldCheck className="size-3.5 text-[#E5C158]" />
            <span>Enkripsi Database Aman</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT MAIN REGISTRATION FORM CONTAINER                    */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 max-w-3xl mx-auto w-full min-h-screen">
        {/* Mobile Header Banner */}
        <div className="flex lg:hidden items-center justify-between pb-6 border-b border-border/60">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <School className="size-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-foreground block">
                SIAP-PRESENSI
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Registrasi Sekolah Baru
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Masuk</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {/* If Registration is Complete: Celebration Screen */}
        {registeredData ? (
          <div className="my-auto py-12 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="size-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 mb-6 shadow-xl animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="size-10 stroke-[2.5]" />
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              Registrasi Sukses
            </span>

            <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">
              Sekolah Berhasil Didaftarkan!
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Selamat datang di ekosistem E-Presensi! Satuan pendidikan <strong>{registeredData.schoolName}</strong> dan akun Administrator Anda telah aktif.
            </p>

            {/* Account Summary Box */}
            <div className="w-full p-5 rounded-2xl bg-muted/40 border border-border/80 flex flex-col gap-3 text-left mb-8">
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Satuan Pendidikan:</span>
                <span className="text-xs font-bold text-foreground">{registeredData.schoolName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground">NSM / Kode:</span>
                <span className="text-xs font-mono font-bold text-primary">{registeredData.nsm}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Email Login Admin:</span>
                <span className="text-xs font-bold text-foreground">{registeredData.adminEmail}</span>
              </div>
            </div>

            <Button
              onClick={() => router.push("/login")}
              size="lg"
              className="w-full text-base font-semibold shadow-lg shadow-primary/20"
              rightIcon={<ArrowRight className="size-4" />}
            >
              Masuk ke Portal Presensi
            </Button>
          </div>
        ) : (
          /* Main Multi-Step Form */
          <div className="my-auto py-6 flex flex-col gap-6">
            {/* Form Title & Stepper Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-primary">
                  Langkah {currentStep} dari 3
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentStep === 1 && "Identitas Sekolah"}
                  {currentStep === 2 && "Lokasi Geofencing GPS"}
                  {currentStep === 3 && "Akun Administrator"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-1">
                {currentStep === 1 && "Data Satuan Pendidikan"}
                {currentStep === 2 && "Pengaturan Titik Geofence Presensi"}
                {currentStep === 3 && "Akun Administrator Sekolah"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {currentStep === 1 && "Lengkapi informasi resmi sekolah atau madrasah yang akan menggunakan sistem."}
                {currentStep === 2 && "Tentukan koordinat pusat sekolah agar guru hanya dapat absen di area sekolah."}
                {currentStep === 3 && "Buat akun penanggung jawab / operator yang akan mengelola data guru & rekap absensi."}
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* =================================================== */}
              {/* STEP 1: DATA SEKOLAH                                */}
              {/* =================================================== */}
              {currentStep === 1 && (
                <div className="flex flex-col gap-4">
                  {/* Nama Sekolah */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <School className="size-3.5 text-primary" />
                      <span>Nama Sekolah / Madrasah <strong className="text-destructive">*</strong></span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: MIN 1 Jakarta Selatan atau SMP Negeri 3"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Nama lengkap resmi satuan pendidikan Anda.
                    </span>
                  </div>

                  {/* Row: NSM & NPSN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* NSM */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary" />
                        <span>NSM / Kode Registrasi <strong className="text-destructive">*</strong></span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Contoh: 111131710001"
                        value={nsm}
                        onChange={(e) => setNsm(e.target.value)}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Nomor Statistik Madrasah atau kode registrasi unik sekolah.
                      </span>
                    </div>

                    {/* NPSN */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span>NPSN (Opsional)</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="8 digit angka (Contoh: 20109988)"
                        value={npsn}
                        onChange={(e) => setNpsn(e.target.value)}
                        maxLength={8}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Nomor Pokok Sekolah Nasional dari Kemendikbud/Kemenag.
                      </span>
                    </div>
                  </div>

                  {/* Row: Email Sekolah & No Telepon */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email Sekolah */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <span>Email Resmi Sekolah (Opsional)</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="info@sekolah.sch.id"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                      />
                    </div>

                    {/* No Telepon */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted-foreground" />
                        <span>No. Telepon Kantor (Opsional)</span>
                      </label>
                      <Input
                        type="tel"
                        placeholder="021-12345678"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Alamat Lengkap */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" />
                      <span>Alamat Lengkap Satuan Pendidikan</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Jl. Raya Pendidikan No. 45, RT/RW 01/02, Kelurahan, Kecamatan, Kota/Kabupaten"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* =================================================== */}
              {/* STEP 2: LOKASI GEOFENCE GPS                         */}
              {/* =================================================== */}
              {currentStep === 2 && (
                <div className="flex flex-col gap-4">
                  {/* GPS Auto-detect Action Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                        <LocateFixed className="size-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Sedang Berada di Lokasi Sekolah Sekarang?
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Gunakan sensor GPS perangkat Anda untuk mengisi titik koordinat secara otomatis dan akurat.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      onClick={handleDetectGPS}
                      isLoading={isLocating}
                      leftIcon={<LocateFixed className="size-3.5" />}
                      className="shrink-0"
                    >
                      Ambil Lokasi Saat Ini (GPS)
                    </Button>
                  </div>

                  {gpsAccuracy && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      <span>Akurasi GPS perangkat: &plusmn;{gpsAccuracy} meter</span>
                    </div>
                  )}

                  {/* Latitude & Longitude Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Compass className="size-3.5 text-primary" />
                        <span>Latitude (Garis Lintang) <strong className="text-destructive">*</strong></span>
                      </label>
                      <Input
                        type="text"
                        placeholder="-6.2088"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Contoh: -6.208763
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Compass className="size-3.5 text-primary" />
                        <span>Longitude (Garis Bujur) <strong className="text-destructive">*</strong></span>
                      </label>
                      <Input
                        type="text"
                        placeholder="106.8456"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Contoh: 106.845599
                      </span>
                    </div>
                  </div>

                  {/* Radius Slider / Input */}
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border/70">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" />
                        <span>Radius Geofencing Presensi</span>
                      </label>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs font-mono">
                        {radiusMeters} Meter
                      </span>
                    </div>

                    <input
                      type="range"
                      min={20}
                      max={250}
                      step={5}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(Number(e.target.value))}
                      className="w-full accent-[#0A5C36] cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>20m (Gedung Kecil)</span>
                      <span className="font-semibold text-primary">50m (Rekomendasi Standar)</span>
                      <span>250m (Kompleks Luas)</span>
                    </div>
                  </div>

                  {/* External Google Maps Preview Link */}
                  {latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Periksa titik koordinat Anda di peta:</span>
                      <a
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <span>Buka di Google Maps</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================== */}
              {/* STEP 3: AKUN ADMINISTRATOR                          */}
              {/* =================================================== */}
              {currentStep === 3 && (
                <div className="flex flex-col gap-4">
                  {/* Admin Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" />
                      <span>Nama Lengkap Administrator <strong className="text-destructive">*</strong></span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: H. Ahmad Fauzi, S.Pd.I"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Penanggung jawab atau operator madrasah.
                    </span>
                  </div>

                  {/* Row: Email Admin & No HP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Admin Email */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-primary" />
                        <span>Email Login Admin <strong className="text-destructive">*</strong></span>
                      </label>
                      <Input
                        type="email"
                        placeholder="admin@sekolah.sch.id"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Digunakan untuk masuk ke panel web admin.
                      </span>
                    </div>

                    {/* Admin Phone */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted-foreground" />
                        <span>No. WhatsApp / HP Admin (Opsional)</span>
                      </label>
                      <Input
                        type="tel"
                        placeholder="081234567890"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Admin NIP */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <span>NIP / NIK Admin (Opsional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="18 digit NIP atau 16 digit NIK"
                      value={adminNip}
                      onChange={(e) => setAdminNip(e.target.value)}
                    />
                  </div>

                  {/* Row: Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 text-primary" />
                        <span>Kata Sandi <strong className="text-destructive">*</strong></span>
                      </label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimal 6 karakter"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        }
                        required
                      />
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 text-primary" />
                        <span>Konfirmasi Kata Sandi <strong className="text-destructive">*</strong></span>
                      </label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Ulangi kata sandi"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      {confirmPassword && adminPassword !== confirmPassword && (
                        <span className="text-[10px] text-destructive font-medium">
                          Kata sandi tidak cocok.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Terms & Agreement */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary accent-[#0A5C36] cursor-pointer"
                        required
                      />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        Saya menyatakan data satuan pendidikan ini benar dan bersedia mematuhi ketentuan penggunaan sistem presensi digital geofencing.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    leftIcon={<ArrowLeft className="size-4" />}
                  >
                    Kembali
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button
                      type="button"
                      variant="ghost"
                      leftIcon={<ArrowLeft className="size-4" />}
                    >
                      Batal / Ke Login
                    </Button>
                  </Link>
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    rightIcon={<ArrowRight className="size-4" />}
                    className="ml-auto"
                  >
                    Lanjutkan
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={!agreeTerms || isSubmitting}
                    rightIcon={<CheckCircle2 className="size-4" />}
                    className="ml-auto text-base font-semibold shadow-md shadow-primary/20"
                  >
                    Daftarkan Sekolah Sekarang
                  </Button>
                )}
              </div>
            </form>

            {/* Bottom Login Link Notice */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Sudah memiliki akun madrasah terdaftar?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline hover:text-emerald-700"
                >
                  Masuk ke Portal Presensi →
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; 2026 Kementerian Agama RI</span>
          <div
            className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors"
            onClick={() => alert("Bantuan pendaftaran sekolah: hubungi support@kemenag.go.id")}
          >
            <HelpCircle className="size-3.5" />
            <span>Bantuan Pendaftaran</span>
          </div>
        </div>
      </div>
    </div>
  );
}
