"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Heart, ExternalLink, School } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-card text-muted-foreground select-none mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Left: Brand & Copyright */}
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <School className="size-3.5" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-bold text-foreground">
              E-Presensi Madrasah
            </span>
            <span className="hidden sm:inline text-muted-foreground/60">&bull;</span>
            <span className="text-[11px] text-muted-foreground">
              Kementerian Agama Republik Indonesia &copy; {currentYear}. Hak Cipta Dilindungi.
            </span>
          </div>
        </div>

        {/* Center: System Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/80 text-[11px]">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground">Sistem Operasional</span>
          <span className="text-muted-foreground/60">&bull;</span>
          <span className="text-muted-foreground">Geofence GPS v2.4.0 Enterprise</span>
        </div>

        {/* Right: Quick Links */}
        <div className="flex items-center gap-4 text-[11px]">
          <Link
            href="/admin/settings"
            className="hover:text-foreground transition-colors"
          >
            Kebijakan Presensi
          </Link>
          <span className="text-muted-foreground/40">&bull;</span>
          <Link
            href="/admin/teachers"
            className="hover:text-foreground transition-colors"
          >
            Data Guru
          </Link>
          <span className="text-muted-foreground/40">&bull;</span>
          <a
            href="https://kemenag.go.id"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <span>Portal Kemenag</span>
            <ExternalLink className="size-3 text-muted-foreground/70" />
          </a>
        </div>
      </div>
    </footer>
  );
}
