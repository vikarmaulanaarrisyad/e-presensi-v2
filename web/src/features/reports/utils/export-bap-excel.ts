import { type BapSptjmData } from "@/server/actions/report.actions";

export async function exportBapToExcel(data: BapSptjmData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const wsData: any[][] = [];

  // 1. Header Instansi
  wsData.push(["KEMENTERIAN AGAMA REPUBLIK INDONESIA"]);
  wsData.push([`BERITA ACARA PEMERIKSAAN KEHADIRAN GURU & TENAGA KEPENDIDIKAN`]);
  wsData.push([`${data.madrasah.name.toUpperCase()} - BULAN ${data.period.monthName.toUpperCase()} ${data.period.year}`]);
  wsData.push([`NSM: ${data.madrasah.nsm || "-"} | NPSN: ${data.madrasah.npsn || "-"} | Alamat: ${data.madrasah.address || "-"}`]);
  wsData.push([`Hari Efektif Kerja: ${data.period.totalEffectiveDays} Hari | Periode: ${data.period.startDateStr} s/d ${data.period.endDateStr}`]);
  wsData.push([]); // blank

  // 2. Table Header
  wsData.push([
    "NO",
    "NAMA LENGKAP & GELAR",
    "NIP",
    "NUPTK",
    "PEG ID",
    "JABATAN",
    "STATUS KEPEGAWAIAN",
    "HARI EFEKTIF (HE)",
    "HADIR (H)",
    "DINAS LUAR (DL)",
    "TERLAMBAT (TL)",
    "IZIN (I)",
    "SAKIT (S)",
    "ALPA (A)",
    "TOTAL KEHADIRAN",
    "PERSENTASE KEHADIRAN (%)",
    "STATUS KELAYAKAN TPG",
  ]);

  // 3. Table Rows
  data.rows.forEach((r) => {
    wsData.push([
      r.no,
      r.name,
      r.nip,
      r.nuptk,
      r.pegId,
      r.jabatan,
      r.statusKepegawaian,
      r.workDays,
      r.hadir,
      r.dinasLuar,
      r.terlambat,
      r.izin,
      r.sakit,
      r.alpa,
      r.totalHadir,
      `${r.attendancePercentage}%`,
      r.isEligibleTpg ? "MEMENUHI SYARAT" : "TIDAK MEMENUHI SYARAT",
    ]);
  });

  // 4. Summary & Statistics
  wsData.push([]);
  wsData.push(["RINGKASAN KEHADIRAN BULANAN:"]);
  wsData.push([`Total Guru Terdata`, data.summary.totalTeachers]);
  wsData.push([`Memenuhi Syarat TPG (Kehadiran >= 85% & Tanpa Alpa)`, data.summary.totalEligible]);
  wsData.push([`Tidak Memenuhi Syarat (TMS)`, data.summary.totalIneligible]);
  wsData.push([`Rata-rata Kehadiran Madrasah`, `${data.summary.averageAttendance}%`]);

  // 5. Signature metadata
  wsData.push([]);
  wsData.push([
    "",
    "Pembuat Berita Acara / Operator:",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `Kepala ${data.madrasah.name}:`,
  ]);
  wsData.push([]);
  wsData.push([]);
  wsData.push([
    "",
    data.operator?.name || "Operator Madrasah",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    data.headmaster?.name || "Kepala Madrasah",
  ]);
  wsData.push([
    "",
    `NIP. ${data.operator?.nip || "-"}`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `NIP. ${data.headmaster?.nip || "-"}`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column Widths
  ws["!cols"] = [
    { wch: 5 },  // No
    { wch: 32 }, // Nama
    { wch: 22 }, // NIP
    { wch: 18 }, // NUPTK
    { wch: 14 }, // PegID
    { wch: 20 }, // Jabatan
    { wch: 16 }, // Status
    { wch: 10 }, // HE
    { wch: 8 },  // H
    { wch: 8 },  // DL
    { wch: 8 },  // TL
    { wch: 8 },  // I
    { wch: 8 },  // S
    { wch: 8 },  // A
    { wch: 14 }, // Total
    { wch: 16 }, // % Hadir
    { wch: 24 }, // Status TPG
  ];

  XLSX.utils.book_append_sheet(wb, ws, "BAP_Presensi_Kemenag");

  const sanitizedMadrasah = data.madrasah.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `BAP_Presensi_${data.period.monthName}_${data.period.year}_${sanitizedMadrasah}.xlsx`;
  XLSX.writeFile(wb, filename);
}
