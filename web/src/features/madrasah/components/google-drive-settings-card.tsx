"use client";

import React, { useState, useTransition } from "react";
import {
  Cloud,
  CheckCircle2,
  ExternalLink,
  PowerOff,
  AlertCircle,
  FolderSync,
  ShieldCheck,
  RefreshCw,
  Folder,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  toggleGoogleDriveAction,
  disconnectGoogleDriveAction,
} from "@/server/actions/google-drive.actions";

interface GoogleDriveSettingsCardProps {
  madrasahId: string;
  initialData: {
    isSystemConfigured: boolean;
    isConnected: boolean;
    email: string | null;
    folderId: string | null;
    folderName: string | null;
    connectedAt: Date | null;
    isEnabled: boolean;
  };
}

export function GoogleDriveSettingsCard({
  madrasahId,
  initialData,
}: GoogleDriveSettingsCardProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextState = e.target.checked;
    startTransition(async () => {
      const res = await toggleGoogleDriveAction(madrasahId, nextState);
      if (res.success) {
        setData((prev) => ({ ...prev, isEnabled: res.enabled || false }));
        Swal.fire({
          icon: "success",
          title: res.enabled ? "Penyimpanan Google Drive Diaktifkan" : "Penyimpanan Google Drive Dinonaktifkan",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", res.error || "Gagal mengubah status Google Drive", "error");
      }
    });
  };

  const handleDisconnect = async () => {
    const result = await Swal.fire({
      title: "Putuskan Akun Google Drive?",
      text: "Foto presensi yang sudah tersimpan di Google Drive madrasah tidak akan terhapus, namun foto presensi baru tidak lagi dikirimkan ke akun ini.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Putuskan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (result.isConfirmed) {
      startTransition(async () => {
        const res = await disconnectGoogleDriveAction(madrasahId);
        if (res.success) {
          setData((prev) => ({
            ...prev,
            isConnected: false,
            email: null,
            folderId: null,
            folderName: null,
            isEnabled: false,
          }));
          Swal.fire("Koneksi Diputuskan", "Akun Google Drive berhasil diputuskan.", "success");
        } else {
          Swal.fire("Gagal", res.error || "Gagal memutuskan koneksi", "error");
        }
      });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-emerald-500 to-amber-500 text-white shadow-md">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Penyimpanan Google Drive Lembaga
              </h3>
              {data.isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Terhubung
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  Belum Terhubung
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Simpan seluruh arsip foto selfie presensi guru langsung ke akun Google Drive milik madrasah secara otomatis dan gratis.
            </p>
          </div>
        </div>
      </div>

      {/* Warning jika Google OAuth belum dikonfigurasi di server */}
      {!data.isSystemConfigured && (
        <div className="my-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm mb-0.5">Kredensial Google OAuth Belum Disetel di Server</span>
            Administrator server perlu menambahkan <code>GOOGLE_CLIENT_ID</code> dan <code>GOOGLE_CLIENT_SECRET</code> pada file <code>.env</code> aplikasi web untuk mengaktifkan fitur ini.
          </div>
        </div>
      )}

      {/* Body Content */}
      <div className="mt-5">
        {!data.isConnected ? (
          // ==========================================
          // STATE: BELUM TERHUBUNG
          // ==========================================
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
                <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Penyimpanan Milik Madrasah
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Foto langsung masuk ke akun Google madrasah, aman dan menjadi aset arsip resmi lembaga.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
                <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <FolderSync className="h-4 w-4 text-blue-600" />
                  Otomatis &amp; Rapi
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Folder khusus <code>E-Presensi</code> akan dibuatkan otomatis di Google Drive madrasah.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
                <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <Cloud className="h-4 w-4 text-amber-600" />
                  Gratis 15 GB
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Manfaatkan kuota gratis Gmail atau kapasitas besar Google Workspace madrasah.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`/api/auth/google-drive?madrasahId=${madrasahId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01]"
              >
                {/* Google Icon SVG */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Hubungkan Akun Google Madrasah (1-Klik)
              </a>
              <span className="text-[11px] text-gray-400 block mt-2">
                * Anda akan diarahkan ke halaman login Google untuk memilih akun Gmail/Workspace madrasah Anda.
              </span>
            </div>
          </div>
        ) : (
          // ==========================================
          // STATE: SUDAH TERHUBUNG
          // ==========================================
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                    Akun Google Terhubung:
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {data.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pt-1">
                    <Folder className="h-3.5 w-3.5 text-amber-500" />
                    Folder: <b>{data.folderName || "E-Presensi"}</b>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {data.folderId && (
                    <a
                      href={`https://drive.google.com/drive/folders/${data.folderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700 shadow-2xs transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Folder di Google Drive
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                  >
                    <PowerOff className="h-3.5 w-3.5" />
                    Putuskan
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle Switch Aktifkan Google Drive */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-white block cursor-pointer">
                  Aktifkan Penyimpanan Otomatis Foto Selfie
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Setiap kali guru presensi masuk atau pulang, foto selfie otomatis diunggah ke Google Drive madrasah ini.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={data.isEnabled}
                  onChange={handleToggle}
                  disabled={isPending}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
