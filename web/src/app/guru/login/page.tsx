import React from "react";
import { MobileLoginView } from "@/features/mobile-app/components/mobile-login-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login Guru | E-Presensi GTK",
  description: "Portal masuk presensi digital terintegrasi untuk guru dan tenaga kependidikan.",
};

export default function GuruLoginPage() {
  return (
    <div className="min-h-screen w-full bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center sm:py-8 sm:px-4">
      {/* Container: 100% Fullscreen on mobile, centered clean card on desktop */}
      <div className="w-full sm:max-w-md min-h-screen sm:min-h-0 sm:rounded-3xl bg-[#f8f9ff] sm:shadow-xl sm:border sm:border-[#e5eeff] overflow-hidden">
        <MobileLoginView />
      </div>
    </div>
  );
}
