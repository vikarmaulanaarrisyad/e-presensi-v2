import { type AttendanceReportData } from "@/server/actions/report.actions";

function formatIndoTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  return timeStr.replace(/:/g, ".");
}

export async function exportReportToExcel(
  data: AttendanceReportData,
  dateLanguage: "en" | "id" = "id"
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Prepare header rows
  const wsData: any[][] = [];

  // Title Box
  wsData.push(["LAPORAN RINCIAN HARIAN"]);
  wsData.push([
    `Nama Madrasah : ${data.madrasah.name}`,
    "",
    "",
    "",
    "",
    "",
    `Filter Jenis : ${data.period.filterJenis}`,
    "",
    "",
    "",
    "",
    `Tgl. Periode : ${data.period.startDate} s/d ${data.period.endDate}`,
  ]);
  wsData.push([]); // blank line

  // Employee details
  wsData.push([
    `${data.employee.idType || "NUPTK"} : ${data.employee.idNumber || data.employee.nuptk || "-"}`,
    "",
    `Nama Karyawan : ${data.employee.name}`,
    "",
    "",
    "",
    "",
    `Jabatan : ${data.employee.jabatan}`,
  ]);
  wsData.push([
    `${data.employee.secondaryIdType || "Peg ID"} : ${data.employee.secondaryIdNumber || "-"}`,
    "",
    `Departemen : ${data.employee.departemen}`,
    "",
    "",
    "",
    "",
    `Status : ${data.employee.status}`,
    "",
  ]);
  wsData.push([]); // blank line

  // Column Headers (18 columns matching the screenshot)
  const headers = [
    "Tanggal",
    "Nama Shift",
    "Jam Masuk",
    "Scan Masuk",
    "Terlambat (Menit)",
    "Jam Keluar",
    "Scan Keluar",
    "P. Cepat (Menit)",
    "Durasi",
    "Lembur Awal",
    "Lembur Akhir",
    "Lembur Akhir 2",
    "Shift Lembur",
    "Istirahat",
    "Istirahat Lebih",
    "Istirahat 2",
    "Istirahat Lebih 2",
    "Keterangan",
  ];
  wsData.push(headers);

  // Data Rows
  data.rows.forEach((row) => {
    const dateFormatted =
      dateLanguage === "id"
        ? `${row.dayNameId}, ${row.dayNumber.toString().padStart(2, "0")}/${data.period.month.toString().padStart(2, "0")}/${data.period.year}`
        : row.dateFormatted;

    wsData.push([
      dateFormatted,
      row.shiftName,
      formatIndoTime(row.jamMasuk),
      formatIndoTime(row.scanMasuk),
      row.terlambatMenit,
      formatIndoTime(row.jamKeluar),
      formatIndoTime(row.scanKeluar),
      row.pulangCepatMenit,
      formatIndoTime(row.durasi),
      formatIndoTime(row.lemburAwal),
      formatIndoTime(row.lemburAkhir),
      formatIndoTime(row.lemburAkhir2),
      formatIndoTime(row.shiftLembur),
      formatIndoTime(row.istirahat),
      formatIndoTime(row.istirahatLebih),
      formatIndoTime(row.istirahat2),
      formatIndoTime(row.istirahatLebih2),
      row.keterangan,
    ]);
  });

  // Summary Row
  wsData.push([
    "Total :",
    "",
    data.summary.totalPresent,
    "",
    "",
    "",
    "",
    "",
    formatIndoTime(data.summary.totalDurationFormatted),
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  wsData.push([]); // blank line

  // Footer Row
  wsData.push([
    `Halaman : 1 dari : 1`,
    "",
    "",
    "",
    "",
    `Tgl. Cetak : ${formatIndoTime(data.summary.printedAt)}`,
    "",
    "",
    "",
    `Oleh : ${data.summary.printedBy}`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Adjust column widths
  ws["!cols"] = [
    { wch: 24 }, // Tanggal
    { wch: 22 }, // Nama Shift
    { wch: 12 }, // Jam Masuk
    { wch: 12 }, // Scan Masuk
    { wch: 16 }, // Terlambat
    { wch: 12 }, // Jam Keluar
    { wch: 12 }, // Scan Keluar
    { wch: 16 }, // P. Cepat
    { wch: 12 }, // Durasi
    { wch: 12 }, // Lembur Awal
    { wch: 12 }, // Lembur Akhir
    { wch: 14 }, // Lembur Akhir 2
    { wch: 12 }, // Shift Lembur
    { wch: 10 }, // Istirahat
    { wch: 14 }, // Istirahat Lebih
    { wch: 10 }, // Istirahat 2
    { wch: 14 }, // Istirahat Lebih 2
    { wch: 20 }, // Keterangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Rincian Harian");

  const sanitizedName = data.employee.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Laporan_Rincian_Harian_${sanitizedName}_${data.period.month}_${data.period.year}.xlsx`;

  XLSX.writeFile(wb, filename);
}
