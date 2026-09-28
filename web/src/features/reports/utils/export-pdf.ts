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
  const margin = 15; // 1.5 cm (15 mm) margin on all sides
  const contentWidth = pageWidth - margin * 2; // 300 mm
  const targetBottomY = pageHeight - margin; // 200 mm

  // ==========================================
  // 1. Header Box (Bordered Rectangle)
  // ==========================================
  const headerBoxY = margin; // 15 mm
  const headerBoxHeight = 12;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, headerBoxY, contentWidth, headerBoxHeight);

  // Centered Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("LAPORAN RINCIAN HARIAN", pageWidth / 2, headerBoxY + 4.5, { align: "center" });

  // Divider line under title
  doc.setLineWidth(0.2);
  doc.line(margin, headerBoxY + 6.5, margin + contentWidth, headerBoxY + 6.5);

  // Sub-info inside header box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Nama Perusahaan : ${data.madrasah.name}`, margin + 2, headerBoxY + 10);
  doc.text(`Filter Jenis : ${data.period.filterJenis}`, margin + contentWidth * 0.42, headerBoxY + 10);
  doc.text(
    `Tgl. Periode : ${data.period.startDate} s/d ${data.period.endDate}`,
    margin + contentWidth - 2,
    headerBoxY + 10,
    { align: "right" }
  );

  // ==========================================
  // 2. Employee Details Sub-header
  // ==========================================
  const empY = headerBoxY + headerBoxHeight + 1.5;
  doc.line(margin, empY, margin + contentWidth, empY);

  doc.setFontSize(7.5);
  // Row 1
  doc.text(`PIN : ${data.employee.pin}`, margin + 2, empY + 3.5);
  doc.text(`Nama Karyawan : ${data.employee.name}`, margin + 45, empY + 3.5);
  doc.text(`Jabatan : ${data.employee.jabatan}`, margin + 180, empY + 3.5);

  // Row 2
  doc.text(`NIK : ${data.employee.nik}`, margin + 2, empY + 7);
  doc.text(`Departemen : ${data.employee.departemen}`, margin + 45, empY + 7);
  doc.text(`Status : ${data.employee.status}`, margin + 180, empY + 7);

  doc.line(margin, empY + 8.8, margin + contentWidth, empY + 8.8);

  // ==========================================
  // 3. Dynamic Height Calculation to Fill Full Page
  // ==========================================
  const startTableY = empY + 10;
  const availableTableHeight = targetBottomY - startTableY - 7; // leaves 7mm for footer
  const totalRows = data.rows.length + 2; // data rows + 1 header row + 1 foot row

  // Calculate cell height so table fills the full page vertically
  const targetRowHeight = Math.min(5.5, Math.max(4.0, availableTableHeight / totalRows));

  // ==========================================
  // 4. 18-Column Main Table
  // ==========================================
  const tableHeaders = [
    "Tanggal",
    "Nama Shift",
    "Jam\nMasuk",
    "Scan\nMasuk",
    "Terlambat\n(Menit)",
    "Jam\nKeluar",
    "Scan\nKeluar",
    "P. Cepat\n(Menit)",
    "Durasi",
    "Lembur\nAwal",
    "Lembur\nAkhir",
    "Lembur\nAkhir 2",
    "Shift\nLembur",
    "Istirahat",
    "Istirahat\nLebih",
    "Istirahat\n2",
    "Istirahat\nLebih 2",
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
    startY: startTableY,
    head: [tableHeaders],
    body: tableBody,
    foot: tableFoot,
    margin: { left: margin, right: margin },
    theme: "plain",
    tableWidth: contentWidth,
    styles: {
      font: "helvetica",
      fontSize: 6.2,
      cellPadding: [0.9, 0.6],
      minCellHeight: targetRowHeight,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      valign: "middle",
      overflow: "hidden",
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [248, 248, 248],
      halign: "center",
      valign: "middle",
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      minCellHeight: targetRowHeight + 1,
      fontSize: 5.8,
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      minCellHeight: targetRowHeight,
    },
    columnStyles: {
      0: { cellWidth: 28, halign: "left" }, // Tanggal
      1: { cellWidth: 27, halign: "left" }, // Nama Shift
      2: { cellWidth: 12, halign: "center" }, // Jam Masuk
      3: { cellWidth: 12, halign: "center" }, // Scan Masuk
      4: { cellWidth: 14, halign: "center" }, // Terlambat
      5: { cellWidth: 12, halign: "center" }, // Jam Keluar
      6: { cellWidth: 12, halign: "center" }, // Scan Keluar
      7: { cellWidth: 14, halign: "center" }, // P. Cepat
      8: { cellWidth: 13, halign: "center" }, // Durasi
      9: { cellWidth: 11, halign: "center" }, // Lembur Awal
      10: { cellWidth: 11, halign: "center" }, // Lembur Akhir
      11: { cellWidth: 13, halign: "center" }, // Lembur Akhir 2
      12: { cellWidth: 12, halign: "center" }, // Shift Lembur
      13: { cellWidth: 11, halign: "center" }, // Istirahat
      14: { cellWidth: 13, halign: "center" }, // Istirahat Lebih
      15: { cellWidth: 11, halign: "center" }, // Istirahat 2
      16: { cellWidth: 13, halign: "center" }, // Istirahat Lebih 2
      17: { cellWidth: "auto", halign: "left" }, // Keterangan
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const rowIndex = hookData.row.index;
        const rowData = data.rows[rowIndex];
        // Highlight entire row with vivid yellow (#FFFF00) for holidays
        if (rowData?.isHoliday) {
          hookData.cell.styles.fillColor = [255, 255, 0];
        }
      }
    },
  });

  // ==========================================
  // 5. Document Footer Locked at Bottom of Page
  // ==========================================
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : targetBottomY - 5;
  const footerY = Math.max(finalY + 2, targetBottomY - 4);

  doc.setLineWidth(0.2);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Halaman : 1    dari : 1", margin + 2, footerY + 3.5);
  doc.text(`Tgl. Cetak : ${data.summary.printedAt}`, margin + contentWidth * 0.42, footerY + 3.5);
  doc.text(`Oleh : ${data.summary.printedBy}`, margin + contentWidth - 2, footerY + 3.5, { align: "right" });

  // Save the PDF file
  const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}
