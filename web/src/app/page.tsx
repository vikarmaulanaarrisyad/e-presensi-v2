"use client";

import React from "react";
import { 
  Building2, 
  MapPin, 
  UserCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  School
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { FormField, FormInput } from "@/components/molecules/form-field";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <School className="size-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground block">
                E-Presensi Madrasah
              </span>
              <span className="text-xs text-muted-foreground block -mt-0.5">
                Kementerian Agama RI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="gold" icon={<ShieldCheck className="size-3" />}>
              Multi-Tenant SaaS
            </Badge>
            <Button size="sm" variant="outline">
              Dokumentasi
            </Button>
            <Button size="sm" variant="default" rightIcon={<ArrowRight className="size-3.5" />}>
              Masuk Sistem
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full flex flex-col gap-12">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4">
          <Badge variant="default" icon={<MapPin className="size-3" />}>
            Geofencing GPS & Haversine Formula
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Komponen UI Atomic <br />
            <span className="text-primary">E-Presensi Guru Madrasah</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Desain sistem Kementerian Agama dengan nuansa <span className="font-semibold text-primary">Emerald Green</span> & aksen <span className="font-semibold text-accent-foreground">Gold</span>. Dibuat dengan Tailwind CSS & Shadcn UI.
          </p>
        </section>

        {/* Components Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Atomic Buttons & Badges */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                1. Atoms: Button & Badge
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Komponen Button dengan varian Kemenag (Default & Gold), status loading, dan icon adornment.
              </p>
            </div>

            {/* Buttons variants */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Button Variants
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="default" leftIcon={<UserCheck className="size-4" />}>
                  Kemenag Green
                </Button>
                <Button variant="gold" leftIcon={<ShieldCheck className="size-4" />}>
                  Gold Accent
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Button States */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                States & Sizes
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="sm" variant="default">Small</Button>
                <Button size="default" variant="default">Default</Button>
                <Button size="lg" variant="default">Large Size</Button>
                <Button isLoading variant="default">Memproses...</Button>
                <Button disabled variant="outline">Disabled</Button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attendance & Role Badges
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" icon={<ShieldCheck className="size-3" />}>SUPERADMIN</Badge>
                <Badge variant="gold" icon={<Building2 className="size-3" />}>ADMIN MADRASAH</Badge>
                <Badge variant="success" icon={<UserCheck className="size-3" />}>Hadir Tepat Waktu</Badge>
                <Badge variant="warning" icon={<Clock className="size-3" />}>Terlambat</Badge>
                <Badge variant="destructive">Alpa / Absen</Badge>
                <Badge variant="outline">Izin / Sakit</Badge>
              </div>
            </div>
          </div>

          {/* Card 2: Molecules: FormField & FormInput */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                2. Molecules: FormField & FormInput
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gabungan atom Label, Input, Helper text, dan error validation state.
              </p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <FormInput
                label="Email Madrasah / Akun Kemenag"
                required
                leftIcon={<Mail className="size-4" />}
                placeholder="operator@min1jaksel.sch.id"
                defaultValue="admin@min1jaksel.sch.id"
                description="Gunakan email resmi yang telah didaftarkan operator."
              />

              <FormInput
                label="Kata Sandi"
                type="password"
                required
                leftIcon={<Lock className="size-4" />}
                placeholder="••••••••"
                defaultValue="Password123!"
              />

              {/* Input with Error State Example */}
              <FormInput
                label="Nomor Induk Pegawai (NIP)"
                placeholder="199203152019031002"
                error="Format NIP harus terdiri dari 18 digit angka valid."
                defaultValue="19920315"
              />

              {/* Custom FormField Wrapper with Child */}
              <FormField
                label="Koordinat Geofence Madrasah (Lat / Lng)"
                description="Otomatis tervalidasi dengan formula Haversine radius 50 meter."
              >
                <Input
                  leftIcon={<MapPin className="size-4" />}
                  defaultValue="-6.2615, 106.8106 (Radius: 50m)"
                  readOnly
                  className="bg-muted/40 font-mono text-xs"
                />
              </FormField>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button">Batal</Button>
                <Button variant="default" type="submit" rightIcon={<ArrowRight className="size-4" />}>
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        &copy; 2026 E-Presensi Guru Madrasah Ibtidaiyah &bull; Terintegrasi Kemenag &bull; Multi-Tenant SaaS
      </footer>
    </div>
  );
}
