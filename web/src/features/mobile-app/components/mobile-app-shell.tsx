"use client";

import React, { useState } from "react";
import { 
  Home, 
  Calendar, 
  FileText, 
  User, 
  Sparkles,
  ShieldCheck,
  Building2,
  Clock
} from "lucide-react";
import { MobileHomeView } from "./mobile-home-view";
import { MobileHistoryView } from "./mobile-history-view";
import { MobilePermitView } from "./mobile-permit-view";
import { MobileProfileView } from "./mobile-profile-view";

interface MobileAppShellProps {
  data: {
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
      latitude: number;
      longitude: number;
      radiusMeters: number;
      workStartTime: string;
      lateThreshold: string;
      workEndTime: string;
      requireSelfie: boolean;
    };
    todayLog?: {
      id: string;
      status: string;
      checkInTime: string | null;
      checkInDistance: number | null;
      checkInPhotoUrl: string | null;
      checkInLat?: number | null;
      checkInLng?: number | null;
      checkOutTime: string | null;
      checkOutDistance: number | null;
      checkOutPhotoUrl: string | null;
      notes?: string | null;
    } | null;
    holiday?: {
      name: string;
      isNational: boolean;
      description?: string | null;
    } | null;
    isWeekend?: boolean;
  };
  onRefresh: () => void;
}

export function MobileAppShell({ data, onRefresh }: MobileAppShellProps) {
  const [activeTab, setActiveTab] = useState<"home" | "history" | "permit" | "profile">("home");

  const tabs = [
    { id: "home" as const, label: "Beranda", icon: Home },
    { id: "history" as const, label: "Riwayat", icon: Calendar },
    { id: "permit" as const, label: "Izin", icon: FileText },
    { id: "profile" as const, label: "Profil", icon: User },
  ];

  return (
    <div className="relative w-full min-h-[620px] flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      {/* Dynamic Tab Body */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "home" && (
          <MobileHomeView
            data={data}
            onRefresh={onRefresh}
            onOpenHistoryTab={() => setActiveTab("history")}
          />
        )}

        {activeTab === "history" && (
          <MobileHistoryView userId={data.teacher.id} />
        )}

        {activeTab === "permit" && (
          <MobilePermitView
            userId={data.teacher.id}
            onSuccess={() => {
              onRefresh();
              setActiveTab("history");
            }}
          />
        )}

        {activeTab === "profile" && (
          <MobileProfileView
            teacher={data.teacher}
            settings={data.settings}
          />
        )}
      </div>

      {/* FLUTTER BOTTOM NAVIGATION BAR (Cupertino/Material 3 Hybrid) */}
      <div className="sticky bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-emerald-700 dark:text-emerald-400 font-bold scale-105"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                {/* Active Indicator Pill */}
                {isActive && (
                  <div className="absolute -top-1.5 w-7 h-1 rounded-full bg-emerald-600 shadow-sm" />
                )}

                <div
                  className={`p-1 rounded-xl transition-colors ${
                    isActive ? "bg-emerald-50 dark:bg-emerald-950/60" : "bg-transparent"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                </div>

                <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
