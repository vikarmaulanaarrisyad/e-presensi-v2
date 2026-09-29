"use client";

import React from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Smartphone, 
  LogOut, 
  ChevronRight,
  Sparkles,
  Info,
  Lock
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { signOut } from "next-auth/react";
import { swalSuccess } from "@/lib/swal";

interface MobileProfileViewProps {
  teacher: {
    id: string;
    name: string;
    nip: string;
    email: string;
    phone: string;
    avatarUrl?: string | null;
    madrasahName: string;
    madrasahAddress: string;
  };
  settings: {
    workStartTime: string;
    lateThreshold: string;
    workEndTime: string;
    radiusMeters: number;
  };
}

export function MobileProfileView({ teacher, settings }: MobileProfileViewProps) {
  const handleLogout = async () => {
    swalSuccess("Sampai Jumpa!", "Anda telah keluar dari aplikasi.", 1500);
    setTimeout(async () => {
      try {
        await signOut({ redirect: false });
      } catch (e) {
        console.error("Signout error:", e);
      } finally {
        window.location.href = "/guru/login";
      }
    }, 600);
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* 1. Profile Identity Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm text-center flex flex-col items-center">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-600/30">
            {teacher.name.charAt(0)}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
          {teacher.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          NIP. {teacher.nip}
        </p>
        <Badge className="mt-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px]">
          Guru Aktif Kemenag
        </Badge>
      </div>

      {/* 2. Personal & School Info */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
          Informasi Satuan Kerja
        </h4>

        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-400 block">Madrasah Pangkal:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {teacher.madrasahName}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                {teacher.madrasahAddress || "Jakarta Selatan, DKI Jakarta"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Jadwal Kerja Aktif:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {settings.workStartTime} - {settings.workEndTime} WIB (Batas Toleransi: {settings.lateThreshold})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Email Akun:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{teacher.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Phone className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">No. Kontak / WhatsApp:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{teacher.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Security & App Version */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
          Aplikasi & Perangkat
        </h4>

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-500" />
            <span className="text-slate-700 dark:text-slate-300">Versi Mobile Web</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-600 font-semibold">v2.4.0 (Flutter Engine)</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-700 dark:text-slate-300">Status Keamanan</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Terverifikasi</span>
        </div>
      </div>

      {/* 4. Logout Button */}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl py-5 text-xs font-bold gap-2"
      >
        <LogOut className="w-4 h-4" />
        Keluar dari Akun Guru
      </Button>
    </div>
  );
}
