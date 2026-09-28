"use client";

import React, { useState } from "react";
import { 
  Clock, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  CalendarDays,
  Sparkles,
  Sliders,
  Info
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { FormInput } from "@/components/molecules/form-field";
import { 
  saveAttendanceSettingsAction, 
  addHolidayAction, 
  deleteHolidayAction 
} from "@/server/actions/settings.actions";

interface SettingsData {
  madrasahId: string;
  madrasahName: string;
  nsm: string;
  workStartTime: string;
  lateThreshold: string;
  workEndTime: string;
  workDays: string;
  requireSelfie: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  holidays: Array<{
    id: string;
    name: string;
    date: string | Date;
    description: string | null;
  }>;
}

export function AttendanceSettingsView({ initialData }: { initialData: SettingsData }) {
  const [activeTab, setActiveTab] = useState<"hours" | "holidays" | "geofence">("hours");

  // Form State: Work Hours & Geofence
  const [workStartTime, setWorkStartTime] = useState(initialData.workStartTime || "07:00");
  const [lateThreshold, setLateThreshold] = useState(initialData.lateThreshold || "07:15");
  const [workEndTime, setWorkEndTime] = useState(initialData.workEndTime || "14:00");
  const [requireSelfie, setRequireSelfie] = useState(initialData.requireSelfie ?? true);
  const [latitude, setLatitude] = useState(String(initialData.latitude || -6.2615));
  const [longitude, setLongitude] = useState(String(initialData.longitude || 106.8106));
  const [radiusMeters, setRadiusMeters] = useState(String(initialData.radiusMeters || 50));

  // Work Days Selection (1=Senin, 5=Jumat, 6=Sabtu)
  const currentWorkDaysArray = (initialData.workDays || "1,2,3,4,5").split(",");
  const [selectedDays, setSelectedDays] = useState<string[]>(currentWorkDaysArray);

  // Holidays State
  const [holidays, setHolidays] = useState(initialData.holidays || []);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayDesc, setNewHolidayDesc] = useState("");

  // Loading & Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const daysOfWeek = [
    { id: "1", name: "Senin" },
    { id: "2", name: "Selasa" },
    { id: "3", name: "Rabu" },
    { id: "4", name: "Kamis" },
    { id: "5", name: "Jumat" },
    { id: "6", name: "Sabtu" },
    { id: "7", name: "Minggu" },
  ];

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await saveAttendanceSettingsAction(initialData.madrasahId, {
      workStartTime,
      lateThreshold,
      workEndTime,
      workDays: selectedDays.join(","),
      requireSelfie,
      latitude: parseFloat(latitude) || -6.2615,
      longitude: parseFloat(longitude) || 106.8106,
      radiusMeters: parseFloat(radiusMeters) || 50,
    });

    setIsSaving(false);

    if (res?.error) {
      setErrorMessage(res.error);
    } else {
      setSuccessMessage("Pengaturan jam kerja dan geofence berhasil disimpan.");
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Add Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) {
      alert("Nama libur dan tanggal wajib diisi.");
      return;
    }

    setIsAddingHoliday(true);
    const res = await addHolidayAction(initialData.madrasahId, {
      name: newHolidayName,
      date: newHolidayDate,
      description: newHolidayDesc,
    });
    setIsAddingHoliday(false);

    if (res?.success && res.data) {
      setHolidays([...holidays, res.data as any]);
      setNewHolidayName("");
      setNewHolidayDate("");
      setNewHolidayDesc("");
      setSuccessMessage("Hari libur baru berhasil ditambahkan.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      alert("Gagal menambahkan hari libur.");
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus hari libur ini?")) return;
    setDeletingHolidayId(id);
    const res = await deleteHolidayAction(id);
    setDeletingHolidayId(null);
    if (res?.success) {
      setHolidays(holidays.filter((h) => h.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#042817] via-[#0A5C36] to-[#04331d] text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Pengaturan Kehadiran & Kalender Akademik
            </h1>
            <Badge variant="gold">Kebijakan MI</Badge>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
            Konfigurasi jam masuk, batas toleransi keterlambatan, hari libur madrasah, dan parameter radius geofencing.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-emerald-200">
          <Clock className="size-3.5 text-accent" />
          <span>{initialData.madrasahName} (NSM: {initialData.nsm})</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-card border border-border shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("hours")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "hours"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Clock className="size-4" />
          <span>Jam Kerja & Hari Aktif</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("holidays")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "holidays"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <CalendarDays className="size-4" />
          <span>Kalender Hari Libur ({holidays.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("geofence")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "geofence"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <MapPin className="size-4" />
          <span>Radius Geofencing ({radiusMeters}m)</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: Jam Operasional & Hari Aktif */}
      {activeTab === "hours" && (
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-6">
            <div className="border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Clock className="size-4.5 text-primary" />
                <span>Jam Kerja & Toleransi Presensi Harian</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jam masuk resmi, batas toleransi sebelum ditandai terlambat, dan jam kepulangan guru.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Jam Masuk Resmi
                </label>
                <Input
                  type="time"
                  required
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">Default: 07:00 WIB</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Batas Toleransi Terlambat
                </label>
                <Input
                  type="time"
                  required
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">Lewat jam ini = Status Terlambat</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Jam Pulang Guru
                </label>
                <Input
                  type="time"
                  required
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">Presensi kepulangan dibuka</span>
              </div>
            </div>

            {/* Work Days Selector */}
            <div className="pt-4 border-t border-border/60 flex flex-col gap-3">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Hari Kerja Aktif Madrasah (Guru Wajib Absen)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {daysOfWeek.map((day) => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {day.name} {isSelected ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Hari yang tidak dicentang otomatis dianggap libur mingguan (Guru tidak wajib presensi).
              </span>
            </div>

            {/* Selfie Verification Toggle */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Camera className="size-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Wajib Foto Selfie Live Kamera Depan
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Mewajibkan guru mengambil foto langsung saat clock-in di aplikasi mobile.
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireSelfie}
                  onChange={(e) => setRequireSelfie(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="default"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save className="size-4" />}
            >
              Simpan Pengaturan Jam & Hari Kerja
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: Kalender Hari Libur & Cuti Bersama */}
      {activeTab === "holidays" && (
        <div className="flex flex-col gap-6">
          {/* Add Holiday Card */}
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
            <div className="border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Plus className="size-4.5 text-primary" />
                <span>Tambah Hari Libur Resmi / Cuti Madrasah</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pada tanggal libur ini, sistem otomatis menonaktifkan kewajiban absensi guru.
              </p>
            </div>

            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormInput
                label="Tanggal Libur"
                type="date"
                required
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
              />

              <FormInput
                label="Nama Hari Libur / Peringatan"
                placeholder="Contoh: Hari Santri Nasional"
                required
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
              />

              <FormInput
                label="Keterangan / Kategori (Opsional)"
                placeholder="Contoh: Libur Nasional Kemenag"
                value={newHolidayDesc}
                onChange={(e) => setNewHolidayDesc(e.target.value)}
              />

              <div className="sm:col-span-3 flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="default"
                  isLoading={isAddingHoliday}
                  leftIcon={<Plus className="size-4" />}
                >
                  Tambahkan ke Kalender Libur
                </Button>
              </div>
            </form>
          </div>

          {/* Holidays List Table */}
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
            <div className="border-b border-border/60 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <CalendarDays className="size-4.5 text-primary" />
                  <span>Daftar Hari Libur Terdaftar ({holidays.length})</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftar tanggal di mana presensi harian ditiadakan.
                </p>
              </div>
              <Badge variant="gold">Tahun Ajaran 2026/2027</Badge>
            </div>

            {holidays.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                Belum ada hari libur khusus yang ditambahkan untuk madrasah ini.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {holidays.map((h) => {
                  const dateObj = new Date(h.date);
                  const formatted = dateObj.toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={h.id}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-muted/20 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                          <Calendar className="size-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm">
                            {h.name}
                          </span>
                          <span className="text-xs text-primary font-medium">
                            {formatted}
                          </span>
                          {h.description && (
                            <span className="text-[11px] text-muted-foreground">
                              {h.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={deletingHolidayId === h.id}
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-xs"
                        leftIcon={<Trash2 className="size-3.5" />}
                      >
                        Hapus
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Parameter Geofencing GPS */}
      {activeTab === "geofence" && (
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-6">
            <div className="border-b border-border/60 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <MapPin className="size-4.5 text-primary" />
                  <span>Titik Koordinat & Toleransi Jarak Radius</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Titik tengah gedung madrasah yang menjadi acuan validasi jarak formula Haversine.
                </p>
              </div>
              <Badge variant="gold">Radius Aktif: {radiusMeters} Meter</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormInput
                label="Latitude (Garis Lintang)"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-6.2615"
              />

              <FormInput
                label="Longitude (Garis Bujur)"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="106.8106"
              />

              <FormInput
                label="Radius Geofence (Meter)"
                type="number"
                min="10"
                max="500"
                required
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                placeholder="50"
              />
            </div>

            {/* Info Card */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
              <Info className="size-5 shrink-0 text-primary mt-0.5" />
              <div className="flex flex-col gap-1 leading-relaxed">
                <span className="font-bold text-foreground">Bagaimana cara kerja radius ini?</span>
                <p>
                  Aplikasi mobile Flutter akan mengambil koordinat GPS perangkat guru saat mereka menekan tombol presensi. Server kemudian menghitung jarak garis lurus menggunakan <strong>Haversine Formula</strong>. Jika jarak &le; {radiusMeters} meter, presensi disetujui; jika lebih, presensi langsung ditolak dengan pesan peringatan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="default"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save className="size-4" />}
            >
              Simpan Parameter Geofencing
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
