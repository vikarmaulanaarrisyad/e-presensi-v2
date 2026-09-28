import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type AttendanceReportData } from "@/server/actions/report.actions";

export function exportReportToPdf(
  data: AttendanceReportData,
  filename: string,
  dateLanguage: "en" | "id" = "en"
) {
  // F4 / Folio Landscape: 330 mm width x 215 mm height
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [215, 330],
  });

  const pageWidth = 330;
  const pageHeight = 215;
  const margin = 15; // 1.5 cm margin
  const contentWidth = pageWidth - margin * 2; // 300 mm

  // ==========================================
  // 1. Header Box (Bordered Rectangle)
  // ==========================================
  const headerBoxY = margin;
  const headerBoxHeight = 11;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, headerBoxY, contentWidth, headerBoxHeight);

  // Centered Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("LAPORAN RINCIAN HARIAN", pageWidth / 2, headerBoxY + 4, { align: "center" });

  // Divider line under title
  doc.setLineWidth(0.2);
  doc.line(margin, headerBoxY + 5.5, margin + contentWidth, headerBoxY + 5.5);

  // Sub-info inside header box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Nama Perusahaan : ${data.madrasah.name}`, margin + 2, headerBoxY + 9);
  doc.text(`Filter Jenis : ${data.period.filterJenis}`, margin + contentWidth * 0.42, headerBoxY + 9);
  doc.text(
    `Tgl. Periode : ${data.period.startDate} s/d ${data.period.endDate}`,
    margin + contentWidth - 2,
    headerBoxY + 9,
    { align: "right" }
  );

  // ==========================================
  // 2. Employee Details Sub-header
  // ==========================================
  const empY = headerBoxY + headerBoxHeight + 1.5;
  doc.line(margin, empY, margin + contentWidth, empY);

  doc.setFontSize(7);
  // Row 1
  doc.text(`PIN : ${data.employee.pin}`, margin + 2, empY + 3.2);
  doc.text(`Nama Karyawan : ${data.employee.name}`, margin + 45, empY + 3.2);
  doc.text(`Jabatan : ${data.employee.jabatan}`, margin + 180, empY + 3.2);

  // Row 2
  doc.text(`NIK : ${data.employee.nik}`, margin + 2, empY + 6.5);
  doc.text(`Departemen : ${data.employee.departemen}`, margin + 45, empY + 6.5);
  doc.text(`Status : ${data.employee.status}`, margin + 180, empY + 6.5);

  doc.line(margin, empY + 8, margin + contentWidth, empY + 8);

  // ==========================================
  // 3. 18-Column Main Table
  // ==========================================
  const tableHeaders = [
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

  const tableBody = data.rows.map((row) => {
    const dateFormatted =
      dateLanguage === "id"
        ? `${row.dayNameId}, ${row.dayNumber.toString().padStart(2, "0")}/${data.period.month.toString().padStart(2, "0")}/${data.period.year}`
        : row.dateFormatted;

    return [
      dateFormatted,
      row.shiftName,
      row.jamMasuk,
      row.scanMasuk,
      row.terlambatMenit,
      row.jamKeluar,
      row.scanKeluar,
      row.pulangCepatMenit,
      row.durasi,
      row.lemburAwal,
      row.lemburAkhir,
      row.lemburAkhir2,
      row.shiftLembur,
      row.istirahat,
      row.istirahatLebih,
      row.istirahat2,
      row.istirahatLebih2,
      row.keterangan,
    ];
  });

  // Total summary footer row
  const tableFoot: any[][] = [
    [
      { content: "Total :", colSpan: 2, styles: { fontStyle: "bold", halign: "left" } },
      { content: data.summary.totalPresent.toString(), styles: { fontStyle: "bold", halign: "center" } },
      "",
      "",
      "",
      "",
      "",
      { content: data.summary.totalDurationFormatted, styles: { fontStyle: "bold", halign: "center" } },
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];

  autoTable(doc, {
    startY: empY + 9,
    head: [tableHeaders],
    body: tableBody,
    foot: tableFoot,
    margin: { left: margin, right: margin },
    theme: "plain",
    tableWidth: contentWidth,
    styles: {
      font: "helvetica",
      fontSize: 5.6,
      cellPadding: 0.7,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      overflow: "hidden",
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [245, 245, 245],
      halign: "center",
      valign: "middle",
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "left" }, // Tanggal
      1: { cellWidth: 28, halign: "left" }, // Nama Shift
      2: { cellWidth: 12, halign: "center" }, // Jam Masuk
      3: { cellWidth: 12, halign: "center" }, // Scan Masuk
      4: { cellWidth: 13, halign: "center" }, // Terlambat
      5: { cellWidth: 12, halign: "center" }, // Jam Keluar
      6: { cellWidth: 12, halign: "center" }, // Scan Keluar
      7: { cellWidth: 13, halign: "center" }, // P. Cepat
      8: { cellWidth: 12, halign: "center" }, // Durasi
      9: { cellWidth: 11, halign: "center" }, // Lembur Awal
      10: { cellWidth: 11, halign: "center" }, // Lembur Akhir
      11: { cellWidth: 12, halign: "center" }, // Lembur Akhir 2
      12: { cellWidth: 12, halign: "center" }, // Shift Lembur
      13: { cellWidth: 10, halign: "center" }, // Istirahat
      14: { cellWidth: 12, halign: "center" }, // Istirahat Lebih
      15: { cellWidth: 10, halign: "center" }, // Istirahat 2
      16: { cellWidth: 12, halign: "center" }, // Istirahat Lebih 2
      17: { cellWidth: "auto", halign: "left" }, // Keterangan
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const rowIndex = hookData.row.index;
        const rowData = data.rows[rowIndex];
        // If holiday, paint entire row yellow (#FFFF00)
        if (rowData?.isHoliday) {
          hookData.cell.styles.fillColor = [255, 255, 0];
        }
      }
    },
  });

  // ==========================================
  // 4. Document Footer
  // ==========================================
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : pageHeight - margin - 5;
  const footerY = Math.min(finalY + 3.5, pageHeight - margin + 2);

  doc.setLineWidth(0.2);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Halaman : 1    dari : 1", margin + 2, footerY + 3.5);
  doc.text(`Tgl. Cetak : ${data.summary.printedAt}`, margin + contentWidth * 0.42, footerY + 3.5);
  doc.text(`Oleh : ${data.summary.printedBy}`, margin + contentWidth - 2, footerY + 3.5, { align: "right" });

  // Save the PDF file
  const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}
