import type { jsPDF } from "jspdf";
import { type BapSptjmData } from "@/server/actions/report.actions";

export interface SptjmOptions {
  nomorSurat?: string;
  tanggalSurat?: string;
  kotaMadrasah?: string;
  namaKamad?: string;
  nipKamad?: string;
  pangkatKamad?: string;
}

export interface BapOptions {
  nomorBap?: string;
  tanggalBap?: string;
  kotaMadrasah?: string;
  namaKamad?: string;
  nipKamad?: string;
  namaOperator?: string;
  nipOperator?: string;
  namaPengawas?: string;
  nipPengawas?: string;
}

/**
 * Buat dokumen jsPDF F4 Landscape untuk BAP Kolektif
 */
async function createF4LandscapeDoc() {
  const { default: jsPDFClass } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDFClass({
    orientation: "landscape",
    unit: "mm",
    format: [215, 330],
  });
  return { doc, autoTable };
}

/**
 * Buat dokumen jsPDF F4 Portrait untuk SPTJM Resmi
 */
async function createF4PortraitDoc() {
  const { default: jsPDFClass } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: [330, 215],
  });
  return { doc, autoTable };
}

/**
 * 1. CETAK / EKSPOR PDF SPTJM RESMI (Portrait F4)
 */
export async function exportSptjmPdf(
  data: BapSptjmData,
  options: SptjmOptions = {}
): Promise<void> {
  const { doc } = await createF4PortraitDoc();
  drawSptjmPage(doc, data, options);

  const sanitizedMadrasah = data.madrasah.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `SPTJM_${data.period.monthName}_${data.period.year}_${sanitizedMadrasah}.pdf`;
  doc.save(filename);
}

/**
 * 2. CETAK / EKSPOR PDF BAP KOLEKTIF (Landscape F4)
 */
export async function exportBapPdf(
  data: BapSptjmData,
  options: BapOptions = {}
): Promise<void> {
  const { doc, autoTable } = await createF4LandscapeDoc();
  drawBapPage(doc, autoTable, data, options);

  const sanitizedMadrasah = data.madrasah.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `BAP_Presensi_${data.period.monthName}_${data.period.year}_${sanitizedMadrasah}.pdf`;
  doc.save(filename);
}

/**
 * 3. PAKET LENGKAP: SPTJM (Halaman 1) + BAP Kolektif (Halaman 2+)
 */
