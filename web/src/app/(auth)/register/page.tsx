import { RegisterSchoolView } from "@/features/auth/components/register-school-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrasi Sekolah / Madrasah Baru | SIAP-PRESENSI",
  description: "Daftarkan sekolah atau madrasah Anda ke dalam sistem presensi digital geofencing terintegrasi.",
};

export default function RegisterPage() {
  return <RegisterSchoolView />;
}
