"use client";

import React, { useState, useTransition } from "react";
import {
  Fingerprint,
  Key,
  Copy,
  Check,
  RefreshCw,
  Server,
  Wifi,
  HardDrive,
  Users,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Info,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  regenerateApiKeyAction,
  saveFingerprintNetworkAction,
  saveTeacherPinAction,
  autoAssignPinsAction,
  uploadManualUsbLogAction,
} from "@/server/actions/fingerprint.actions";

interface TeacherMapping {
  id: string;
  name: string;
  nip: string | null;
  nik: string | null;
  fingerprintPin: string | null;
  avatarUrl: string | null;
  position: { name: string } | null;
}

interface SyncLogItem {
  id: string;
  syncedAt: Date;
  totalRecords: number;
  insertedCount: number;
  updatedCount: number;
  ignoredCount: number;
  status: string;
  message: string | null;
  source: string;
}

interface FingerprintConfig {
  id: string;
  name: string;
  nsm: string;
  fingerprintApiKey: string | null;
  fingerprintIp: string | null;
  fingerprintPort: number | null;
  fingerprintLastSync: Date | null;
}

interface FingerprintManagementViewProps {
  initialData: {
    config: FingerprintConfig;
    teachers: TeacherMapping[];
    syncLogs: SyncLogItem[];
  };
}

