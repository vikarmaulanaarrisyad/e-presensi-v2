import React from "react";
import { PositionManagementView } from "@/features/positions/components/position-management-view";
import { fetchPositionsData } from "@/server/actions/position.actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master Jabatan & Kepala Madrasah | E-Presensi Kemenag",
  description: "Kelola data master jabatan, kepala madrasah, dan struktur organisasi pegawai madrasah.",
};

export default async function PositionsPage() {
  const res = await fetchPositionsData();
  const data = res?.data;
  const madrasah = data?.madrasah;
  const positions = (data?.positions || []) as any[];

  const initialData = {
    madrasahId: madrasah?.id || "",
    madrasahName: madrasah?.name || "Madrasah",
    nsm: madrasah?.nsm || "-",
    positions: positions.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      isHeadmaster: p.isHeadmaster,
      order: p.order,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      _count: p._count,
      users: p.users,
    })),
  };

  return <PositionManagementView initialData={initialData} />;
}