export async function exportBapSptjmPackagePdf(
  data: BapSptjmData,
  options: SptjmOptions & BapOptions = {}
): Promise<void> {
  const { default: jsPDFClass } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // Page 1: SPTJM Portrait
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: [330, 215],
  });

  drawSptjmPage(doc, data, options);

  // Page 2: BAP Landscape
  doc.addPage([215, 330], "landscape");
  drawBapPage(doc, autoTable, data, options);

  const sanitizedMadrasah = data.madrasah.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `PAKET_TPG_SPTJM_BAP_${data.period.monthName}_${data.period.year}_${sanitizedMadrasah}.pdf`;
  doc.save(filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER SPTJM (Portrait)
// ─────────────────────────────────────────────────────────────────────────────
function drawSptjmPage(doc: jsPDF, data: BapSptjmData, options: SptjmOptions) {
  const pW = 215; // mm width portrait
  const pH = 330; // mm height portrait
  const m = 18;  // margin 18mm
  const cW = pW - m * 2; // 179mm content width

  const setNormal = (size: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
  };
  const setBold = (size: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
  };

  // 1. Kop Madrasah
  let curY = m;
  setBold(11);
  doc.text("KEMENTERIAN AGAMA REPUBLIK INDONESIA", pW / 2, curY, { align: "center" });
  curY += 5;
  setBold(12);
  doc.text(data.madrasah.name.toUpperCase(), pW / 2, curY, { align: "center" });
  curY += 4.5;

  setNormal(8.5);
  const nsmNpsn = `NSM: ${data.madrasah.nsm || "-"}   |   NPSN: ${data.madrasah.npsn || "-"}`;
  doc.text(nsmNpsn, pW / 2, curY, { align: "center" });
  curY += 4;

  const addr = data.madrasah.address || "Alamat Madrasah Belum Diatur";
  const contact = [
    data.madrasah.phone ? `Telp: ${data.madrasah.phone}` : "",
    data.madrasah.email ? `Email: ${data.madrasah.email}` : "",
  ].filter(Boolean).join("   |   ");
  doc.text(addr, pW / 2, curY, { align: "center" });
  if (contact) {
    curY += 4;
    doc.text(contact, pW / 2, curY, { align: "center" });
  }

  // Double horizontal rule
  curY += 3;
  doc.setLineWidth(0.8);
  doc.line(m, curY, m + cW, curY);
  curY += 1;
  doc.setLineWidth(0.2);
  doc.line(m, curY, m + cW, curY);

  curY += 7;

  // 2. Judul Dokumen
  setBold(12);
  doc.text("SURAT PERTANGGUNGJAWABAN MUTLAK (SPTJM)", pW / 2, curY, { align: "center" });
  curY += 5;
  setBold(10);
  doc.text("KEHADIRAN GURU DAN TENAGA KEPENDIDIKAN", pW / 2, curY, { align: "center" });
  curY += 4.5;

  const nomorSurat =
    options.nomorSurat ||
    `B-0${data.period.month}/Ma.${data.madrasah.nsm.slice(-4) || "00"}/PP.00.0/${String(data.period.month).padStart(2, "0")}/${data.period.year}`;
  setNormal(9.5);
  doc.text(`Nomor: ${nomorSurat}`, pW / 2, curY, { align: "center" });

  curY += 8;

  // 3. Identitas Kepala Madrasah
  setNormal(9.5);
  doc.text("Yang bertanda tangan di bawah ini:", m, curY);
  curY += 5;

  const kamadName =
    options.namaKamad ||
    data.headmaster?.name ||
    "Kepala Madrasah";
  const kamadNip =
    options.nipKamad ||
    data.headmaster?.nip ||
    "-";
  const kamadPangkat =
    options.pangkatKamad ||
    data.headmaster?.pangkatGol ||
    "Penata Muda Tk. I / Guru Madya";
  const kamadJabatan =
    data.headmaster?.jabatan ||
    `Kepala ${data.madrasah.name}`;

  const fields = [
    { label: "Nama Lengkap", value: kamadName },
    { label: "NIP", value: kamadNip },
    { label: "Pangkat / Golongan", value: kamadPangkat },
    { label: "Jabatan", value: kamadJabatan },
    { label: "Unit Kerja / Madrasah", value: data.madrasah.name },
    { label: "Alamat Unit Kerja", value: data.madrasah.address || "-" },
  ];

  fields.forEach((f) => {
    setNormal(9);
    doc.text(f.label, m + 4, curY);
    doc.text(":", m + 44, curY);
    setBold(9);
    doc.text(f.value, m + 47, curY);
    curY += 5;
  });

  curY += 3;

  // 4. Isi Pernyataan
  setNormal(9.5);
  doc.text("Dengan ini menyatakan dengan sesungguhnya dan penuh tanggung jawab bahwa:", m, curY);
  curY += 6;

  const statements = [
    `1. Data kehadiran Guru dan Tenaga Kependidikan pada ${data.madrasah.name} periode bulan ${data.period.monthName} ${data.period.year} sebanyak ${data.summary.totalTeachers} orang sebagaimana tercantum dalam Berita Acara Pemeriksaan (BAP) Kehadiran terlampir adalah BENAR dan SAH berdasarkan rekaman presensi elektronik (fingerprint/mobile GPS).`,
    `2. Seluruh Pendidik yang diusulkan telah memenuhi beban kerja aktif dan batas minimal kehadiran kerja madrasah sesuai ketentuan juknis pencairan Tunjangan Profesi Guru (TPG) / Tunjangan Kinerja Kementerian Agama RI. Sebanyak ${data.summary.totalEligible} orang dinyatakan MEMENUHI SYARAT (MS) dengan rata-rata kehadiran madrasah sebesar ${data.summary.averageAttendance}%.`,
    `3. Seluruh bukti pendukung berupa dokumen rekapitulasi presensi digital, surat tugas perjalanan dinas resmi, dan surat keterangan sakit/izin tersimpan dengan rapi pada arsip madrasah dan siap diverifikasi sewaktu-waktu oleh Tim Pengawas / Kantor Kementerian Agama.`,
    `4. Apabila di kemudian hari terbukti bahwa pernyataan dan data kehadiran ini tidak benar atau dipalsukan yang berakibat menimbulkan kerugian keuangan negara, saya bersedia bertanggung jawab penuh secara administratif maupun hukum pidana, serta bersedia mengembalikan seluruh kerugian tersebut ke Kas Negara sesuai peraturan perundang-undangan.`,
  ];

  statements.forEach((stmt) => {
    setNormal(8.8);
    const splitText = doc.splitTextToSize(stmt, cW - 2);
    doc.text(splitText, m + 2, curY);
    curY += splitText.length * 4.2 + 2.5;
  });

  curY += 2;
  setNormal(8.8);
  const closing = "Demikian Surat Pertanggungjawaban Mutlak (SPTJM) ini saya buat dengan sadar dan sesungguhnya untuk dipergunakan sebagai prasyarat sah pencairan Tunjangan Profesi Guru (TPG) / Tunjangan Kinerja / Simpatika Kemenag.";
  const splitClosing = doc.splitTextToSize(closing, cW);
  doc.text(splitClosing, m, curY);
  curY += splitClosing.length * 4.2 + 8;

  // 5. Blok Tanda Tangan & Kotak Materai
  const kota = options.kotaMadrasah || "Wonosobo";
  const tanggal = options.tanggalSurat || `${data.period.endDateStr.split("/")[0]} ${data.period.monthName} ${data.period.year}`;

  const ttdX = m + cW - 75;
  setNormal(9);
  doc.text(`${kota}, ${tanggal}`, ttdX, curY);
  curY += 4.5;
  setBold(9);
  doc.text(`Kepala ${data.madrasah.name}`, ttdX, curY);
  curY += 6;

  // Kotak Materai 10000
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.rect(ttdX, curY, 28, 16);
  setNormal(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text("MATERAI", ttdX + 14, curY + 6, { align: "center" });
  doc.text("Rp 10.000", ttdX + 14, curY + 11, { align: "center" });
  doc.setTextColor(0, 0, 0);

  curY += 22;

  // Nama & NIP Kamad
  setBold(9.5);
  doc.text(kamadName, ttdX, curY);
  curY += 4;
  setNormal(8.5);
  doc.text(`NIP. ${kamadNip}`, ttdX, curY);
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER BAP KEHADIRAN KOLEKTIF (Landscape F4)
// ─────────────────────────────────────────────────────────────────────────────
function drawBapPage(
  doc: jsPDF,
  autoTable: (doc: jsPDF, options: any) => void,
  data: BapSptjmData,
  options: BapOptions
) {
  const pW = 330; // mm width landscape
  const pH = 215; // mm height landscape
  const m = 15;  // margin 15mm
  const cW = pW - m * 2; // 300mm content width

  const setNormal = (size: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
  };
  const setBold = (size: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
  };

  // 1. Kop BAP
  let curY = m;
  setBold(11);
  doc.text("KEMENTERIAN AGAMA REPUBLIK INDONESIA", pW / 2, curY, { align: "center" });
  curY += 4.5;
  setBold(12);
  doc.text(`BERITA ACARA PEMERIKSAAN KEHADIRAN GURU & PEGAWAI`, pW / 2, curY, { align: "center" });
  curY += 4.5;
  setBold(11);
  doc.text(`${data.madrasah.name.toUpperCase()} - BULAN ${data.period.monthName.toUpperCase()} ${data.period.year}`, pW / 2, curY, { align: "center" });
  curY += 4;

  const nomorBap =
    options.nomorBap ||
    `BA-0${data.period.month}/Ma.${data.madrasah.nsm.slice(-4) || "00"}/BAP/${String(data.period.month).padStart(2, "0")}/${data.period.year}`;
  setNormal(8);
  doc.text(`Nomor: ${nomorBap}   |   Hari Efektif Kerja: ${data.period.totalEffectiveDays} Hari   |   Periode: ${data.period.startDateStr} s/d ${data.period.endDateStr}`, pW / 2, curY, { align: "center" });

  curY += 2.5;
  doc.setLineWidth(0.4);
  doc.line(m, curY, m + cW, curY);
  curY += 4;

  // 2. Tabel Rekapitulasi Presensi Kolektif
  const head = [
    [
      { content: "NO", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "NAMA LENGKAP & GELAR", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
      { content: "NIP / NUPTK / PEG ID", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "JABATAN", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
      { content: "STATUS", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "HE", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "RINCIAN KEHADIRAN (HARI)", colSpan: 6, styles: { halign: "center" } },
      { content: "TOTAL HADIR", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "% HADIR", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "STATUS TPG", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    ],
    [
      { content: "H", styles: { halign: "center" } },
      { content: "DL", styles: { halign: "center" } },
      { content: "TL", styles: { halign: "center" } },
      { content: "I", styles: { halign: "center" } },
      { content: "S", styles: { halign: "center" } },
      { content: "A", styles: { halign: "center" } },
    ],
  ];

  const body = data.rows.map((row) => [
    String(row.no),
    row.name,
    row.nip !== "-" ? row.nip : row.nuptk !== "-" ? row.nuptk : row.pegId,
    row.jabatan,
    row.statusKepegawaian,
    String(row.workDays),
    String(row.hadir),
    String(row.dinasLuar),
    String(row.terlambat),
    String(row.izin),
    String(row.sakit),
    String(row.alpa),
    String(row.totalHadir),
    `${row.attendancePercentage}%`,
    row.isEligibleTpg ? "MEMENUHI SYARAT" : "TMS",
  ]);

  autoTable(doc, {
    startY: curY,
    head,
    body,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [20, 20, 20],
      lineColor: [140, 140, 140],
      lineWidth: 0.15,
      font: "helvetica",
    },
    headStyles: {
      fillColor: [21, 60, 48], // Dark Emerald Kemenag
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },   // No
      1: { cellWidth: 62, halign: "left" },     // Nama
      2: { cellWidth: 38, halign: "center", font: "courier" }, // NIP/NUPTK
      3: { cellWidth: 36, halign: "left" },     // Jabatan
      4: { cellWidth: 20, halign: "center" },   // Status
      5: { cellWidth: 10, halign: "center" },   // HE
      6: { cellWidth: 10, halign: "center" },   // H
      7: { cellWidth: 10, halign: "center" },   // DL
      8: { cellWidth: 10, halign: "center" },   // TL
      9: { cellWidth: 10, halign: "center" },   // I
      10: { cellWidth: 10, halign: "center" },  // S
      11: { cellWidth: 10, halign: "center" },  // A
      12: { cellWidth: 16, halign: "center", fontStyle: "bold" }, // Total
      13: { cellWidth: 16, halign: "center", fontStyle: "bold" }, // % Hadir
      14: { cellWidth: 24, halign: "center", fontStyle: "bold" }, // Status TPG
    },
    margin: { left: m, right: m },
    didDrawCell: (hookData: any) => {
      // Highlight TMS in red
      if (hookData.column.index === 14 && hookData.cell.raw === "TMS") {
        doc.setTextColor(190, 20, 20);
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || curY + 60;

  // 3. Ringkasan & Tanda Tangan Tripartit
  let signY = finalY + 4;
  if (signY > pH - 45) {
    doc.addPage([215, 330], "landscape");
    signY = m + 5;
  }

  // Summary box on left
  setBold(7.5);
  doc.text("KETERANGAN REKAPITULASI:", m, signY);
  setNormal(7);
  doc.text(`- H = Hadir Tepat Waktu | DL = Dinas Luar Resmi | TL = Terlambat | I = Izin | S = Sakit | A = Alpa`, m, signY + 3.5);
  doc.text(`- Total Guru/Pegawai: ${data.summary.totalTeachers} orang   |   Memenuhi Syarat (MS): ${data.summary.totalEligible} orang   |   Tidak Memenuhi (TMS): ${data.summary.totalIneligible} orang`, m, signY + 7);
  doc.text(`- Rata-rata Kedisiplinan Kehadiran Madrasah: ${data.summary.averageAttendance}%`, m, signY + 10.5);

  const ttdTopY = signY + 14;
  const col1X = m + 15;
  const col2X = pW / 2;
  const col3X = pW - m - 65;

  const kota = options.kotaMadrasah || "Wonosobo";
  const tanggal = options.tanggalBap || `${data.period.endDateStr.split("/")[0]} ${data.period.monthName} ${data.period.year}`;

  const kamadName = options.namaKamad || data.headmaster?.name || "Kepala Madrasah";
  const kamadNip = options.nipKamad || data.headmaster?.nip || "-";

  const opName = options.namaOperator || data.operator?.name || "Operator Madrasah";
  const opNip = options.nipOperator || data.operator?.nip || "-";

  // Operator
  setNormal(7.5);
  doc.text("Pembuat Berita Acara / Operator,", col1X, ttdTopY);
  doc.text("Petugas Presensi Simpatika", col1X, ttdTopY + 3.5);

  setBold(8);
  doc.text(opName, col1X, ttdTopY + 22);
  setNormal(7);
  doc.text(`NIP. ${opNip}`, col1X, ttdTopY + 25.5);

  // Pengawas (opsional jika diisi)
  if (options.namaPengawas) {
    setNormal(7.5);
    doc.text("Mengetahui,", col2X, ttdTopY, { align: "center" });
    doc.text("Pengawas Madrasah Pembina", col2X, ttdTopY + 3.5, { align: "center" });

    setBold(8);
    doc.text(options.namaPengawas, col2X, ttdTopY + 22, { align: "center" });
    setNormal(7);
    doc.text(`NIP. ${options.nipPengawas || "-"}`, col2X, ttdTopY + 25.5, { align: "center" });
  }

  // Kepala Madrasah
  setNormal(7.5);
  doc.text(`${kota}, ${tanggal}`, col3X, ttdTopY);
  doc.text(`Kepala ${data.madrasah.name}`, col3X, ttdTopY + 3.5);

  setBold(8);
  doc.text(kamadName, col3X, ttdTopY + 22);
  setNormal(7);
  doc.text(`NIP. ${kamadNip}`, col3X, ttdTopY + 25.5);
}
