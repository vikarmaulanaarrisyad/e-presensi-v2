import type { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { formatTeacherName, stripLeadingQuote, maskNik } from "@/lib/excel-helpers";
import type { TeacherItem } from "../components/teacher-management-view";

export type PtkCardLayout = "6_per_page" | "8_per_page" | "4_per_page";

export interface PtkCardExportOptions {
  madrasah: {
    id: string;
    name: string;
    nsm: string;
    npsn?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  teachers: TeacherItem[];
  defaultPassword?: string;
  portalUrl?: string;
  layout?: PtkCardLayout;
  showQrCode?: boolean;
  showCutLines?: boolean;
  showNik?: boolean;
  notesText?: string;
}

/**
 * Creates an F4 Portrait jsPDF instance (215 mm x 330 mm)
 */
async function createF4PortraitDoc(): Promise<jsPDF> {
  const { default: jsPDFClass } = await import("jspdf");
  return new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: [215, 330], // Indonesian standard F4 / Folio
  });
}

/**
 * Generates QR Code data URL asynchronously
 */
async function generateQrCodeDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 140,
      color: {
        dark: "#0a5c36",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.warn("Gagal membuat QR Code untuk:", text, err);
    return null;
  }
}

/**
 * Helper to fetch app logo as base64 data URL with fallback
 */
async function getLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/icons/app-logo.png");
    if (!res.ok) {
      const fallbackRes = await fetch("/app-logo.png");
      if (!fallbackRes.ok) return null;
      const blob = await fallbackRes.blob();
      return await blobToBase64(blob);
    }
    const blob = await res.blob();
    return await blobToBase64(blob);
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

/**
 * Layout configuration parameters for F4 sheet
 */
function getLayoutConfig(layout: PtkCardLayout) {
  switch (layout) {
    case "8_per_page":
      return {
        cardsPerPage: 8,
        cols: 2,
        rows: 4,
        cardWidth: 95,
        cardHeight: 72,
        marginLeft: 10,
        marginTop: 11,
        gapX: 5,
        gapY: 4.5,
        headerHeight: 12,
        titleSize: 6.5,
        schoolSize: 7.5,
        subSize: 5.5,
        nameSize: 7.5,
        detailSize: 5.5,
        credSize: 5.8,
        qrSize: 14,
      };
    case "4_per_page":
      return {
        cardsPerPage: 4,
        cols: 2,
        rows: 2,
        cardWidth: 95,
        cardHeight: 144,
        marginLeft: 10,
        marginTop: 15,
        gapX: 5,
        gapY: 8,
        headerHeight: 18,
        titleSize: 7.5,
        schoolSize: 9,
        subSize: 6.5,
        nameSize: 9,
        detailSize: 7,
        credSize: 7.5,
        qrSize: 22,
      };
    case "6_per_page":
    default:
      return {
        cardsPerPage: 6,
        cols: 2,
        rows: 3,
        cardWidth: 95,
        cardHeight: 96,
        marginLeft: 10,
        marginTop: 12,
        gapX: 5,
        gapY: 5.5,
        headerHeight: 15,
        titleSize: 7,
        schoolSize: 8.5,
        subSize: 6,
        nameSize: 8.5,
        detailSize: 6.2,
        credSize: 6.5,
        qrSize: 17,
      };
  }
}

/**
 * Generates the complete F4 PDF Document containing PTK Cards
 */
