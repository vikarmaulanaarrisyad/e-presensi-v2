import React from "react";
import { FingerprintManagementView } from "@/features/fingerprint/components/fingerprint-management-view";
import { fetchFingerprintData } from "@/server/actions/fingerprint.actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrasi Mesin Fingerprint Solution | E-Presensi",
  description: "Manajemen dan sinkronisasi mesin sidik jari Solution / ZKTeco dengan Cloud E-Presensi",
};

export default async function FingerprintAdminPage() {
  const res = await fetchFingerprintData();

  if (res.error || !res.data) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-6 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
          <h2 className="text-lg font-bold">Terjadi Kesalahan</h2>
          <p className="text-sm mt-1">{res.error || "Gagal memuat konfigurasi mesin fingerprint."}</p>
        </div>
      </div>
    );
  }

  return <FingerprintManagementView initialData={res.data as any} />;
}
