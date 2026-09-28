"use client";

import React, { useState, useMemo } from "react";
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
  Info,
  RotateCcw,
  Sun,
  Moon,
  Coffee,
  Check,
  CalendarRange,
  DownloadCloud,
  RefreshCw,
  Filter,
  Landmark,
  Layers,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { FormInput } from "@/components/molecules/form-field";
import { 
  saveAttendanceSettingsAction, 
  addHolidayAction, 
  deleteHolidayAction,
  syncKemenagHolidaysAction,
  fetchSettingsData
} from "@/server/actions/settings.actions";
import { 
  swalLoading, 
  swalSuccess, 
  swalError, 
  swalClose, 
  swalConfirm 
} from "@/lib/swal";

export interface DaySchedule {
  day: number; // 1: Senin, 7: Minggu
  dayName: string;
  isActive: boolean;
  startTime: string;
  lateThreshold: string;
  endTime: string;
  notes?: string;
}

const defaultSchedules: DaySchedule[] = [
  { day: 1, dayName: "Senin", isActive: true, startTime: "06:45", lateThreshold: "07:00", endTime: "14:00", notes: "Upacara Bendera" },
  { day: 2, dayName: "Selasa", isActive: true, startTime: "07:00", lateThreshold: "07:15", endTime: "14:00", notes: "KBM Reguler" },
  { day: 3, dayName: "Rabu", isActive: true, startTime: "07:00", lateThreshold: "07:15", endTime: "14:00", notes: "KBM Reguler" },
  { day: 4, dayName: "Kamis", isActive: true, startTime: "07:00", lateThreshold: "07:15", endTime: "14:00", notes: "KBM Reguler" },
  { day: 5, dayName: "Jumat", isActive: true, startTime: "07:00", lateThreshold: "07:15", endTime: "11:30", notes: "Sholat Jumat" },
  { day: 6, dayName: "Sabtu", isActive: false, startTime: "07:00", lateThreshold: "07:15", endTime: "12:30", notes: "Libur Rutin / Ekstra" },
  { day: 7, dayName: "Minggu", isActive: false, startTime: "07:00", lateThreshold: "07:15", endTime: "12:00", notes: "Libur Rutin" },
];

export interface HolidayItem {
  id: string;
  name: string;
  date: string | Date;
  endDate?: string | Date | null;
  isNational?: boolean;
  description: string | null;
}

interface SettingsData {
  madrasahId: string;
  madrasahName: string;
  nsm: string;
  workStartTime: string;
  lateThreshold: string;
  workEndTime: string;
  workDays: string;
  dailySchedules?: string | null;
  requireSelfie: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  holidays: HolidayItem[];
}