export async function createPtkCardsPdfDoc(options: PtkCardExportOptions): Promise<jsPDF> {
  const doc = await createF4PortraitDoc();
  const layout = options.layout || "6_per_page";
  const cfg = getLayoutConfig(layout);
  const defaultPassword = options.defaultPassword || "Password123!";
  const portalUrl = options.portalUrl || (typeof window !== "undefined" ? `${window.location.origin}/guru/login` : "/guru/login");
  const logoDataUrl = await getLogoBase64();

  const totalTeachers = options.teachers.length;
  if (totalTeachers === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Tidak ada data guru yang dipilih untuk dicetak.", 107.5, 160, { align: "center" });
    return doc;
  }

  // Pre-generate QR codes for all teachers if requested
  const qrCodes: Record<string, string | null> = {};
  if (options.showQrCode !== false) {
    for (const t of options.teachers) {
      // QR contains login portal or teacher credential access string
      const qrPayload = `${portalUrl}?id=${encodeURIComponent(t.email || t.pegId || t.nuptk || t.id)}`;
      qrCodes[t.id] = await generateQrCodeDataUrl(qrPayload);
    }
  }

  const totalPages = Math.ceil(totalTeachers / cfg.cardsPerPage);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage([215, 330], "portrait");
    }

    // Sheet Header Watermark / Meta (very small at top edge)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(140, 150, 165);
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc.text(
      `E-PRESENSI GTK KEMENAG - KARTU AKUN PTK | ${options.madrasah.name} | Halaman ${pageIdx + 1} dari ${totalPages} | Dicetak: ${dateStr}`,
      cfg.marginLeft,
      cfg.marginTop - 4
    );

    const startIndex = pageIdx * cfg.cardsPerPage;
    const pageTeachers = options.teachers.slice(startIndex, startIndex + cfg.cardsPerPage);

    for (let i = 0; i < pageTeachers.length; i++) {
      const teacher = pageTeachers[i];
      const col = i % cfg.cols;
      const row = Math.floor(i / cfg.cols);

      const cardX = cfg.marginLeft + col * (cfg.cardWidth + cfg.gapX);
      const cardY = cfg.marginTop + row * (cfg.cardHeight + cfg.gapY);

      // Draw cut guide lines if enabled
      if (options.showCutLines) {
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.15);
        doc.setLineDashPattern([1.5, 1.5], 0);

        // Surrounding cut marker
        const pad = 1.5;
        doc.rect(cardX - pad, cardY - pad, cfg.cardWidth + pad * 2, cfg.cardHeight + pad * 2, "S");
        doc.setLineDashPattern([], 0); // reset to solid
      }

      // Draw single card
      await drawSingleCard(
        doc,
        teacher,
        cardX,
        cardY,
        cfg,
        layout,
        options,
        defaultPassword,
        portalUrl,
        logoDataUrl,
        qrCodes[teacher.id] || null
      );
    }

    // Page Footer Note
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Format Kertas F4 (Folio 215 x 330 mm) - Potong kartu sesuai garis pembatas untuk dibagikan kepada masing-masing GTK.",
      107.5,
      325,
      { align: "center" }
    );
  }

  return doc;
}

/**
 * Draws an individual PTK Card
 */
