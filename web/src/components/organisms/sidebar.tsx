"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  School, 
  LayoutDashboard, 
  Users, 
  MapPin, 
  FileText, 
  LogOut, 
  ShieldCheck,
  Building2,
  BarChart3,
  Clock,
  Sparkles,
  ChevronRight,
  Smartphone,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface SidebarProps {
  madrasahName?: string;
  userName?: string;
  userRole?: string;
}

export function Sidebar({
  madrasahName,
  userName,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const isSuperadmin = pathname.startsWith("/superadmin");

  const effectiveMadrasahName = madrasahName || (isSuperadmin ? "Kemenag RI Pusat" : "MIN 1 Jakarta Selatan");
  const effectiveUserName = userName || (isSuperadmin ? "Superadministrator" : "Operator Madrasah");

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  // Navigation Items Groups
  const navGroups = isSuperadmin
    ? [
        {
          groupLabel: "PUSAT KENDALI",
          items: [
            {
              title: "Manajemen Madrasah",
              href: "/superadmin",
              icon: Building2,
              badge: "Nasional",
            },
            {
              title: "Statistik Nasional",
              href: "/superadmin/analytics",
              icon: BarChart3,
            },
            {
              title: "Semua Akun Guru",
              href: "/superadmin/users",
              icon: Users,
            },
          ],
        },
      ]
    : [
        {
          groupLabel: "MENU UTAMA",
          items: [
            {
              title: "Dashboard Presensi",
              href: "/admin",
              icon: LayoutDashboard,
              badge: "Hari Ini",
            },
            {
              title: "Presensi Massal",
              href: "/admin/bulk-attendance",
              icon: UserCheck,
              badge: "Baru",
            },
            {
              title: "Kelola Data Guru",
              href: "/admin/teachers",
              icon: Users,
              badge: "Import Excel",
            },
          ],
        },
        {
          groupLabel: "KEBIJAKAN & JADWAL",
          items: [
            {
              title: "Jam Kerja & Libur",
              href: "/admin/settings",
              icon: Clock,
              badge: "Kemenag",
            },
            {
              title: "Radius Geofencing",
              href: "/admin/geofence",
              icon: MapPin,
              badge: "50m",
            },
          ],
        },
        {
          groupLabel: "DOKUMEN & REKAP",
          items: [
            {
              title: "Laporan & Rekap",
              href: "/admin/reports",
              icon: FileText,
              badge: "Cetak F4",
            },
          ],
        },
        {
          groupLabel: "PORTAL MOBILE GURU",
          items: [
            {
              title: "Aplikasi Mobile Guru",
              href: "/guru",
              icon: Smartphone,
              badge: "Flutter UI",
            },
          ],
        },
      ];

  return (
    <aside className="w-64 xl:w-72 bg-[#0B1320] text-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-slate-800/80 select-none z-40 shadow-xl">
      {/* Top Section */}
      <div className="flex flex-col overflow-y-auto">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="size-full rounded-[9px] bg-slate-900 flex items-center justify-center">
              <School className="size-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white truncate">
                E-Presensi Guru
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {isSuperadmin ? "KEMENAG" : "MADRASAH"}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 truncate font-medium">
              {effectiveMadrasahName}
            </span>
          </div>
        </div>

        {/* Status Indicator Pill */}
        <div className="mx-4 mt-4 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider truncate">
                {isSuperadmin ? "Sesi Superadmin" : "Sesi Operator"}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono truncate">Online & Terhubung</span>
            </div>
          </div>
          <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
        </div>

        {/* Navigation Groups */}
        <nav className="p-4 flex flex-col gap-5 mt-1">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-1">
              <span className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.groupLabel}
              </span>

              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs xl:text-sm font-medium transition-all group",
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs font-semibold"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          "size-4 xl:size-4.5 transition-colors",
                          isActive
                            ? "text-emerald-400"
                            : "text-slate-400 group-hover:text-slate-200"
                        )}
                      />
                      <span>{item.title}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          isActive
                            ? "bg-emerald-400 text-slate-950 font-bold"
                            : "bg-slate-800 text-slate-400"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 flex flex-col gap-2.5 bg-slate-950/40">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="size-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
            {effectiveUserName.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-200 truncate">
              {effectiveUserName}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {isSuperadmin ? "superadmin@kemenag.go.id" : "admin@min1jaksel.sch.id"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>
  );
}