export function AttendanceSettingsView({ initialData }: { initialData: SettingsData }) {
  const [activeTab, setActiveTab] = useState<"hours" | "holidays" | "geofence">("hours");

  // Parse Initial Daily Schedules
  const parsedDailySchedules = useMemo<DaySchedule[]>(() => {
    if (initialData.dailySchedules) {
      try {
        const parsed = JSON.parse(initialData.dailySchedules);
        if (Array.isArray(parsed) && parsed.length === 7) {
          return parsed;
        }
      } catch (e) {
        console.error("Gagal parse dailySchedules:", e);
      }
    }
    return defaultSchedules;
  }, [initialData.dailySchedules]);

  // State: Daily Schedules (Senin - Minggu)
  const [dailySchedules, setDailySchedules] = useState<DaySchedule[]>(parsedDailySchedules);

  // Other Settings State
  const [requireSelfie, setRequireSelfie] = useState(initialData.requireSelfie ?? true);
  const [latitude, setLatitude] = useState(String(initialData.latitude || -6.2615));
  const [longitude, setLongitude] = useState(String(initialData.longitude || 106.8106));
  const [radiusMeters, setRadiusMeters] = useState(String(initialData.radiusMeters || 50));

  // Holidays State
  const [holidays, setHolidays] = useState<HolidayItem[]>(initialData.holidays || []);
  const [holidayMode, setHolidayMode] = useState<"single" | "range">("single");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayEndDate, setNewHolidayEndDate] = useState("");
  const [newHolidayDesc, setNewHolidayDesc] = useState("");
  const [newHolidayIsNational, setNewHolidayIsNational] = useState(false);

  // Kemenag Holiday Sync & Filter State
  const [syncYear, setSyncYear] = useState<number | "all">("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);

  // Calculate day difference for multi-day range
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // Handler to update a specific day's schedule
  const handleUpdateDay = (dayIndex: number, field: keyof DaySchedule, value: string | boolean) => {
    setDailySchedules((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        [field]: value,
      };
      return updated;
    });
  };

  // Quick Preset Presets
  const applyPreset = (presetType: "kemenag_standard" | "uniform" | "six_days") => {
    if (presetType === "kemenag_standard") {
      setDailySchedules(defaultSchedules);
    } else if (presetType === "uniform") {
      setDailySchedules(
        dailySchedules.map((d) => ({
          ...d,
          isActive: d.day <= 5,
          startTime: "07:00",
          lateThreshold: "07:15",
          endTime: "14:00",
          notes: d.day <= 5 ? "KBM Reguler" : "Libur Rutin",
        }))
      );
    } else if (presetType === "six_days") {
      setDailySchedules(
        dailySchedules.map((d) => ({
          ...d,
          isActive: d.day <= 6,
          startTime: d.day === 1 ? "06:45" : "07:00",
          lateThreshold: d.day === 1 ? "07:00" : "07:15",
          endTime: d.day === 5 ? "11:30" : d.day === 6 ? "12:30" : "14:00",
          notes: d.day === 1 ? "Upacara" : d.day === 5 ? "Jumat" : d.day === 6 ? "Ekstrakulikuler" : "KBM Reguler",
        }))
      );
    }
    swalSuccess("Preset Diterapkan!", "Format jadwal harian telah diperbarui.");
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    swalLoading("Menyimpan Pengaturan...", "Sedang memperbarui jam kerja tiap hari dan geofence di database...");

    const activeDaysList = dailySchedules.filter((d) => d.isActive).map((d) => d.day).join(",");
    const primaryDay = dailySchedules.find((d) => d.day === 2) || dailySchedules[0];

    const res = await saveAttendanceSettingsAction(initialData.madrasahId, {
      workStartTime: primaryDay.startTime,
      lateThreshold: primaryDay.lateThreshold,
      workEndTime: primaryDay.endTime,
      workDays: activeDaysList || "1,2,3,4,5",
      dailySchedules: JSON.stringify(dailySchedules),
      requireSelfie,
      latitude: parseFloat(latitude) || -6.2615,
      longitude: parseFloat(longitude) || 106.8106,
      radiusMeters: parseFloat(radiusMeters) || 50,
    });

    setIsSaving(false);
    swalClose();

    if (res?.error) {
      swalError("Gagal Menyimpan", res.error);
    } else {
      swalSuccess("Berhasil Disimpan!", "Pengaturan jam kerja per hari dan parameter geofence berhasil diperbarui.");
    }
  };

  // Add Holiday (Single or Multi-day Range)
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) {
      swalError("Form Belum Lengkap", "Silakan masukkan nama hari libur dan tanggal mulai.");
      return;
    }

    if (holidayMode === "range" && !newHolidayEndDate) {
      swalError("Form Belum Lengkap", "Silakan tentukan tanggal selesai untuk libur rentang waktu.");
      return;
    }

    if (holidayMode === "range" && newHolidayEndDate < newHolidayDate) {
      swalError("Tanggal Tidak Valid", "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setIsAddingHoliday(true);
    swalLoading("Menambahkan Hari Libur...", "Sedang mendaftarkan tanggal libur ke kalender akademik...");

    const res = await addHolidayAction(initialData.madrasahId, {
      name: newHolidayName,
      date: newHolidayDate,
      endDate: holidayMode === "range" ? newHolidayEndDate : null,
      isNational: newHolidayIsNational,
      description: newHolidayDesc,
    });
    setIsAddingHoliday(false);
    swalClose();

    if (res?.success && res.data) {
      setHolidays([...holidays, res.data as any]);
      setNewHolidayName("");
      setNewHolidayDate("");
      setNewHolidayEndDate("");
      setNewHolidayDesc("");
      setNewHolidayIsNational(false);
      setHolidayMode("single");
      swalSuccess(
        "Hari Libur Ditambahkan!", 
        holidayMode === "range" 
          ? `Rentang libur ${calculateDays(newHolidayDate, newHolidayEndDate)} hari berhasil didaftarkan ke kalender.`
          : "Guru ditiadakan dari kewajiban presensi pada tanggal tersebut."
      );
    } else {
      swalError("Gagal Menambahkan", res?.error || "Terjadi kesalahan saat menambahkan hari libur.");
    }
  };

  // Synchronize Kemenag & National Holidays
  const handleSyncKemenag = async () => {
    const periodLabel = syncYear === "all" ? "Tahun 2025 s/d 2027+" : `Tahun ${syncYear}`;
    const isConfirmed = await swalConfirm(
      "Sinkronkan Kalender Kemenag?",
      `Sistem akan mengimpor seluruh Hari Libur Nasional SKB 3 Menteri dan Kalender Pendidikan Kemenag untuk ${periodLabel}. Hari libur yang sudah ada tidak akan diduplikasi.`,
      "Ya, Sinkronkan Sekarang",
      "Batal"
    );

    if (!isConfirmed) return;

    setIsSyncing(true);
    swalLoading(
      "Sinkronisasi Kalender Kemenag...",
      "Mengunduh dan mencocokkan hari libur nasional, HAB Kemenag, Hari Santri, Hari Raya & Cuti Bersama..."
    );

    const res = await syncKemenagHolidaysAction(initialData.madrasahId, syncYear);
    setIsSyncing(false);
    swalClose();

    if (res?.success) {
      // Refresh local holidays list from database
      const refreshed = await fetchSettingsData(initialData.madrasahId);
      if (refreshed?.data?.holidays) {
        setHolidays(refreshed.data.holidays as any);
      }
      swalSuccess(
        "Sinkronisasi Berhasil!",
        res.message || `Berhasil menyinkronkan hari libur Kemenag untuk ${periodLabel}.`
      );
    } else {
      swalError("Gagal Sinkronisasi", res?.error || "Terjadi kesalahan saat sinkronisasi kalender.");
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string, name: string) => {
    const isConfirmed = await swalConfirm(
      "Hapus Hari Libur?",
      `Apakah Anda yakin ingin menghapus "${name}" dari kalender libur madrasah?`,
      "Ya, Hapus Libur",
      "Batal"
    );

    if (!isConfirmed) return;

    setDeletingHolidayId(id);
    swalLoading("Menghapus...", "Sedang menghapus hari libur dari database...");

    const res = await deleteHolidayAction(id);
    setDeletingHolidayId(null);
    swalClose();

    if (res?.success) {
      setHolidays(holidays.filter((h) => h.id !== id));
      swalSuccess("Dihapus!", "Hari libur telah dihapus dari kalender.");
    } else {
      swalError("Gagal Menghapus", res?.error || "Gagal menghapus hari libur.");
    }
  };

  // Filtered Holidays by Year
  const filteredHolidays = useMemo(() => {
    if (filterYear === "all") return holidays;
    return holidays.filter((h) => {
      const year = new Date(h.date).getFullYear().toString();
      return year === filterYear;
    });
  }, [holidays, filterYear]);

  // Counts for tabs
  const count2025 = useMemo(() => holidays.filter((h) => new Date(h.date).getFullYear() === 2025).length, [holidays]);
  const count2026 = useMemo(() => holidays.filter((h) => new Date(h.date).getFullYear() === 2026).length, [holidays]);
  const count2027 = useMemo(() => holidays.filter((h) => new Date(h.date).getFullYear() === 2027).length, [holidays]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-sm border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Pengaturan Kehadiran & Kalender Akademik
            </h1>
            <Badge variant="gold">Jadwal & Kalender Kemenag</Badge>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
            Konfigurasi jam masuk/pulang harian (Senin - Minggu), sinkronisasi kalender hari libur Kemenag & Nasional, serta radius geofence.
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
          <span>Jadwal Jam Masuk & Pulang Harian</span>
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
          <span>Kalender Hari Libur Kemenag ({holidays.length})</span>
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

      {/* TAB 1: Jadwal Jam Masuk & Pulang Harian (Senin - Minggu) */}
      {activeTab === "hours" && (
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-6">
            {/* Header with Quick Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Clock className="size-4.5 text-primary" />
                  <span>Pengaturan Jam Kerja Berbeda Tiap Hari</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atur jam masuk lebih pagi (misal upacara hari Senin) dan jam pulang lebih cepat (misal hari Jumat).
                </p>
              </div>

              {/* Quick Presets Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Preset Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset("kemenag_standard")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  ⚡ Standar MI (Jumat 11:30)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("six_days")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  ⚡ 6 Hari (Senin-Sabtu)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("uniform")}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  Seragam (07:00 - 14:00)
                </button>
              </div>
            </div>

            {/* Daily Schedules Table / Card List */}
            <div className="flex flex-col gap-3">
              {dailySchedules.map((schedule, idx) => {
                const isWork = schedule.isActive;

                return (
                  <div
                    key={schedule.day}
                    className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isWork
                        ? "bg-card border-border/80 shadow-sm"
                        : "bg-muted/30 border-border/40 opacity-75"
                    }`}
                  >
                    {/* Day Name & Toggle */}
                    <div className="flex items-center gap-3 w-48 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateDay(idx, "isActive", !isWork)}
                        className={`size-6 rounded-lg flex items-center justify-center border text-xs font-bold transition-all ${
                          isWork
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-transparent border-border"
                        }`}
                      >
                        ✓
                      </button>

                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                          {schedule.dayName}
                          {schedule.day === 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">
                              Upacara
                            </span>
                          )}
                          {schedule.day === 5 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">
                              Jumat
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {isWork ? "Hari Kerja Aktif" : "Libur Rutin Mingguan"}
                        </span>
                      </div>
                    </div>

                    {/* Time Inputs */}
                    {isWork ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                        {/* Jam Masuk */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
                            <Sun className="size-3 text-emerald-600" />
                            <span>Jam Masuk</span>
                          </label>
                          <Input
                            type="time"
                            required
                            value={schedule.startTime}
                            onChange={(e) => handleUpdateDay(idx, "startTime", e.target.value)}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>

                        {/* Toleransi Terlambat */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="size-3 text-amber-500" />
                            <span>Batas Terlambat</span>
                          </label>
                          <Input
                            type="time"
                            required
                            value={schedule.lateThreshold}
                            onChange={(e) => handleUpdateDay(idx, "lateThreshold", e.target.value)}
                            className="h-9 text-xs font-mono font-semibold border-amber-500/30"
                          />
                        </div>

                        {/* Jam Pulang */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
                            <Moon className="size-3 text-indigo-500" />
                            <span>Jam Pulang (Clock-Out)</span>
                          </label>
                          <Input
                            type="time"
                            required
                            value={schedule.endTime}
                            onChange={(e) => handleUpdateDay(idx, "endTime", e.target.value)}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground py-2 italic">
                        <Coffee className="size-4 text-muted-foreground" />
                        <span>Libur rutin mingguan. Guru tidak diwajibkan presensi dan tidak dihitung alpa.</span>
                      </div>
                    )}

                    {/* Catatan / Keterangan Hari */}
                    {isWork && (
                      <div className="w-full lg:w-44 shrink-0">
                        <Input
                          placeholder="Catatan (opsional)"
                          value={schedule.notes || ""}
                          onChange={(e) => handleUpdateDay(idx, "notes", e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
              Simpan Jadwal Harian & Pengaturan Jam
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: Kalender Hari Libur Kemenag & Nasional + Rentang Waktu */}
      {activeTab === "holidays" && (
        <div className="flex flex-col gap-6">
          {/* SYNC BANNER: Kemenag & National Holidays */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-700/60 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="size-11 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <Landmark className="size-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Sinkronisasi Kalender Kemenag & Libur Nasional
                  </h3>
                  <Badge variant="gold" className="text-[10px]">SKB 3 Menteri</Badge>
                </div>
                <p className="text-xs text-emerald-200/90 mt-0.5 max-w-2xl leading-relaxed">
                  Impor instan hari libur resmi nasional & kalender pendidikan Kemenag (Hari Santri Nasional, HAB Kemenag, Hari Raya Idul Fitri, Cuti Bersama, dll) tahun <strong>2025 s/d 2027+</strong> tanpa perlu input satu per satu.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={syncYear}
                onChange={(e) => setSyncYear(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-black/30 border border-emerald-700/50 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all" className="bg-emerald-950 text-white">Semua (2025 - 2027+)</option>
                <option value={2025} className="bg-emerald-950 text-white">Tahun 2025</option>
                <option value={2026} className="bg-emerald-950 text-white">Tahun 2026</option>
                <option value={2027} className="bg-emerald-950 text-white">Tahun 2027</option>
              </select>

              <Button
                type="button"
                variant="gold"
                size="default"
                isLoading={isSyncing}
                onClick={handleSyncKemenag}
                leftIcon={<DownloadCloud className="size-4" />}
                className="shadow-md"
              >
                Sinkronkan Kalender
              </Button>
            </div>
          </div>

          {/* FORM: Tambah Hari Libur (Single Date atau Rentang Waktu Libur Panjang) */}
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Plus className="size-4.5 text-primary" />
                  <span>Tambah Hari Libur / Cuti / Libur Panjang Madrasah</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mendukung input satu hari maupun rentang tanggal (libur semester, kenaikan kelas, cuti bersama).
                </p>
              </div>

              {/* Mode Toggle Pills: Satu Hari vs Rentang Waktu */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHolidayMode("single")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    holidayMode === "single"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📅 Satu Hari
                </button>
                <button
                  type="button"
                  onClick={() => setHolidayMode("range")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    holidayMode === "range"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🗓️ Rentang Waktu (Libur Panjang)
                </button>
              </div>
            </div>

            <form onSubmit={handleAddHoliday} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Inputs based on Mode */}
                {holidayMode === "single" ? (
                  <FormInput
                    label="Tanggal Libur"
                    type="date"
                    required
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                  />
                ) : (
                  <>
                    <FormInput
                      label="Tanggal Mulai Libur"
                      type="date"
                      required
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                    />

                    <FormInput
                      label="Tanggal Selesai Libur"
                      type="date"
                      required
                      value={newHolidayEndDate}
                      onChange={(e) => setNewHolidayEndDate(e.target.value)}
                    />
                  </>
                )}

                {/* Holiday Name */}
                <div className={holidayMode === "range" ? "md:col-span-1" : "md:col-span-2"}>
                  <FormInput
                    label="Nama Hari Libur / Acara"
                    placeholder={
                      holidayMode === "range"
                        ? "Contoh: Libur Kenaikan Kelas / Akhir Semester Ganjil"
                        : "Contoh: Hari Santri Nasional / HAB Kemenag"
                    }
                    required
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                  />
                </div>
              </div>

              {/* Multi-day info banner if range is active */}
              {holidayMode === "range" && newHolidayDate && newHolidayEndDate && (
                <div className="px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="size-4 shrink-0" />
                    <span>
                      Rentang Libur Terpilih: <strong>{newHolidayDate}</strong> s/d <strong>{newHolidayEndDate}</strong>
                    </span>
                  </div>
                  <Badge variant="gold">
                    Durasi: {calculateDays(newHolidayDate, newHolidayEndDate)} Hari Kalender
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2">
                  <FormInput
                    label="Keterangan / Kategori (Opsional)"
                    placeholder="Contoh: Kalender Pendidikan Semester Genap TP 2025/2026"
                    value={newHolidayDesc}
                    onChange={(e) => setNewHolidayDesc(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHolidayIsNational}
                      onChange={(e) => setNewHolidayIsNational(e.target.checked)}
                      className="size-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <span>Kategori Resmi / Nasional / Kemenag</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/50">
                <Button
                  type="submit"
                  variant="default"
                  isLoading={isAddingHoliday}
                  leftIcon={<Plus className="size-4" />}
                >
                  {holidayMode === "range" ? "Tambahkan Libur Rentang Waktu" : "Tambahkan ke Kalender Libur"}
                </Button>
              </div>
            </form>
          </div>

          {/* LIST: Kalender Hari Libur Terdaftar */}
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <CalendarDays className="size-4.5 text-primary" />
                  <span>Daftar Hari Libur Terdaftar ({filteredHolidays.length})</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftar tanggal di mana presensi harian otomatis ditiadakan bagi seluruh guru.
                </p>
              </div>

              {/* Year Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterYear("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterYear === "all"
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({holidays.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterYear("2025")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterYear === "2025"
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2025 ({count2025})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterYear("2026")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterYear === "2026"
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2026 ({count2026})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterYear("2027")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterYear === "2027"
                      ? "bg-card text-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2027 ({count2027})
                </button>
              </div>
            </div>

            {filteredHolidays.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Calendar className="size-6 text-muted-foreground/60" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    Belum Ada Hari Libur Terdaftar {filterYear !== "all" ? `pada Tahun ${filterYear}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Gunakan tombol <strong>Sinkronkan Kalender</strong> di atas untuk memuat kalender resmi Kemenag & Nasional secara instan.
                  </span>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredHolidays.map((h) => {
                  const startDateStr = new Date(h.date).toISOString().split("T")[0];
                  const endDateStr = h.endDate ? new Date(h.endDate).toISOString().split("T")[0] : null;

                  const startFormatted = new Date(h.date).toLocaleDateString("id-ID", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  const endFormatted = h.endDate
                    ? new Date(h.endDate).toLocaleDateString("id-ID", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null;

                  const durationDays = endDateStr ? calculateDays(startDateStr, endDateStr) : 1;

                  return (
                    <div
                      key={h.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            endDateStr
                              ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                              : h.isNational
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {endDateStr ? <CalendarRange className="size-5" /> : <Calendar className="size-5" />}
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {h.name}
                            </span>
                            {endDateStr && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/20">
                                Rentang {durationDays} Hari
                              </span>
                            )}
                            {h.isNational ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                                Kemenag / Nasional
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 font-semibold border border-slate-500/20">
                                Madrasah Internal
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                            <span>{startFormatted}</span>
                            {endFormatted && (
                              <>
                                <ChevronRight className="size-3 text-muted-foreground" />
                                <span>{endFormatted}</span>
                              </>
                            )}
                          </div>

                          {h.description && (
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {h.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          isLoading={deletingHolidayId === h.id}
                          onClick={() => handleDeleteHoliday(h.id, h.name)}
                          className="text-xs"
                          leftIcon={<Trash2 className="size-3.5" />}
                        >
                          Hapus
                        </Button>
                      </div>
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
