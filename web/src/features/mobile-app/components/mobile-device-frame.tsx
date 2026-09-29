"use client";

import React, { useState } from "react";
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  BatteryMedium, 
  Signal, 
  Sparkles, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  ArrowLeft,
  Building2,
  Users,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

interface MobileDeviceFrameProps {
  children: React.ReactNode;
  activeTeacherName?: string;
  onSwitchTeacher?: (nip: string) => void;
  availableTeachers?: Array<{ name: string; nip: string; email: string }>;
}

export function MobileDeviceFrame({
  children,
  activeTeacherName,
  onSwitchTeacher,
  availableTeachers = [],
}: MobileDeviceFrameProps) {
  const [useDeviceChassis, setUseDeviceChassis] = useState<boolean>(true);

  // Status Bar Clock (matches morning attendance time)
  const [statusBarTime, setStatusBarTime] = useState<string>("07:15");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-2 sm:p-6 lg:p-8">
      {/* Top Banner on Desktop */}
      <div className="w-full max-w-5xl mb-6 hidden lg:flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Portal E-Presensi Guru (Versi Mobile App)</span>
              <Badge className="bg-emerald-600/80 text-white text-[10px] px-2 py-0 border-0">
                Flutter UI Experience
              </Badge>
            </h1>
            <p className="text-xs text-slate-400">
              Pengalaman presensi mobile native langsung pada browser web untuk guru madrasah.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Admin Link */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
            <button
              onClick={() => setUseDeviceChassis(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                useDeviceChassis
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Bingkai HP</span>
            </button>
            <button
              onClick={() => setUseDeviceChassis(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                !useDeviceChassis
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Layar Penuh</span>
            </button>
          </div>

          <a
            href="/admin"
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>Admin Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left Side: Desktop Feature Showcase (Visible on Large Screens) */}
        <div className="hidden lg:flex flex-col gap-4 max-w-xs text-left">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Fitur Mobile Native
            </h3>
            <ul className="text-xs text-slate-300 space-y-2.5">
              <li className="flex items-start gap-2">
                <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Selfie Kamera Wajah:</strong> Bukti foto absensi real-time dengan watermark identitas & jam.</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Geofence 50m:</strong> Validasi jarak GPS presisi WGS84 sebelum absen diizinkan.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Rekap Riwayat Bulanan:</strong> Log harian lengkap dengan status hadir & toleransi telat.</span>
              </li>
            </ul>
          </div>

          {/* Quick Teacher Switcher for Tester */}
          {availableTeachers.length > 0 && onSwitchTeacher && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Ganti Akun Guru (Demo)
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Uji coba berbagai profil guru dengan 1-klik:
              </p>
              <div className="space-y-1.5">
                {availableTeachers.map((t) => (
                  <button
                    key={t.nip}
                    onClick={() => onSwitchTeacher(t.nip)}
                    className="w-full text-left p-2.5 rounded-2xl bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 text-xs transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIP: {t.nip}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: The Smartphone Device Mockup */}
        <div
          className={`relative w-full transition-all duration-300 ${
            useDeviceChassis
              ? "max-w-[390px] border-[10px] border-slate-800 rounded-[50px] shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-slate-900 overflow-hidden ring-1 ring-white/10"
              : "max-w-md rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800"
          }`}
        >
          {/* Top Dynamic Island & Status Bar (Simulated Flutter iOS/Android Header) */}
          {useDeviceChassis && (
            <div className="relative pt-3 px-6 pb-1 bg-emerald-900/90 text-white flex items-center justify-between select-none z-30">
              {/* Status Bar Clock */}
              <span className="text-[11px] font-bold font-mono tracking-tight text-white/90">
                {statusBarTime}
              </span>

              {/* Dynamic Island Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full flex items-center justify-end pr-2 gap-1.5 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>

              {/* Status Bar Icons */}
              <div className="flex items-center gap-1.5 text-white/90">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryMedium className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Child Content Viewport (Scrollable) */}
          <div className="w-full bg-slate-50 dark:bg-slate-950 max-h-[82vh] overflow-y-auto">
            {children}
          </div>

          {/* Bottom Home Indicator Bar for iPhone */}
          {useDeviceChassis && (
            <div className="bg-white dark:bg-slate-900 py-2 flex items-center justify-center border-t border-slate-100 dark:border-slate-800/80">
              <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
