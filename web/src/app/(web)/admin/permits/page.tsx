import { Metadata } from "next";
import { AdminPermitsView } from "@/features/permits/components/admin-permits-view";
import { getAdminPermitsListAction } from "@/server/actions/permit.actions";

export const metadata: Metadata = {
  title: "Persetujuan Izin & Cuti Guru | E-Presensi",
  description: "Kelola dan verifikasi permohonan izin atau sakit guru madrasah",
};

export default async function AdminPermitsPage() {
  const initialData = await getAdminPermitsListAction();

  return <AdminPermitsView initialData={initialData.data} />;
}
