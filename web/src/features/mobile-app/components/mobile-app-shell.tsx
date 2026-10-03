"use client";

import React, { useState } from "react";
import { MobileHomeView } from "./mobile-home-view";
import { MobileHistoryView } from "./mobile-history-view";
import { MobilePermitView } from "./mobile-permit-view";
import { MobileProfileView } from "./mobile-profile-view";
import { MobileJournalView } from "./mobile-journal-view";

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
      allowBackdatedAttendance?: boolean;
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

type TabId = "home" | "journal" | "history" | "permit" | "profile";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "Beranda",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "journal",
    label: "Jurnal KBM",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    id: "history",
    label: "Riwayat",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h6l3 18 3-12 2 6h4"/>
      </svg>
    ),
  },
  {
    id: "permit",
    label: "Izin",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profil",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const tabOrder: TabId[] = ["home", "journal", "history", "permit", "profile"];

export function MobileAppShell({ data, onRefresh }: MobileAppShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [animationClass, setAnimationClass] = useState<string>("animate-tab-fade-up");

  const handleTabChange = (nextTab: TabId) => {
    if (nextTab === activeTab) return;
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(nextTab);
    setAnimationClass(nextIndex > currentIndex ? "animate-tab-slide-right" : "animate-tab-slide-left");
    setActiveTab(nextTab);
  };

  return (
    <div
      className="relative w-full min-h-screen flex flex-col text-[#0b1c30] select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        backgroundColor: "#f8f9ff",
      }}
    >
      {/* ── TOP HEADER ── */}
      <header
        className="fixed top-0 w-full z-50 pt-safe"
        style={{
          background: "rgba(248,249,255,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          maxWidth: "inherit",
        }}
      >
        <div className="h-16 px-4 flex items-center justify-between">
          {/* Logo + Title with Animated Crossfade */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Logo E-Presensi"
              className="h-8 w-auto object-contain rounded-md"
              src="/icons/app-logo.png"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div key={activeTab} className="flex flex-col animate-title-fade">
              <span className="text-[11px] text-[#444653] font-semibold leading-none">E-Presensi Guru</span>
              <h1 className="text-[14px] font-bold text-[#0b1c30] leading-tight">
                {activeTab === "home" && "Beranda"}
                {activeTab === "journal" && "Jurnal Pembelajaran KBM"}
                {activeTab === "history" && "Riwayat Kehadiran"}
                {activeTab === "permit" && "Pengajuan Izin"}
                {activeTab === "profile" && "Profil Pengguna"}
              </h1>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Notif bell */}
            <button
              aria-label="Notifikasi"
              className="w-11 h-11 relative flex items-center justify-center rounded-full text-[#0b1c30] hover:bg-[#e5eeff] transition-colors active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-[#f8f9ff]" />
            </button>
            {/* Avatar Button */}
            <button
              type="button"
              onClick={() => handleTabChange("profile")}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all active:scale-95 ${
                activeTab === "profile" ? "ring-2 ring-[#00288e] bg-[#00288e]" : "bg-[#00288e] hover:opacity-90"
              }`}
              title="Profil Guru"
            >
              <span className="text-white text-[13px] font-bold">
                {data.teacher.name.charAt(0)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── SCROLLABLE BODY WITH DIRECTIONAL ANIMATION ── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: "64px", paddingBottom: "80px" }}
      >
        <div key={activeTab} className={`px-4 py-4 ${animationClass}`}>
          {activeTab === "home" && (
            <MobileHomeView
              data={data}
              onRefresh={onRefresh}
              onOpenHistoryTab={() => handleTabChange("permit")}
              onOpenJournalTab={() => handleTabChange("journal")}
            />
          )}
          {activeTab === "journal" && (
            <MobileJournalView userId={data.teacher.id} />
          )}
          {activeTab === "history" && (
            <MobileHistoryView userId={data.teacher.id} />
          )}
          {activeTab === "permit" && (
            <MobilePermitView
              userId={data.teacher.id}
              onSuccess={() => {
                onRefresh();
                handleTabChange("history");
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
      </main>

      {/* ── BOTTOM NAV BAR (Material 3 style) ── */}
      <nav
        className="fixed bottom-0 w-full z-50 pb-safe"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -4px 16px -2px rgba(15,23,42,0.05)",
          maxWidth: "inherit",
        }}
      >
        <div className="h-16 px-4 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] transition-all duration-200 active:scale-90 ${
                  isActive
                    ? "text-[#00288e] font-bold"
                    : "text-[#444653] hover:text-[#0b1c30]"
                }`}
              >
                {/* Icon with pill bg */}
                <div
                  className={`px-3 py-1 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-[#dde1ff] scale-110 shadow-xs text-[#00288e]"
                      : "text-[#444653]"
                  }`}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-[11px] mt-0.5 leading-none transition-all duration-200 ${
                    isActive ? "font-bold text-[#00288e] scale-105" : "text-[#444653]"
                  }`}
                >
                  {tab.label}
                </span>

                {/* Animated active indicator dot */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00288e] mt-0.5 animate-in zoom-in duration-200" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
