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

  const pageWidth  = 330;
  const pageHeight = 215;
  const margin     = 15;          // 15 mm all sides
  const cW         = pageWidth - margin * 2; // 300 mm content width

  // ── helpers ────────────────────────────────────────────────────────────────
  const setNormal = (size: number) => { doc.setFont("helvetica", "normal");  doc.setFontSize(size); };
  const setBold   = (size: number) => { doc.setFont("helvetica", "bold");    doc.setFontSize(size); };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HEADER BOX  (matches preview: thick outer border, bold centred title,
  //    divider line, then 3-column sub-info row)
  // ═══════════════════════════════════════════════════════════════════════════
  const hBoxY  = margin;       // 15 mm from top
  const hBoxH  = 14;           // box height in mm
  const divY   = hBoxY + 7.2;  // divider under title

  // Outer border — slightly thicker (0.4) to match preview "border" look
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin, hBoxY, cW, hBoxH);

  // Title — extrabold equivalent: use fontSize 11 + bold + letter-spacing trick
  setBold(11);
  doc.text("LAPORAN RINCIAN HARIAN", pageWidth / 2, hBoxY + 5, { align: "center" });

  // Divider line under title (thinner)
  doc.setLineWidth(0.25);
  doc.line(margin, divY, margin + cW, divY);

  // Sub-info row: Nama Perusahaan | Filter Jenis | Tgl. Periode
  // Match preview layout: left / centre / right, font-medium for labels, font-bold for value
  const subInfoY = hBoxY + 11;
  setNormal(7.5);

  // Left: "Nama Perusahaan : [bold value]"
  doc.text("Nama Perusahaan : ", margin + 2, subInfoY);
  const labelWidthL = doc.getTextWidth("Nama Perusahaan : ");
  setBold(7.5);
  doc.text(data.madrasah.name, margin + 2 + labelWidthL, subInfoY);

  // Centre: "Filter Jenis : Semua"
  const filterLabel = "Filter Jenis : ";
  const filterFull  = `${filterLabel}${data.period.filterJenis}`;
  setNormal(7.5);
  doc.text(filterFull, pageWidth / 2, subInfoY, { align: "center" });

  // Right: "Tgl. Periode : dd/mm/yyyy s/d dd/mm/yyyy"
  setNormal(7.5);
  doc.text(
    `Tgl. Periode : ${data.period.startDate} s/d ${data.period.endDate}`,
    margin + cW - 2,
    subInfoY,
    { align: "right" }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EMPLOYEE DETAILS SUB-HEADER  (matches preview 2-row grid layout)
  //    Row 1: PIN | Nama Karyawan | Jabatan
  //    Row 2: NIK | Departemen   | Status
  // ═══════════════════════════════════════════════════════════════════════════
  const empY   = hBoxY + hBoxH + 1.5;   // just below header box
  const empRow1 = empY + 4;
  const empRow2 = empRow1 + 4;

  doc.setLineWidth(0.25);
  doc.line(margin, empY,          margin + cW, empY);          // top border of emp block
  doc.line(margin, empRow2 + 2.2, margin + cW, empRow2 + 2.2); // bottom border

  // Column X positions matching the 3-column grid in preview
  // Col 1 starts at margin+2 (PIN/NIK)
  // Col 2 starts at roughly 33 % = margin + cW * 0.33
  // Col 3 starts at roughly 66 % = margin + cW * 0.66
  const c1 = margin + 2;
  const c2 = margin + cW * 0.30;
  const c3 = margin + cW * 0.66;

  // Helper: draw label (normal) + colon + value (bold) inline
  const drawLabelValue = (
    label: string,
    value: string,
    x: number,
    y: number,
    valueBold = true,
    labelFontSize = 7.5
  ) => {
    setNormal(labelFontSize);
    const lw = doc.getTextWidth(`${label} : `);
    doc.text(`${label} : `, x, y);
    if (valueBold) setBold(labelFontSize); else setNormal(labelFontSize);
    doc.text(value, x + lw, y);
  };

  // Row 1
  drawLabelValue(data.employee.idType || "NUPTK", data.employee.idNumber || data.employee.nuptk || "-", c1, empRow1, true);
  drawLabelValue("Nama Karyawan", data.employee.name,       c2, empRow1, true);
  drawLabelValue("Jabatan",       data.employee.jabatan,    c3, empRow1, false);

  // Row 2
  drawLabelValue(data.employee.secondaryIdType || "Peg ID", data.employee.secondaryIdNumber || "-", c1, empRow2, true);
  drawLabelValue("Departemen",    data.employee.departemen, c2, empRow2, false);
  drawLabelValue("Status",        data.employee.status,     c3, empRow2, false);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DYNAMIC TABLE HEIGHT CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════
  const startTableY      = empRow2 + 2.2 + 1.5;
  const targetBottomY    = pageHeight - margin;
  const availableHeight  = targetBottomY - startTableY - 7;
  const totalRows        = data.rows.length + 2;
  const targetRowHeight  = Math.min(5.5, Math.max(4.0, availableHeight / totalRows));

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. 18-COLUMN MAIN TABLE
  // ═══════════════════════════════════════════════════════════════════════════
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

  const tableFoot: any[][] = [
    [
      { content: "Total :", colSpan: 2, styles: { fontStyle: "bold", halign: "left", font: "helvetica" } },
      { content: data.summary.totalPresent.toString(), styles: { fontStyle: "bold", halign: "center" } },
      "", "", "", "", "",
      { content: data.summary.totalDurationFormatted, styles: { fontStyle: "bold", halign: "center" } },
      "", "", "", "", "", "", "", "", "",
    ],
  ];

  autoTable(doc, {
    startY: startTableY,
    head: [tableHeaders],
    body: tableBody,
    foot: tableFoot,
    margin: { left: margin, right: margin },
    theme: "plain",
    tableWidth: cW,
    styles: {
      font: "helvetica",
      fontStyle: "normal",
      fontSize: 6.5,
      cellPadding: [1.0, 0.7],
      minCellHeight: targetRowHeight,
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0],
      valign: "middle",
      overflow: "hidden",
    },
    headStyles: {
      // Match preview: font-bold, bg-slate-50, text-center, same border
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 6.2,
      fillColor: [248, 248, 248],  // bg-slate-50
      halign: "center",
      valign: "middle",
      textColor: [0, 0, 0],
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      minCellHeight: targetRowHeight + 1.5,
    },
    footStyles: {
      font: "helvetica",
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      minCellHeight: targetRowHeight,
    },
    columnStyles: {
      0:  { cellWidth: 28,     halign: "left"   }, // Tanggal
      1:  { cellWidth: 27,     halign: "left"   }, // Nama Shift
      2:  { cellWidth: 12,     halign: "center" }, // Jam Masuk
      3:  { cellWidth: 12,     halign: "center" }, // Scan Masuk
      4:  { cellWidth: 14,     halign: "center" }, // Terlambat
      5:  { cellWidth: 12,     halign: "center" }, // Jam Keluar
      6:  { cellWidth: 12,     halign: "center" }, // Scan Keluar
      7:  { cellWidth: 14,     halign: "center" }, // P. Cepat
      8:  { cellWidth: 13,     halign: "center" }, // Durasi
      9:  { cellWidth: 11,     halign: "center" }, // Lembur Awal
      10: { cellWidth: 11,     halign: "center" }, // Lembur Akhir
      11: { cellWidth: 13,     halign: "center" }, // Lembur Akhir 2
      12: { cellWidth: 12,     halign: "center" }, // Shift Lembur
      13: { cellWidth: 11,     halign: "center" }, // Istirahat
      14: { cellWidth: 13,     halign: "center" }, // Istirahat Lebih
      15: { cellWidth: 11,     halign: "center" }, // Istirahat 2
      16: { cellWidth: 13,     halign: "center" }, // Istirahat Lebih 2
      17: { cellWidth: "auto", halign: "left"   }, // Keterangan
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const rowData = data.rows[hookData.row.index];
        // Vivid yellow for holidays
        if (rowData?.isHoliday) {
          hookData.cell.styles.fillColor = [255, 255, 0];
        }
        // Tanggal column: semibold
        if (hookData.column.index === 0) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fontSize  = 6.0;
        }
        // Jam Masuk, Scan Masuk, Jam Keluar, Scan Keluar, Durasi:
        // semua bold agar jelas terbaca di PDF (tidak ada yang tipis)
        if ([2, 3, 5, 6, 8].includes(hookData.column.index)) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fontSize  = 6.5;
        }
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PAGE FOOTER — matches preview: left | centre | right layout
  // ═══════════════════════════════════════════════════════════════════════════
  const finalY  = (doc as any).lastAutoTable?.finalY ?? targetBottomY - 5;
  const footerY = Math.max(finalY + 2, pageHeight - margin - 4);

  doc.setLineWidth(0.25);
  doc.line(margin, footerY, margin + cW, footerY);

  setNormal(7);
  const footTextY = footerY + 3.5;
  doc.text("Halaman : 1    dari : 1",      margin + 2,              footTextY);
  doc.text(`Tgl. Cetak : ${data.summary.printedAt}`, pageWidth / 2, footTextY, { align: "center" });
  doc.text(`Oleh : ${data.summary.printedBy}`,       margin + cW - 2, footTextY, { align: "right" });

  // Save
  const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}
