import React from "react";
import { AdminJournalView } from "@/features/journals/components/admin-journal-view";
import { fetchJournalsInitialData } from "@/server/actions/teaching-journal.actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Jurnal Pembelajaran KBM Guru | E-Presensi GTK",
  description: "Monitoring jurnal mengajar harian, materi pembelajaran, dan aktivitas guru madrasah.",
};

export default async function AdminJournalsPage() {
  const res = await fetchJournalsInitialData();
  const data = res?.data;

  const initialData = {
    madrasah: data?.madrasah || {
      id: "default",
      name: "Madrasah",
      nsm: "-",
      address: "-",
    },
    teachers: data?.teachers || [],
  };

  return <AdminJournalView initialData={initialData} />;
}