export function FingerprintManagementView({ initialData }: FingerprintManagementViewProps) {
  const [activeTab, setActiveTab] = useState<"connection" | "mapping" | "usb" | "logs">("connection");
  const [config, setConfig] = useState(initialData.config);
  const [teachers, setTeachers] = useState(initialData.teachers);
  const [syncLogs, setSyncLogs] = useState(initialData.syncLogs);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Network form state
  const [ip, setIp] = useState(config.fingerprintIp || "192.168.1.201");
  const [port, setPort] = useState(config.fingerprintPort || 4370);

  // Search & Teacher Pin edits
  const [searchQuery, setSearchQuery] = useState("");
  const [pinEdits, setPinEdits] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // USB Upload state
  const [usbFile, setUsbFile] = useState<File | null>(null);
  const [usbLoading, setUsbLoading] = useState(false);

  // Origin for sync URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://domain-presensi.com";
  const syncApiUrl = `${origin}/api/fingerprint/sync`;

  const copyToClipboard = (text: string, type: "key" | "url") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleRegenerateKey = async () => {
    const result = await Swal.fire({
      title: "Generate Ulang API Key?",
      text: "Bridge Agent yang saat ini terpasang harus diperbarui dengan API Key baru ini agar tetap bisa menyinkronkan data.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Generate Baru",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        const res = await regenerateApiKeyAction(config.id);
        if (res.success && res.data) {
          setConfig((prev) => ({
            ...prev,
            fingerprintApiKey: (res.data as any)?.fingerprintApiKey || prev.fingerprintApiKey,
          }));
          Swal.fire({
            icon: "success",
            title: "API Key Baru Berhasil Dibuat",
            text: "Salin API Key baru ini ke file .env pada Bridge Agent di komputer sekolah.",
            timer: 3000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire("Gagal", res.error || "Gagal membuat API Key baru", "error");
        }
      });
    }
  };

  const handleSaveNetworkConfig = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveFingerprintNetworkAction(config.id, ip, Number(port));
      if (res.success) {
        setConfig((prev) => ({
          ...prev,
          fingerprintIp: ip,
          fingerprintPort: Number(port),
        }));
        Swal.fire({
          icon: "success",
          title: "Pengaturan Jaringan Disimpan",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", res.error || "Gagal menyimpan konfigurasi", "error");
      }
    });
  };

  const handleSavePin = (teacherId: string) => {
    const newPin = pinEdits[teacherId] !== undefined ? pinEdits[teacherId] : "";
    startTransition(async () => {
      const res = await saveTeacherPinAction(config.id, teacherId, newPin);
      if (res.success) {
        setTeachers((prev) =>
          prev.map((t) => (t.id === teacherId ? { ...t, fingerprintPin: newPin || null } : t))
        );
        Swal.fire({
          icon: "success",
          title: "PIN Disimpan",
          toast: true,
          position: "top-end",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", res.error || "Gagal menyimpan PIN", "error");
      }
    });
  };

  const handleAutoAssignPins = async () => {
    const result = await Swal.fire({
      title: "Buat PIN Otomatis?",
      text: "Sistem akan mengisi nomor urut PIN (1, 2, 3...) untuk semua guru yang belum memiliki PIN mesin.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Buatkan PIN",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        const res = await autoAssignPinsAction(config.id);
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "Selesai",
            text: `Berhasil membuatkan PIN otomatis untuk ${res.count} guru. Halaman akan dimuat ulang.`,
          }).then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire("Gagal", res.error || "Gagal auto-assign PIN", "error");
        }
      });
    }
  };

  const handleProcessUsbFile = async () => {
    if (!usbFile) {
      Swal.fire("Pilih File", "Silakan pilih file log dari flashdisk terlebih dahulu.", "info");
      return;
    }

    setUsbLoading(true);
    try {
      const text = await usbFile.text();
      const res = await uploadManualUsbLogAction(config.id, text);

      if (res.success && res.data) {
        Swal.fire({
          icon: "success",
          title: "Import USB Selesai",
          html: `<div class="text-left text-sm space-y-1">
            <p>• <b>Total Data:</b> ${res.data.totalRecords}</p>
            <p>• <b>Log Baru:</b> ${res.data.insertedCount}</p>
            <p>• <b>Diperbarui:</b> ${res.data.updatedCount}</p>
            <p>• <b>Dilewati:</b> ${res.data.ignoredCount}</p>
          </div>`,
        }).then(() => {
          window.location.reload();
        });
      } else {
        Swal.fire("Gagal Import", res.error || "Format file tidak sesuai", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal membaca file", "error");
    } finally {
      setUsbLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.nip && t.nip.includes(q)) ||
      (t.fingerprintPin && t.fingerprintPin.includes(q))
    );
  });

  const totalTeachers = teachers.length;
  const mappedCount = teachers.filter((t) => t.fingerprintPin && t.fingerprintPin.trim().length > 0).length;
  const unmappedCount = totalTeachers - mappedCount;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-md">
                <Fingerprint className="h-7 w-7 text-emerald-200" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Integrasi Mesin Fingerprint Solution</h1>
                <p className="text-sm text-emerald-100">
                  Sinkronisasi otomatis mesin absensi sidik jari Solution / ZKTeco dengan sistem Cloud E-Presensi
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/15">
              <div className="text-xs text-emerald-200 font-medium">Status Koneksi</div>
              <div className="flex items-center gap-2 mt-0.5 font-semibold text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.fingerprintLastSync ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {config.fingerprintLastSync ? "Aktif & Terhubung" : "Belum Ada Data Masuk"}
              </div>
            </div>

            {config.fingerprintLastSync && (
              <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/15">
                <div className="text-xs text-emerald-200 font-medium">Sinkronisasi Terakhir</div>
                <div className="text-xs font-bold mt-0.5">
                  {new Date(config.fingerprintLastSync).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} WIB
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab("connection")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "connection"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300"
          }`}
        >
          <Server className="h-4 w-4" />
          Koneksi & API Key
        </button>

        <button
          onClick={() => setActiveTab("mapping")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "mapping"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300"
          }`}
        >
          <Users className="h-4 w-4" />
          Pemetaan PIN Guru
          <span className="ml-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold">
            {mappedCount}/{totalTeachers}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("usb")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "usb"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300"
          }`}
        >
          <HardDrive className="h-4 w-4" />
          Import USB Flashdisk
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300"
          }`}
        >
          <Clock className="h-4 w-4" />
          Riwayat Sinkronisasi
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KONEKSI & API KEY                                                 */}
      {/* ========================================================================= */}
      {activeTab === "connection" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Kredensial API & URL */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card API Key */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/40 p-2.5 text-emerald-600 dark:text-emerald-400">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">API Key Rahasia Madrasah</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gunakan API Key ini di file konfigurasi Bridge Agent di komputer sekolah
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                  Generate Ulang
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    API KEY SINKRONISASI
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? "text" : "password"}
                        readOnly
                        value={config.fingerprintApiKey || ""}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-2.5 text-sm font-mono text-gray-800 dark:text-gray-200 tracking-wider focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        {showKey ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(config.fingerprintApiKey || "", "key")}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
                    >
                      {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedKey ? "Tersalin!" : "Salin Key"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    ENDPOINT WEBHOOK / PUSH URL (CLOUD)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={syncApiUrl}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-4 py-2.5 text-sm font-mono text-gray-700 dark:text-gray-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(syncApiUrl, "url")}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      {copiedUrl ? "Tersalin!" : "Salin URL"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Pengaturan Mesin Lokal */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="rounded-xl bg-teal-100 dark:bg-teal-900/40 p-2.5 text-teal-600 dark:text-teal-400">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Alamat IP Mesin Fingerprint (LAN)</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Konfigurasi IP lokal mesin Solution yang terpasang di jaringan madrasah
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveNetworkConfig} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      IP Address Mesin (Statis)
                    </label>
                    <input
                      type="text"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="192.168.1.201"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      required
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Lihat di Mesin Solution: Menu &rarr; Comm &rarr; Ethernet / Jaringan
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Port Komunikasi (Default: 4370)
                    </label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      placeholder="4370"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      required
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Port default protokol ZKTeco / Solution adalah 4370
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
                  >
                    <Check className="h-4 w-4" />
                    Simpan Konfigurasi Mesin
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Kolom Kanan: Panduan Cepat Setup Bridge Agent */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-6">
              <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold mb-3">
                <Info className="h-5 w-5" />
                Cara Pasang Bridge Agent
              </div>

              <div className="space-y-3.5 text-xs text-emerald-950 dark:text-emerald-200">
                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <b>Buka Folder Bridge Agent</b> di komputer madrasah (PC TU/Operator) yang terhubung ke WiFi/LAN yang sama dengan mesin fingerprint.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    Salin <b>API Key</b> di atas ke file <code>.env</code> pada Bridge Agent.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                    3
                  </span>
                  <div>
                    Klik ganda file <b><code>start.bat</code></b>. Agent akan otomatis menarik log presensi dari mesin Solution dan mem-push ke Cloud E-Presensi!
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-emerald-200 dark:border-emerald-900/50">
                <div className="rounded-xl bg-white dark:bg-gray-900 p-3 border border-emerald-100 dark:border-emerald-950 font-mono text-[11px] text-gray-700 dark:text-gray-300 space-y-1">
                  <div className="text-gray-400"># Jalankan di terminal:</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">cd solution-bridge-agent</div>
                  <div>start.bat</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Tipe Mesin yang Didukung
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-disc pl-4">
                <li>Solution X100-C, X105-ID, X302, X601, X900</li>
                <li>Solution P207, P208, A100, V800</li>
                <li>Semua mesin ZKTeco / OEM ZK Standalone Port 4370</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PEMETAAN PIN GURU                                                 */}
      {/* ========================================================================= */}
      {activeTab === "mapping" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Pemetaan Nomor PIN Guru (Enroll Number)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nomor PIN ini harus sama persis dengan nomor <b>User ID</b> yang didaftarkan pada mesin fingerprint Solution untuk masing-masing guru.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutoAssignPins}
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Auto-Assign PIN (1, 2, 3...)
                </button>
              </div>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Guru Aktif</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalTeachers}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/40">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Sudah Memiliki PIN</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{mappedCount}</div>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-100 dark:border-amber-900/40">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Belum Diisi PIN</div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{unmappedCount}</div>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative my-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama guru, NIP, atau nomor PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Tabel Guru */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Nama Guru</th>
                    <th className="px-4 py-3">NIP / NIK</th>
                    <th className="px-4 py-3">Jabatan</th>
                    <th className="px-4 py-3 text-center w-48">PIN Mesin Fingerprint</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTeachers.map((teacher) => {
                    const currentPinVal =
                      pinEdits[teacher.id] !== undefined
                        ? pinEdits[teacher.id]
                        : teacher.fingerprintPin || "";

                    const isChanged =
                      pinEdits[teacher.id] !== undefined &&
                      pinEdits[teacher.id] !== (teacher.fingerprintPin || "");

                    return (
                      <tr
                        key={teacher.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {teacher.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {teacher.nip || teacher.nik || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-400">
                            {teacher.position?.name || "Guru"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="text"
                            placeholder="PIN (misal: 1)"
                            value={currentPinVal}
                            onChange={(e) =>
                              setPinEdits({
                                ...pinEdits,
                                [teacher.id]: e.target.value,
                              })
                            }
                            className={`w-32 rounded-lg border px-3 py-1.5 text-center text-sm font-bold font-mono focus:outline-none ${
                              currentPinVal
                                ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSavePin(teacher.id)}
                            disabled={isPending}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              isChanged
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm animate-pulse"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                          >
                            Simpan PIN
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Tidak ada guru yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IMPORT USB FLASHDISK                                              */}
      {/* ========================================================================= */}
      {activeTab === "usb" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/40 p-2.5 text-emerald-600 dark:text-emerald-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Import File Presensi dari Flashdisk (USB)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Gunakan fitur ini jika sekolah offline / tidak ada koneksi internet saat scan sidik jari
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Format File yang Didukung:
                </div>
                <p>
                  File export dari mesin Solution tipe standar (berekstensi <code>.dat</code>, <code>.txt</code>, atau <code>.csv</code>) yang berisi kolom nomor PIN dan Timestamp kehadiran.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Pilih File Log dari Flashdisk
                </label>
                <input
                  type="file"
                  accept=".dat,.txt,.csv"
                  onChange={(e) => setUsbFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer cursor-pointer border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              {usbFile && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 flex items-center justify-between text-xs font-mono">
                  <span>Nama File: <b>{usbFile.name}</b></span>
                  <span>Ukuran: {(usbFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleProcessUsbFile}
                disabled={usbLoading || !usbFile}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-semibold text-white shadow-md transition-all disabled:opacity-50"
              >
                {usbLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sedang Memproses Data...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Proses dan Masukkan ke Data Presensi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RIWAYAT SINKRONISASI                                              */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
              Catatan Riwayat Sinkronisasi Mesin
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Daftar proses sinkronisasi log yang diterima dari Bridge Agent atau Import USB
            </p>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Waktu Sinkronisasi</th>
                    <th className="px-4 py-3">Sumber</th>
                    <th className="px-4 py-3 text-center">Total Scan</th>
                    <th className="px-4 py-3 text-center">Data Baru</th>
                    <th className="px-4 py-3 text-center">Diperbarui</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                        {new Date(log.syncedAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-medium text-gray-700 dark:text-gray-300">
                          {log.source === "AGENT" ? "Bridge Agent" : log.source === "MANUAL_USB" ? "Import USB" : "ADMS"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                        {log.totalRecords}
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-semibold">
                        +{log.insertedCount}
                      </td>
                      <td className="px-4 py-3 text-center text-teal-600 font-semibold">
                        {log.updatedCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={log.message || ""}>
                        {log.message || "-"}
                      </td>
                    </tr>
                  ))}

                  {syncLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Belum ada riwayat sinkronisasi mesin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
