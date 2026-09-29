import React from "react";
import { AttendanceReportView } from "@/features/reports/components/attendance-report-view";
import { fetchReportInitialData } from "@/server/actions/report.actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const res = await fetchReportInitialData();

  const initialData = {
    madrasah: res?.data?.madrasah || {
      id: "default",
      name: "Madrasah",
      nsm: "-",
      address: "-",
    },
    teachers: res?.data?.teachers || [],
  };

  return <AttendanceReportView initialData={initialData} />;
}