async function drawSingleCard(
  doc: jsPDF,
  teacher: TeacherItem,
  x: number,
  y: number,
  cfg: ReturnType<typeof getLayoutConfig>,
  layout: PtkCardLayout,
  options: PtkCardExportOptions,
  defaultPassword: string,
  portalUrl: string,
  logoDataUrl: string | null,
  qrDataUrl: string | null
) {
  const w = cfg.cardWidth;
  const h = cfg.cardHeight;
  const radius = 2.5;

  // 1. CARD BACKGROUND & BORDER
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 195, 205);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");

  // 2. HEADER BANNER (Official Madrasah Green #0A5C36)
  const hh = cfg.headerHeight;
  doc.setFillColor(10, 92, 54); // #0A5C36
  doc.roundedRect(x, y, w, hh, radius, radius, "F");
  // Fill square bottom corners of header to join cleanly with body
  doc.rect(x, y + hh - 3, w, 3, "F");

  // Subtle accent line under header (Gold #D97706)
  doc.setFillColor(217, 119, 6);
  doc.rect(x, y + hh, w, 0.8, "F");

  // Madrasah / App Logo in Header
  let headerTextLeft = x + 3.5;
  if (logoDataUrl) {
    try {
      const logoSize = hh - 3.5;
      doc.addImage(logoDataUrl, "PNG", x + 3, y + 2, logoSize, logoSize);
      headerTextLeft = x + logoSize + 5.5;
    } catch {
      headerTextLeft = x + 3.5;
    }
  }

  // Header Texts
  const maxHeaderWidth = w - (headerTextLeft - x) - 3;
  const titleY = y + (hh === 12 ? 3.5 : hh === 18 ? 4.8 : 4.0);
  const schoolY = y + (hh === 12 ? 7.2 : hh === 18 ? 9.8 : 8.2);
  const nsmY = y + (hh === 12 ? 10.5 : hh === 18 ? 14.5 : 12.0);

  // Title: "KARTU IDENTITAS & AKSES AKUN PTK"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.titleSize);
  doc.setTextColor(255, 230, 130); // Soft gold
  doc.text("KARTU IDENTITAS & AKSES PTK", headerTextLeft, titleY);

  // Madrasah Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.schoolSize);
  doc.setTextColor(255, 255, 255);
  const truncatedSchool = doc.splitTextToSize(options.madrasah.name.toUpperCase(), maxHeaderWidth)[0] || options.madrasah.name;
  doc.text(truncatedSchool, headerTextLeft, schoolY);

  // NSM & NPSN
  doc.setFont("helvetica", "normal");
  doc.setFontSize(cfg.subSize);
  doc.setTextColor(220, 245, 230);
  const nsmNpsnText = `NSM: ${options.madrasah.nsm || "-"}${options.madrasah.npsn ? ` | NPSN: ${options.madrasah.npsn}` : ""}`;
  doc.text(nsmNpsnText, headerTextLeft, nsmY);

  // 3. BODY: TEACHER IDENTITAS
  // Generous padding below header gold bar (ends at y + hh + 0.8) so name is never covered
  const bodyStartY = y + hh + 0.8 + 6.0;
  let currY = bodyStartY;

  // Full Name & Gelar
  const fullName = formatTeacherName(teacher.name, teacher.gelarDepan, teacher.gelarBelakang);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.nameSize);
  doc.setTextColor(15, 23, 42); // slate-900

  // Split name if too long
  const nameLines = doc.splitTextToSize(fullName, w - 8);
  doc.text(nameLines[0], x + 4, currY);
  currY += (nameLines.length > 1 ? 5.0 : 4.8);

  // Badges: Jabatan & Status Kepegawaian (Pill badges)
  const jabatanName = teacher.position?.name || teacher.jenisGtk || "Guru Madrasah";
  const statusPegawai = teacher.statusKepegawaian || "PNS";

  // Jabatan Badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.detailSize);
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.2);
  const jabWidth = Math.min(doc.getTextWidth(jabatanName) + 4, 52);
  doc.roundedRect(x + 4, currY - 3, jabWidth, 4.2, 1, 1, "FD");
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(jabatanName, x + 6, currY - 0.2);

  // Status Badge
  const statusX = x + 4 + jabWidth + 2;
  const statusWidth = doc.getTextWidth(statusPegawai) + 4;
  if (statusX + statusWidth < x + w - 4) {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(statusX, currY - 3, statusWidth, 4.2, 1, 1, "FD");
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(statusPegawai, statusX + 2, currY - 0.2);
  }
  currY += 4.5;

  // Identity Rows: NIP, NUPTK, Peg ID, Tempat Tgl Lahir
  const drawLabelValue = (label: string, val: string, startY: number, customValBold = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(cfg.detailSize);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, x + 4, startY);

    const colonX = x + 24;
    doc.text(":", colonX, startY);

    if (customValBold) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
    }
    const valText = doc.splitTextToSize(val, w - 28)[0] || val;
    doc.text(valText, colonX + 2, startY);
  };

  const lineSpacing = layout === "8_per_page" ? 3.3 : 3.8;

  // Peg ID (EMIS)
  const cleanPegId = stripLeadingQuote(teacher.pegId);
  drawLabelValue("Peg ID (EMIS)", cleanPegId || "-", currY, Boolean(cleanPegId));
  currY += lineSpacing;

  // NUPTK
  const cleanNuptk = stripLeadingQuote(teacher.nuptk);
  drawLabelValue("NUPTK", cleanNuptk || "-", currY, Boolean(cleanNuptk));
  currY += lineSpacing;

  // NIP / NIK
  const cleanNip = stripLeadingQuote(teacher.nip);
  if (cleanNip) {
    drawLabelValue("NIP", cleanNip, currY, true);
    currY += lineSpacing;
  } else if (options.showNik && teacher.nik) {
    drawLabelValue("NIK KTP", maskNik(teacher.nik), currY);
    currY += lineSpacing;
  }

  // Kontak WA / HP (if available and space permits)
  if (layout !== "8_per_page") {
    const rawPhone = stripLeadingQuote(teacher.phone);
    const isPhone = rawPhone && !rawPhone.toLowerCase().includes("pns") && (rawPhone.replace(/[^0-9]/g, "").length >= 7 || rawPhone.startsWith("+"));
    if (isPhone) {
      drawLabelValue("No. HP / WA", rawPhone, currY);
      currY += lineSpacing;
    }
  }

  // 4. KREDENSIAL LOGIN BOX (Sangat Jelas & Kontras)
  const credBoxY = currY + 1;
  const qrSize = cfg.qrSize;
  const hasQr = Boolean(qrDataUrl);
  const credBoxWidth = hasQr ? w - 8 - qrSize - 2.5 : w - 8;
  const credBoxHeight = layout === "8_per_page" ? 22 : layout === "4_per_page" ? 34 : 26;

  // Credential Box Background (Light blue / emerald tint)
  doc.setFillColor(240, 249, 255); // sky-50
  doc.setDrawColor(186, 230, 253); // sky-200
  doc.setLineWidth(0.3);
  doc.roundedRect(x + 4, credBoxY, credBoxWidth, credBoxHeight, 2, 2, "FD");

  // Credential Header Tag
  doc.setFillColor(2, 132, 199); // sky-600
  doc.roundedRect(x + 4, credBoxY, credBoxWidth, 4.5, 2, 2, "F");
  doc.rect(x + 4, credBoxY + 2.5, credBoxWidth, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.detailSize);
  doc.setTextColor(255, 255, 255);
  doc.text("KREDENSIAL LOGIN E-PRESENSI", x + 6, credBoxY + 3.2);

  // Content inside credential box
  let cY = credBoxY + 7.5;
  const cLineGap = layout === "8_per_page" ? 3.8 : 4.5;

  // Username
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.credSize - 0.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Username", x + 6, cY);
  doc.text(":", x + 23, cY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(3, 105, 161); // sky-700
  const maxEmailWidth = credBoxWidth - 26;
  const displayEmail = doc.splitTextToSize(teacher.email, maxEmailWidth)[0] || teacher.email;
  doc.text(displayEmail, x + 25, cY);
  cY += cLineGap;

  // Password
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.credSize - 0.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Kata Sandi", x + 6, cY);
  doc.text(":", x + 23, cY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9); // amber-700 (distinct and readable)
  doc.text(defaultPassword, x + 25, cY);
  cY += cLineGap;

  // Login Portal URL
  doc.setFont("helvetica", "normal");
  doc.setFontSize(cfg.credSize - 1.2);
  doc.setTextColor(100, 116, 139);
  doc.text("Akses Login", x + 6, cY);
  doc.text(":", x + 23, cY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const portalShort = portalUrl.replace(/^https?:\/\//, "");
  const maxPortalWidth = credBoxWidth - 26;
  const displayPortal = doc.splitTextToSize(portalShort, maxPortalWidth)[0] || portalShort;
  doc.text(displayPortal, x + 25, cY);

  // If 4_per_page layout, add extra handover signature / verification line
  if (layout === "4_per_page") {
    cY += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Diterima oleh Guru:", x + 6, cY);
    doc.text("Tanda Tangan: ____________________", x + 6, cY + 9);
  }

  // QR Code on right side
  if (hasQr && qrDataUrl) {
    const qrX = x + 4 + credBoxWidth + 2.5;
    const qrY = credBoxY;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(qrX, qrY, qrSize, credBoxHeight, 2, 2, "FD");

    try {
      doc.addImage(qrDataUrl, "PNG", qrX + 1, qrY + 1, qrSize - 2, qrSize - 2);
    } catch (e) {
      console.warn("Error drawing QR code image:", e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(10, 92, 54);
    doc.text("SCAN LOGIN", qrX + qrSize / 2, qrY + credBoxHeight - 1.5, { align: "center" });
  }

  // 5. FOOTER SECURITY NOTICE
  const footerY = y + h - 2.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(5.2);
  doc.setTextColor(148, 163, 184); // slate-400
  const noticeText = options.notesText || "Jaga kerahasiaan kata sandi. Segera perbarui di profil aplikasi setelah login.";
  doc.text(noticeText, x + w / 2, footerY, { align: "center" });
}

/**
 * Downloads the F4 PDF file of PTK Cards
 */
export async function exportPtkCardsToPdf(options: PtkCardExportOptions) {
  const doc = await createPtkCardsPdfDoc(options);
  const cleanSchool = (options.madrasah.name || "Madrasah").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Kartu_PTK_F4_${cleanSchool}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

/**
 * Sends the exact F4 PDF document directly to the browser printer
 */
export async function printPtkCardsPdf(options: PtkCardExportOptions) {
  const doc = await createPtkCardsPdfDoc(options);
  doc.autoPrint();

  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);

  const iframeId = "ptk-card-direct-print-frame";
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Gagal print via iframe, membuka tab baru:", err);
        const win = window.open(blobUrl, "_blank");
        if (win) win.focus();
      }
    }, 250);
  };
}
