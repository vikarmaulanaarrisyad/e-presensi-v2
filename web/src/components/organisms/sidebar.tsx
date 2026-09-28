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
  Settings,
  UserCheck,
  Clock
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
  const effectiveUserRole = userRole || (isSuperadmin ? "SUPERADMIN" : "ADMIN_MADRASAH");

  // Dynamic Navigation based on Route / Role
  const navItems = isSuperadmin
    ? [
        {
          title: "Manajemen Madrasah",
          href: "/superadmin",
          icon: Building2,
          badge: "CRUD",
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
      ]
    : [
        {
          title: "Dashboard Presensi",
          href: "/admin",
          icon: LayoutDashboard,
          badge: "Hari Ini",
        },
        {
          title: "Kelola Data Guru",
          href: "/admin/teachers",
          icon: Users,
        },
        {
          title: "Jam Kerja & Hari Libur",
          href: "/admin/settings",
          icon: Clock,
          badge: "Kebijakan",
        },
        {
          title: "Koordinat & Geofence",
          href: "/admin/geofence",
          icon: MapPin,
          badge: "Radius 50m",
        },
        {
          title: "Laporan & Rekap",
          href: "/admin/reports",
          icon: FileText,
        },
      ];

  return (
    <aside className="w-64 xl:w-72 bg-[#042817] text-white flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-white/10 select-none z-40">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-[#0A5C36] p-0.5 shadow-md flex items-center justify-center">
            <div className="size-full rounded-[10px] bg-[#05331d] flex items-center justify-center">
              <School className="size-6 text-[#E5C158]" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white truncate">
                E-Presensi
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#F3E3AC] border border-[#D4AF37]/40">
                {isSuperadmin ? "PUSAT" : "MI"}
              </span>
            </div>
            <span className="text-xs text-emerald-200/80 truncate font-medium">
              {effectiveMadrasahName}
            </span>
          </div>
        </div>

        {/* Role Pill */}
        <div className="mx-4 mt-4 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                {isSuperadmin ? "Superadmin Kemenag" : "Operator Madrasah"}
              </span>
              <span className="text-[10px] text-emerald-200/70 truncate">Sesi Aktif</span>
            </div>
          </div>
          <ShieldCheck className="size-4 text-[#E5C158] shrink-0" />
        </div>

        {/* Navigation Items */}
        <nav className="p-4 flex flex-col gap-1.5 mt-2">
          <span className="px-3 pb-2 text-[10px] font-semibold text-emerald-200/60 uppercase tracking-wider">
            {isSuperadmin ? "Menu Superadmin" : "Menu Operator"}
          </span>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs xl:text-sm font-medium transition-all group",
                  isActive
                    ? "bg-emerald-600/30 text-white border border-emerald-500/40 shadow-sm"
                    : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-4 xl:size-4.5 transition-colors",
                      isActive
                        ? "text-[#E5C158]"
                        : "text-emerald-300/70 group-hover:text-white"
                    )}
                  />
                  <span>{item.title}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                      isActive
                        ? "bg-[#D4AF37] text-[#042817]"
                        : "bg-white/10 text-emerald-200/80"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Logout */}
      <div className="p-4 border-t border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
          <div className="size-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
            {effectiveUserName.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-white truncate">
              {effectiveUserName}
            </span>
            <span className="text-[10px] text-emerald-200/70 truncate">
              {isSuperadmin ? "superadmin@kemenag.go.id" : "admin@min1jaksel.sch.id"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-destructive/15 border border-destructive/25 text-red-200 hover:bg-destructive/25 text-xs font-medium transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>
  );
}
