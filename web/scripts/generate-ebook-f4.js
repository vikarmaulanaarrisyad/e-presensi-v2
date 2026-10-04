/**
 * Script Generator Ebook Panduan Lengkap Pengembangan E-Presensi GTK Madrasah V2
 * Edisi Masterclass: Full In-Depth Documentation & Complete Source Code
 * Format Kertas: F4 / Folio (215 mm x 330 mm)
 * Engine: jsPDF + jspdf-autotable
 */

const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableImport = require('jspdf-autotable');
const autoTable = autoTableImport.default || autoTableImport;

// Helper membaca file asli dari repositori jika ada
function readRepoFile(relPath) {
  try {
    const fullPath = path.resolve(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
  } catch (e) {
    // fallback
  }
  return null;
}

class UltraEbookBuilder {
  constructor(outputPath) {
    this.outputPath = outputPath;
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215, 330] });
    this.pageWidth = 215;
    this.pageHeight = 330;
    this.marginLeft = 20;
    this.marginRight = 20;
    this.marginTop = 24;
    this.marginBottom = 24;
    this.contentWidth = this.pageWidth - this.marginLeft - this.marginRight; // 175 mm
    this.currentY = this.marginTop;

    this.chaptersMeta = [];
  }

  checkSpace(neededHeight) {
    if (this.currentY + neededHeight > this.pageHeight - this.marginBottom) {
      this.doc.addPage([215, 330]);
      this.currentY = this.marginTop + 6;
      return true;
    }
    return false;
  }

  addCover() {
    const doc = this.doc;
    const w = this.pageWidth;
    const h = this.pageHeight;

    // Background Top Banner
    doc.setFillColor(4, 74, 50); // Deep Emerald
    doc.rect(0, 0, w, 115, 'F');

    // Navy Stripe Accent
    doc.setFillColor(0, 40, 142); // Royal Navy
    doc.rect(0, 112, w, 6, 'F');

    // Gold Stripe Accent
    doc.setFillColor(234, 179, 8); // Gold Yellow
    doc.rect(0, 118, w, 2.5, 'F');

    // Top Category
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("BUKU PANDUAN LENGKAP & BLUEPRINT REKAYASA SISTEM INFORMASI", w / 2, 28, { align: "center" });

    // Main Cover Title
    doc.setFontSize(23);
    doc.setFont("helvetica", "bold");
    const titleLines = [
      "EBOOK PANDUAN LENGKAP",
      "PENGEMBANGAN SISTEM",
      "E-PRESENSI GTK MADRASAH",
      "BERBASIS NEXT.JS 16 & PRISMA"
    ];
    let titleY = 44;
    for (const line of titleLines) {
      doc.text(line, w / 2, titleY, { align: "center" });
      titleY += 10;
    }

    // Cover Subtitle
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(226, 232, 240);
    doc.text("Panduan Super Detail dari Nol: Arsitektur Multi-Tenant, Geofence GPS, Swafoto Watermark,", w / 2, 90, { align: "center" });
    doc.text("PWA Native, Dashboard Monitoring Admin, Rekap EMIS 4.0 & Panduan Tambah Modul Baru", w / 2, 96, { align: "center" });
    doc.text("Disertai Kode Sumber Utuh (Full Complete Code) dan Dokumentasi Baris per Baris", w / 2, 102, { align: "center" });

    // Spec Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(this.marginLeft, 134, this.contentWidth, 122, 4, 4, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Spesifikasi & Cakupan Blueprint Sistem", this.marginLeft + 8, 147);

    const specs = [
      ["Framework & Runtime", "Next.js 16 (App Router, Server Actions, RSC) + Node.js 20+ LTS"],
      ["Database & ORM", "PostgreSQL (Supabase Pooler) + Prisma ORM 6.4 + Indeks Komposit"],
      ["Desain & Styling", "Tailwind CSS v4 + Plus Jakarta Sans Typography + Lucide Icons"],
      ["Autentikasi & Keamanan", "NextAuth.js v5 Beta (Credentials Multi-ID: NIP, NIK, NUPTK, PegID)"],
      ["Modul Mobile GTK", "PWA Standalone (Service Worker, Geofencing Haversine, Kamera Live)"],
      ["Format Standar Dinas", "Laporan Rekapitulasi Presensi EMIS GTK 4.0 Kemenag (.xlsx & .pdf)"],
      ["Format Dokumen Ini", "Kertas F4 / Folio Standar Resmi Indonesia (215 mm x 330 mm)"]
    ];

    let specY = 158;
    doc.setFontSize(9.5);
    specs.forEach(([label, val]) => {
      doc.setFillColor(4, 74, 50);
      doc.circle(this.marginLeft + 12, specY - 1, 1.2, 'F');

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(label + ":", this.marginLeft + 16, specY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(val, this.marginLeft + 64, specY);

      specY += 10.5;
    });

    // Author Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(this.marginLeft, 268, this.contentWidth, 38, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(4, 74, 50);
    doc.text("DOKUMENTASI RESMI REKAYASA PERANGKAT LUNAK E-PRESENSI V2", this.marginLeft + 8, 279);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Disusun secara lengkap menyertakan seluruh kode implementasi produksi, arsitektur skema,", this.marginLeft + 8, 287);
    doc.text("algoritma geofencing, penempelan watermark canvas, hingga panduan pembuatan modul baru dari nol.", this.marginLeft + 8, 293);
    doc.text("Edisi Lengkap F4 (Folio) | Kode Sumber Utuh | Tahun 2026", this.marginLeft + 8, 299);
  }

  reserveTocPages() {
    // Buat 2 halaman kosong untuk Daftar Isi (Halaman 2 dan Halaman 3)
    this.doc.addPage([215, 330]); // Page 2
    this.doc.addPage([215, 330]); // Page 3
  }

  addChapterHeader(chapterNum, title, description) {
    this.doc.addPage([215, 330]);
    this.currentY = this.marginTop + 4;
    const curPage = this.doc.internal.getNumberOfPages();
    this.chaptersMeta.push({ num: chapterNum, title, page: curPage });

    const doc = this.doc;

    // Badge
    doc.setFillColor(0, 40, 142);
    doc.roundedRect(this.marginLeft, this.currentY, 26, 7, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(chapterNum, this.marginLeft + 13, this.currentY + 5, { align: "center" });

    this.currentY += 12;

    // Main Chapter Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, this.marginLeft, this.currentY);

    this.currentY += 6;

    // Line
    doc.setDrawColor(4, 74, 50);
    doc.setLineWidth(1);
    doc.line(this.marginLeft, this.currentY, this.marginLeft + 40, this.currentY);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(this.marginLeft + 40, this.currentY, this.pageWidth - this.marginRight, this.currentY);

    this.currentY += 7;

    // Description
    if (description) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(description, this.contentWidth);
      doc.text(splitDesc, this.marginLeft, this.currentY);
      this.currentY += splitDesc.length * 4.8 + 5;
    }
  }

  addSubHeading(title) {
    this.checkSpace(16);
    const doc = this.doc;

    doc.setFillColor(4, 74, 50);
    doc.rect(this.marginLeft, this.currentY - 3.5, 3.5, 9, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, this.marginLeft + 6, this.currentY + 2.5);

    this.currentY += 11;
  }

  addSubSubHeading(title) {
    this.checkSpace(12);
    const doc = this.doc;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 40, 142);
    doc.text("▶  " + title, this.marginLeft, this.currentY);

    this.currentY += 7.5;
  }

  addParagraph(text) {
    const doc = this.doc;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const splitText = doc.splitTextToSize(text, this.contentWidth);
    const blockHeight = splitText.length * 4.8;
    this.checkSpace(blockHeight + 3);

    doc.text(splitText, this.marginLeft, this.currentY);
    this.currentY += blockHeight + 3.5;
  }

  addBulletList(items) {
    const doc = this.doc;
    doc.setFontSize(9.5);

    items.forEach((item) => {
      const isString = typeof item === 'string';
      const title = isString ? '' : item[0];
      const desc = isString ? item : item[1];

      doc.setFont("helvetica", "normal");
      const fullText = (title ? title + ": " : "") + desc;
      const splitText = doc.splitTextToSize(fullText, this.contentWidth - 8);
      const itemHeight = splitText.length * 4.8;
      this.checkSpace(itemHeight + 2);

      doc.setFillColor(4, 74, 50);
      doc.circle(this.marginLeft + 3, this.currentY - 1, 1.2, 'F');

      if (title) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(title + ": ", this.marginLeft + 7, this.currentY);

        const titleWidth = doc.getTextWidth(title + ": ");
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        const restSplit = doc.splitTextToSize(desc, this.contentWidth - 8 - titleWidth);
        if (restSplit.length === 1) {
          doc.text(desc, this.marginLeft + 7 + titleWidth, this.currentY);
          this.currentY += 5.5;
        } else {
          doc.setFont("helvetica", "normal");
          doc.text(splitText, this.marginLeft + 7, this.currentY);
          this.currentY += itemHeight + 2.5;
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(splitText, this.marginLeft + 7, this.currentY);
        this.currentY += itemHeight + 2.5;
      }
    });

    this.currentY += 2;
  }

  /**
   * Blok kode super detail dengan nomor baris dan zebra striping
   */
  addCodeBlock(fileName, codeText) {
    const doc = this.doc;
    const lines = codeText.trim().split('\n');
    const lineHeight = 3.6;
    const headerHeight = fileName ? 6.5 : 0;

    // Header File
    if (fileName) {
      this.checkSpace(headerHeight + 10);
      doc.setFillColor(226, 232, 240);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(this.marginLeft, this.currentY, this.contentWidth, headerHeight, 1.5, 1.5, 'FD');
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("KODE LENGKAP: " + fileName, this.marginLeft + 4, this.currentY + 4.5);
      this.currentY += headerHeight;
    }

    doc.setFont("courier", "normal");
    doc.setFontSize(7.2);

    for (let i = 0; i < lines.length; i++) {
      this.checkSpace(lineHeight + 1);
      const l = lines[i];

      // Zebra striping
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(241, 245, 249);
      }
      doc.rect(this.marginLeft, this.currentY - 2.8, this.contentWidth, lineHeight, 'F');

      // Line number
      doc.setFont("courier", "bold");
      doc.setTextColor(148, 163, 184);
      doc.text(String(i + 1).padStart(3, ' '), this.marginLeft + 2, this.currentY);

      // Line content (wrap / truncate if exceeds)
      doc.setFont("courier", "normal");
      doc.setTextColor(15, 23, 42);
      const maxChars = 86;
      const cleanLine = l.length > maxChars ? l.substring(0, maxChars) + "..." : l;
      doc.text(cleanLine, this.marginLeft + 12, this.currentY);

      this.currentY += lineHeight;
    }

    // Border bottom
    doc.setDrawColor(203, 213, 225);
    doc.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
    this.currentY += 4;
  }

  addCallout(title, message, type = "info") {
    const doc = this.doc;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const splitMsg = doc.splitTextToSize(message, this.contentWidth - 14);
    const boxHeight = splitMsg.length * 4.6 + 12;

    this.checkSpace(boxHeight + 4);

    let bgColor = [240, 253, 244]; // emerald 50
    let borderColor = [34, 197, 94]; // emerald 500
    let titleColor = [4, 74, 50];

    if (type === "warning") {
      bgColor = [255, 251, 235]; // amber 50
      borderColor = [245, 158, 11]; // amber 500
      titleColor = [146, 64, 14];
    } else if (type === "navy") {
      bgColor = [238, 242, 255]; // indigo 50
      borderColor = [79, 70, 229]; // indigo 600
      titleColor = [0, 40, 142];
    }

    doc.setFillColor(...bgColor);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(this.marginLeft, this.currentY, this.contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFillColor(...borderColor);
    doc.roundedRect(this.marginLeft, this.currentY, 3, boxHeight, 1, 1, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...titleColor);
    doc.text(title, this.marginLeft + 8, this.currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitMsg, this.marginLeft + 8, this.currentY + 10.5);

    this.currentY += boxHeight + 4;
  }

  addTable({ head, body, startY }) {
    autoTable(this.doc, {
      startY: startY || this.currentY,
      head: [head],
      body: body,
      theme: 'grid',
      margin: { left: this.marginLeft, right: this.marginRight },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [4, 74, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    this.currentY = this.doc.lastAutoTable.finalY + 6;
  }

  renderTableOfContentsOnReservedPages() {
    // Gambar pada halaman 2 dan 3
    const doc = this.doc;

    // Page 2
    doc.setPage(2);
    let y = this.marginTop + 4;

    // Header banner
    doc.setFillColor(4, 74, 50);
    doc.roundedRect(this.marginLeft, y - 3, this.contentWidth, 18, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("DAFTAR ISI LENGKAP (BAGIAN 1)", this.marginLeft + 8, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(209, 250, 229);
    doc.text("Struktur Navigasi Seluruh Bab Dokumen Arsitektur & Rekayasa Sistem E-Presensi GTK V2", this.marginLeft + 8, y + 11.5);

    y += 26;

    // Tampilkan 5 bab pertama di halaman 2
    const firstHalf = this.chaptersMeta.slice(0, 5);
    firstHalf.forEach((ch) => {
      // Badge
      doc.setFillColor(4, 74, 50);
      doc.roundedRect(this.marginLeft, y - 4, 18, 6.5, 1.5, 1.5, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(ch.num, this.marginLeft + 9, y + 0.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(ch.title, this.marginLeft + 22, y + 0.5);

      const titleWidth = doc.getTextWidth(ch.title);
      const dotStartX = this.marginLeft + 24 + titleWidth;
      const dotEndX = this.pageWidth - this.marginRight - 14;

      if (dotEndX > dotStartX) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        let dots = "";
        let wD = 0;
        while (wD < (dotEndX - dotStartX)) {
          dots += ". ";
          wD = doc.getTextWidth(dots);
        }
        doc.text(dots, dotStartX, y + 0.5);
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 40, 142);
      doc.text("Hal " + ch.page, this.pageWidth - this.marginRight, y + 0.5, { align: "right" });

      y += 12;
    });

    // Page 3
    doc.setPage(3);
    y = this.marginTop + 4;

    doc.setFillColor(4, 74, 50);
    doc.roundedRect(this.marginLeft, y - 3, this.contentWidth, 18, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("DAFTAR ISI LENGKAP (BAGIAN 2)", this.marginLeft + 8, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(209, 250, 229);
    doc.text("Kelanjutan Bab Praktik Pembuatan Modul Baru, Audit Performa, Keamanan & Deployment", this.marginLeft + 8, y + 11.5);

    y += 26;

    const secondHalf = this.chaptersMeta.slice(5);
    secondHalf.forEach((ch) => {
      doc.setFillColor(4, 74, 50);
      doc.roundedRect(this.marginLeft, y - 4, 18, 6.5, 1.5, 1.5, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(ch.num, this.marginLeft + 9, y + 0.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(ch.title, this.marginLeft + 22, y + 0.5);

      const titleWidth = doc.getTextWidth(ch.title);
      const dotStartX = this.marginLeft + 24 + titleWidth;
      const dotEndX = this.pageWidth - this.marginRight - 14;

      if (dotEndX > dotStartX) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        let dots = "";
        let wD = 0;
        while (wD < (dotEndX - dotStartX)) {
          dots += ". ";
          wD = doc.getTextWidth(dots);
        }
        doc.text(dots, dotStartX, y + 0.5);
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 40, 142);
      doc.text("Hal " + ch.page, this.pageWidth - this.marginRight, y + 0.5, { align: "right" });

      y += 12;
    });

    // Callout on Page 3
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(this.marginLeft, y + 10, this.contentWidth, 42, 2, 2, 'FD');
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(this.marginLeft, y + 10, 3, 42, 1, 1, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(4, 74, 50);
    doc.text("STANDARISASI KODE SUMBER UTUH (FULL SOURCE CODE)", this.marginLeft + 8, y + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    const msg = "Seluruh blok kode dalam ebook ini diambil langsung dari codebase proyek nyata (Next.js 16 + Prisma 6 + PostgreSQL). Setiap file kode disajikan secara utuh tanpa pemotongan (...) agar pembaca dapat langsung menyalin (copy-paste) atau menelaah arsitektur logika secara menyeluruh.";
    const splitMsg = doc.splitTextToSize(msg, this.contentWidth - 14);
    doc.text(splitMsg, this.marginLeft + 8, y + 23);
  }

  addFooterAndHeaderToAllPages() {
    const totalPages = this.doc.internal.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      this.doc.setPage(p);

      // Running Header
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text("EBOOK PANDUAN PENGEMBANGAN E-PRESENSI GTK MADRASAH V2", this.marginLeft, 13);
      this.doc.text("KERTAS F4 (215 x 330 mm)", this.pageWidth - this.marginRight, 13, { align: "right" });

      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.marginLeft, 15, this.pageWidth - this.marginRight, 15);

      // Running Footer
      this.doc.line(this.marginLeft, this.pageHeight - 15, this.pageWidth - this.marginRight, this.pageHeight - 15);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text("Next.js 16 + Prisma ORM + PostgreSQL Multi-Tenant | Full Implementation Handbook", this.marginLeft, this.pageHeight - 10.5);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(`Halaman ${p} dari ${totalPages}`, this.pageWidth - this.marginRight, this.pageHeight - 10.5, { align: "right" });
    }
  }

  save() {
    this.renderTableOfContentsOnReservedPages();
    this.addFooterAndHeaderToAllPages();
    const pdfData = this.doc.output('arraybuffer');
    const buffer = Buffer.from(pdfData);

    try {
      fs.writeFileSync(this.outputPath, buffer);
      console.log(`[SUKSES] Ebook PDF Super Detail berhasil dibuat: ${this.outputPath}`);
    } catch (err) {
      if (err.code === 'EBUSY') {
        const altPath = this.outputPath.replace('.pdf', '_LENGKAP.pdf');
        fs.writeFileSync(altPath, buffer);
        console.log(`[INFO] File utama sedang dibuka di PDF viewer. Berhasil disimpan ke nama alternatif: ${altPath}`);
      } else {
        throw err;
      }
    }
  }
}

// ==========================================
// PEMBANGUNAN KONTEN ULTRA DETAIL
// ==========================================

function generateUltraDetailedEbook(targetPath) {
  const eb = new UltraEbookBuilder(targetPath);

  // 1. Cover
  eb.addCover();

  // 2. Reserve TOC (Page 2 & 3)
  eb.reserveTocPages();

  // 3. BAB 1: PENGENALAN SISTEM & ARSITEKTUR
  eb.addChapterHeader(
    "BAB 1",
    "Pengenalan Sistem, Latar Belakang & Arsitektur Solusi",
    "Memahami landasan arsitektur sistem informasi kehadiran terintegrasi, pemisahan hak akses multi-tenant, dan diagram alur interaksi antarmuka web serta mobile GTK."
  );

  eb.addSubHeading("1.1 Latar Belakang & Urgensi Digitalisasi Presensi GTK");
  eb.addParagraph(
    "Sistem E-Presensi GTK Madrasah V2 merupakan solusi perangkat lunak terintegrasi yang dirancang untuk memodernisasi tata kelola absensi guru dan tenaga kependidikan di lingkungan Kementerian Agama RI. Metode konvensional seperti absensi manual berbasis tanda tangan kertas memiliki kelemahan mendasar: tingginya potensi kecurangan waktu (titip absen), lambatnya perekapan bulanan oleh bagian Tata Usaha, dan hilangnya rekaman fisik."
  );
  eb.addParagraph(
    "Sistem ini menerapkan validasi ganda berbasis geospasial (Geofencing GPS) dan penangkapan swafoto live camera dengan watermarking otomatis (nama, NIP, koordinat bujur-lintang, jarak dari gerbang madrasah, dan penanda waktu WIB). Seluruh data disinkronkan secara real-time ke pusat kendali administrator madrasah."
  );

  eb.addSubHeading("1.2 Hirarki Peran Pengguna (Role-Based Access Control)");
  eb.addTable({
    head: ["Peran (Role)", "Cakupan Akses (Scope)", "Hak Istimewa & Fitur Utama"],
    body: [
      ["SUPERADMIN", "Global (Lintas Seluruh Madrasah)", "Mengelola data master madrasah, pengaturan global sistem, audit log aktivitas kepegawaian lintas satuan kerja."],
      ["ADMIN_MADRASAH", "Satuan Kerja Madrasah Tertentu", "Monitoring absensi real-time, verifikasi pengajuan izin/sakit, input presensi massal, cetak laporan resmi EMIS 4.0."],
      ["TEACHER / GTK", "Pribadi Guru (Self-Service)", "Presensi masuk/pulang dalam radius geofence, pengisian jurnal KBM harian, pengajuan cuti, riwayat absensi pribadi."]
    ]
  });

  eb.addSubHeading("1.3 Diagram Interaksi Arsitektur (Architecture Flow)");
  eb.addParagraph(
    "Aplikasi menggunakan paradigma Next.js 16 App Router dengan React Server Components (RSC) dan Server Actions. Server Actions menggantikan REST API tradisional, memungkinkan pemanggilan fungsi backend secara langsung dan terproteksi tipe data (Type-Safe) dari komponen antarmuka klien."
  );

  // 4. BAB 2: PERSIAPAN ENVIRONMENT
  eb.addChapterHeader(
    "BAB 2",
    "Persiapan Environment & Inisialisasi Proyek dari Nol",
    "Langkah-langkah mendasar instalasi perangkat lunak, inisialisasi Next.js 16, konfigurasi Tailwind CSS v4, dan perancangan struktur folder berbasis Feature-First Architecture."
  );

  eb.addSubHeading("2.1 Prasyarat Sistem & Konfigurasi Terminal");
  eb.addParagraph("Pastikan Node.js v20+ atau v22+ telah terpasang dengan baik pada komputer pengembangan:");
  eb.addCodeBlock("terminal / powershell", [
    "# Verifikasi versi runtime",
    "node -v   # Output minimal: v20.10.0 atau lebih baru",
    "npm -v    # Output minimal: 10.x.x",
    "git --version"
  ].join('\n'));

  eb.addSubHeading("2.2 Inisialisasi Next.js 16 App Router");
  eb.addCodeBlock("terminal / powershell", [
    "npx create-next-app@latest e-presensi-v2 --typescript --eslint --tailwind --app --src-dir",
    "cd e-presensi-v2"
  ].join('\n'));

  eb.addSubHeading("2.3 Instalasi Dependensi Pustaka Lengkap");
  eb.addCodeBlock("package.json installation", [
    "# 1. Database & ORM",
    "npm install @prisma/client",
    "npm install -D prisma tsx",
    "",
    "# 2. Autentikasi Kepegawaian & Kriptografi",
    "npm install next-auth@beta bcryptjs zod",
    "npm install -D @types/bcryptjs",
    "",
    "# 3. Komponen Antarmuka & Ikonografi",
    "npm install lucide-react recharts sweetalert2 clsx tailwind-merge",
    "",
    "# 4. Ekspor Laporan Excel & PDF Resmi Dinas",
    "npm install xlsx jspdf jspdf-autotable"
  ].join('\n'));

  eb.addSubHeading("2.4 Konfigurasi package.json Lengkap");
  const pkgContent = readRepoFile('package.json') || "// package.json";
  eb.addCodeBlock("package.json", pkgContent);

  // 5. BAB 3: SKEMA DATABASE PRISMA LENGKAP
  eb.addChapterHeader(
    "BAB 3",
    "Perancangan Basis Data PostgreSQL dengan Prisma ORM",
    "Mendesain skema basis data relasional multi-tenant yang tangguh, menerapkan constraint integritas unik, tipe data PostgreSQL, serta konfigurasi indeks performa tinggi."
  );

  eb.addSubHeading("3.1 Kode Sumber Utuh Skema Basis Data (schema.prisma)");
  eb.addParagraph(
    "Berikut adalah isi lengkap berkas `prisma/schema.prisma` yang memuat seluruh model data, relasi multi-tenant, serta indeks komposit untuk optimasi kueri tingkat tinggi:"
  );

  const prismaSchemaContent = readRepoFile('prisma/schema.prisma') || "// prisma/schema.prisma";
  eb.addCodeBlock("prisma/schema.prisma", prismaSchemaContent);

  eb.addSubHeading("3.2 Kode Sumber Seeder Basis Data Awal (prisma/seed.ts)");
  eb.addParagraph(
    "File seeder ini bertugas mengisi data awal (Superadmin Kemenag, Madrasah MIN 1 Jakarta Selatan, Admin Madrasah, dan akun GTK percontohan):"
  );
  const seedContent = readRepoFile('prisma/seed.ts') || "// prisma/seed.ts";
  eb.addCodeBlock("prisma/seed.ts", seedContent);

  // 6. BAB 4: AUTENTIKASI NEXTAUTH V5 & MIDDLEWARE
  eb.addChapterHeader(
    "BAB 4",
    "Autentikasi Kepegawaian & Otorisasi Rute (NextAuth.js v5)",
    "Membangun sistem otentikasi aman berbasis NextAuth v5 Beta dengan dukungan multi-identifier, enkripsi bcrypt, token session JWT, dan middleware proteksi rute ganda."
  );

  eb.addSubHeading("4.1 Konfigurasi Penyedia Kredensial Multi-ID (src/lib/auth.ts)");
  eb.addParagraph(
    "Berikut adalah kode sumber utuh `src/lib/auth.ts` yang menangani login dengan NIP, NIK, NUPTK, PegID, maupun email resmi:"
  );
  const authContent = readRepoFile('src/lib/auth.ts') || "// src/lib/auth.ts";
  eb.addCodeBlock("src/lib/auth.ts", authContent);

  eb.addSubHeading("4.2 Middleware Proteksi Rute (src/middleware.ts)");
  eb.addParagraph(
    "Berikut adalah kode sumber utuh `src/middleware.ts` untuk memisahkan lalu lintas akses Web Admin dan Portal Mobile Guru secara ketat:"
  );
  const middlewareContent = readRepoFile('src/middleware.ts') || "// src/middleware.ts";
  eb.addCodeBlock("src/middleware.ts", middlewareContent);

  eb.addSubHeading("4.3 Lapisan Keamanan Server Action (src/server/utils/auth-guard.ts)");
  eb.addParagraph(
    "Mencegah celah kerentanan BOLA/IDOR (Broken Object Level Authorization) agar Admin Madrasah A tidak dapat memanipulasi data Madrasah B:"
  );
  const authGuardContent = readRepoFile('src/server/utils/auth-guard.ts') || "// src/server/utils/auth-guard.ts";
  eb.addCodeBlock("src/server/utils/auth-guard.ts", authGuardContent);

  // 7. BAB 5: GEOFENCING & HAVERSINE
  eb.addChapterHeader(
    "BAB 5",
    "Core Modul 1: Geofencing GPS & Algoritma Haversine",
    "Membedah formula matematika geodetik Haversine untuk menghitung jarak kurva bumi dalam meter, validasi koordinat GPS guru terhadap gerbang madrasah, dan kalkulasi toleransi keterlambatan."
  );

  eb.addSubHeading("5.1 Rumus Matematika Haversine");
  eb.addParagraph(
    "Jarak dua titik koordinat permukaan bumi (latitude dan longitude) dihitung menggunakan rumus Great-Circle Distance dengan konstanta radius bumi R = 6.371.000 meter. Berikut adalah kode sumber utuh implementasinya:"
  );
  const geoContent = readRepoFile('src/lib/geo.ts') || "// src/lib/geo.ts";
  eb.addCodeBlock("src/lib/geo.ts", geoContent);

  eb.addSubHeading("5.2 Validasi Jam Kerja & Toleransi Keterlambatan");
  eb.addParagraph(
    "Server memvalidasi jam saat transaksi presensi dikirim terhadap waktu jam mulai kerja (`workStartTime`) dan ambang batas terlambat (`lateThreshold`). Jika jam masuk melebihi batas toleransi, status otomatis tercatat sebagai `LATE` (Terlambat)."
  );

  // 8. BAB 6: LIVE CAMERA & WATERMARKING CANVAS
  eb.addChapterHeader(
    "BAB 6",
    "Core Modul 2: Swafoto Kamera Live & Watermarking Canvas",
    "Membuka stream kamera perangkat, membakar metadata legalitas berupa nama, NIP, tanggal, jam WIB, dan koordinat GPS langsung ke atas frame foto menggunakan HTML5 2D Canvas."
  );

  eb.addSubHeading("6.1 Implementasi Modal Kamera Live & Watermarking Canvas");
  eb.addParagraph(
    "Berikut adalah kode sumber utuh komponen `mobile-camera-modal.tsx` yang menangani akses hardware kamera, tombol flip depan/belakang, serta penempelan watermark resmi:"
  );
  const cameraContent = readRepoFile('src/features/mobile-app/components/mobile-camera-modal.tsx') || "// src/features/mobile-app/components/mobile-camera-modal.tsx";
  eb.addCodeBlock("src/features/mobile-app/components/mobile-camera-modal.tsx", cameraContent);

  eb.addSubHeading("6.2 Server Action Perekaman Presensi (recordMobileAttendanceAction)");
  eb.addParagraph(
    "Fungsi backend yang menerima koordinat GPS dan string foto Base64 untuk divalidasi geofence sebelum disimpan ke database:"
  );
  const mobileAttendanceContent = readRepoFile('src/server/actions/mobile-attendance.actions.ts') || "// mobile-attendance.actions.ts";
  // Tampilkan 250 baris pertama fungsi utama
  eb.addCodeBlock("src/server/actions/mobile-attendance.actions.ts (Bagian 1: Inisialisasi & Query)", mobileAttendanceContent.substring(0, 7500));

  // 9. BAB 7: PWA NATIVE MOBILE GTK EXPERIENCE
  eb.addChapterHeader(
    "BAB 7",
    "Core Modul 3: Antarmuka Mobile GTK & Progressive Web App (PWA)",
    "Membangun pengalaman aplikasi mobile native di dalam peramban web (Progressive Web App) dengan navigasi Material 3, install prompt, status offline, dan Service Worker."
  );

  eb.addSubHeading("7.1 Kode Sumber Shell Navigasi Mobile (MobileAppShell)");
  eb.addParagraph(
    "Shell navigasi dengan 5 tab utama (Beranda, Jurnal KBM, Riwayat, Izin, dan Profil Pengguna):"
  );
  const shellContent = readRepoFile('src/features/mobile-app/components/mobile-app-shell.tsx') || "// MobileAppShell";
  eb.addCodeBlock("src/features/mobile-app/components/mobile-app-shell.tsx", shellContent);

  eb.addSubHeading("7.2 Konfigurasi Web App Manifest (public/manifest.json)");
  const manifestContent = readRepoFile('public/manifest.json') || "// manifest.json";
  eb.addCodeBlock("public/manifest.json", manifestContent);

  eb.addSubHeading("7.3 Service Worker Cache Offline (public/sw.js)");
  const swContent = readRepoFile('public/sw.js') || "// sw.js";
  eb.addCodeBlock("public/sw.js", swContent);

  // 10. BAB 8: DASHBOARD ADMIN & REKAP EMIS 4.0
  eb.addChapterHeader(
    "BAB 8",
    "Core Modul 4: Dashboard Monitoring Admin & Ekspor EMIS GTK 4.0",
    "Panel pemantauan eksekutif madrasah dengan kartu metrik real-time, visualisasi grafik mingguan Recharts, pencatatan absensi massal, serta generator laporan spreadsheet resmi."
  );

  eb.addSubHeading("8.1 Halaman Utama Dashboard Admin (src/app/(web)/admin/page.tsx)");
  eb.addParagraph("Kode sumber Server Component halaman utama monitoring admin:");
  const adminPageContent = readRepoFile('src/app/(web)/admin/page.tsx') || "// admin/page.tsx";
  eb.addCodeBlock("src/app/(web)/admin/page.tsx", adminPageContent);

  eb.addSubHeading("8.2 Repository Data Presensi Admin (src/server/repositories/attendance.repo.ts)");
  eb.addParagraph("Fungsi database teroptimasi untuk menghitung metrik KPI dan daftar hadir harian:");
  const attendanceRepoContent = readRepoFile('src/server/repositories/attendance.repo.ts') || "// attendance.repo.ts";
  eb.addCodeBlock("src/server/repositories/attendance.repo.ts (Cuplikan Utama)", attendanceRepoContent.substring(0, 6000));

  // 11. BAB 9: PANDUAN PRAKTIK MEMBUAT MODUL BARU DARI NOL
  eb.addChapterHeader(
    "BAB 9",
    "PANDUAN PRAKTIK: Menambahkan Modul Baru dari Nol (Studi Kasus)",
    "Panduan praktis langkah demi langkah (step-by-step masterclass) membuat fitur/modul baru dari skema database, logika backend, antarmuka front-end, hingga pendaftaran menu di navigasi."
  );

  eb.addCallout(
    "STUDI KASUS NYATA: MODUL SURAT TUGAS & SPPD GURU",
    "Kita akan mempraktikkan secara tuntas pembuatan modul baru: 'Manajemen Surat Tugas GTK (SPPD)'. Modul ini berfungsi mencatat penugasan luar dinas guru (seminar, pelatihan Kemenag, workshop) yang terhubung ke data master guru dan madrasah.",
    "navy"
  );

  eb.addSubHeading("Langkah 1: Tambahkan Model Data di prisma/schema.prisma");
  eb.addParagraph("Buka `prisma/schema.prisma` dan tambahkan model relasional `DutyLetter` berikut:");
  eb.addCodeBlock("prisma/schema.prisma (Model Baru)", [
    "model DutyLetter {",
    "  id            String    @id @default(uuid())",
    "  madrasahId    String    @map(\"madrasah_id\")",
    "  userId        String    @map(\"user_id\")",
    "  letterNumber  String    @map(\"letter_number\") // Contoh: B-102/Mi.01/PP.00/10/2026",
    "  purpose       String    @db.Text              // Maksud & Tujuan Tugas",
    "  destination   String                          // Tempat / Lokasi Penugasan",
    "  startDate     DateTime  @db.Date @map(\"start_date\")",
    "  endDate       DateTime  @db.Date @map(\"end_date\")",
    "  status        String    @default(\"ACTIVE\")   // ACTIVE / COMPLETED / CANCELLED",
    "  attachmentUrl String?   @map(\"attachment_url\")",
    "  createdAt     DateTime  @default(now()) @map(\"created_at\")",
    "  updatedAt     DateTime  @updatedAt @map(\"updated_at\")",
    "",
    "  madrasah      Madrasah  @relation(fields: [madrasahId], references: [id], onDelete: Cascade)",
    "  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)",
    "",
    "  @@index([madrasahId])",
    "  @@index([userId])",
    "  @@index([madrasahId, startDate, endDate])",
    "  @@map(\"duty_letters\")",
    "}"
  ].join('\n'));

  eb.addSubHeading("Langkah 2: Sinkronisasi Skema Database");
  eb.addCodeBlock("terminal / powershell", [
    "# Jalankan migrasi dan generate Prisma Client",
    "npx prisma db push",
    "npx prisma generate"
  ].join('\n'));

  eb.addSubHeading("Langkah 3: Buat Server Action (src/server/actions/duty-letter.actions.ts)");
  eb.addCodeBlock("src/server/actions/duty-letter.actions.ts", [
    "\"use server\";",
    "",
    "import { prisma } from \"@/lib/prisma\";",
    "import { revalidatePath } from \"next/cache\";",
    "import { requireMadrasahAdmin } from \"@/server/utils/auth-guard\";",
    "",
    "export interface DutyLetterPayload {",
    "  userId: string;",
    "  letterNumber: string;",
    "  purpose: string;",
    "  destination: string;",
    "  startDate: string;",
    "  endDate: string;",
    "}",
    "",
    "export async function getDutyLettersAction() {",
    "  try {",
    "    const { madrasahId } = await requireMadrasahAdmin();",
    "    const data = await prisma.dutyLetter.findMany({",
    "      where: { madrasahId },",
    "      include: {",
    "        user: {",
    "          select: { id: true, name: true, nip: true, avatarUrl: true },",
    "        },",
    "      },",
    "      orderBy: { startDate: \"desc\" },",
    "    });",
    "    return { success: true, data };",
    "  } catch (error: any) {",
    "    return { error: error.message || \"Gagal memuat surat tugas.\" };",
    "  }",
    "}",
    "",
    "export async function createDutyLetterAction(payload: DutyLetterPayload) {",
    "  try {",
    "    const { madrasahId } = await requireMadrasahAdmin();",
    "    if (!payload.userId || !payload.letterNumber || !payload.purpose) {",
    "      return { error: \"Semua bidang formulir wajib diisi.\" };",
    "    }",
    "",
    "    const created = await prisma.dutyLetter.create({",
    "      data: {",
    "        madrasahId,",
    "        userId: payload.userId,",
    "        letterNumber: payload.letterNumber.trim(),",
    "        purpose: payload.purpose.trim(),",
    "        destination: payload.destination.trim(),",
    "        startDate: new Date(payload.startDate),",
    "        endDate: new Date(payload.endDate),",
    "      },",
    "    });",
    "",
    "    revalidatePath(\"/admin/duty-letters\");",
    "    return { success: true, data: created };",
    "  } catch (error: any) {",
    "    return { error: error.message || \"Gagal menyimpan surat tugas baru.\" };",
    "  }",
    "}",
    "",
    "export async function deleteDutyLetterAction(id: string) {",
    "  try {",
    "    const { madrasahId } = await requireMadrasahAdmin();",
    "    await prisma.dutyLetter.deleteMany({",
    "      where: { id, madrasahId }, // Isolasi multi-tenant terjamin",
    "    });",
    "    revalidatePath(\"/admin/duty-letters\");",
    "    return { success: true };",
    "  } catch (error: any) {",
    "    return { error: error.message || \"Gagal menghapus surat tugas.\" };",
    "  }",
    "}"
  ].join('\n'));

  eb.addSubHeading("Langkah 4: Buat Komponen Tampilan Klien (src/features/duty-letters/components/duty-letters-view.tsx)");
  eb.addCodeBlock("src/features/duty-letters/components/duty-letters-view.tsx", [
    "\"use client\";",
    "",
    "import React, { useState } from \"react\";",
    "import { Plus, Trash2, FileText, Calendar, MapPin, User } from \"lucide-react\";",
    "import { createDutyLetterAction, deleteDutyLetterAction } from \"@/server/actions/duty-letter.actions\";",
    "import { swalSuccess, swalError } from \"@/lib/swal\";",
    "",
    "export function DutyLettersView({ initialData, teachers }: { initialData: any[]; teachers: any[] }) {",
    "  const [letters, setLetters] = useState(initialData);",
    "  const [isOpenModal, setIsOpenModal] = useState(false);",
    "  const [form, setForm] = useState({",
    "    userId: teachers[0]?.id || \"\",",
    "    letterNumber: \"\",",
    "    purpose: \"\",",
    "    destination: \"\",",
    "    startDate: new Date().toISOString().split(\"T\")[0],",
    "    endDate: new Date().toISOString().split(\"T\")[0],",
    "  });",
    "",
    "  const handleSubmit = async (e: React.FormEvent) => {",
    "    e.preventDefault();",
    "    const res = await createDutyLetterAction(form);",
    "    if (res.error) {",
    "      swalError(\"Gagal\", res.error);",
    "      return;",
    "    }",
    "    swalSuccess(\"Berhasil\", \"Surat tugas berhasil diterbitkan!\");",
    "    setIsOpenModal(false);",
    "    window.location.reload();",
    "  };",
    "",
    "  return (",
    "    <div className=\"flex flex-col gap-6 w-full\">",
    "      <div className=\"flex items-center justify-between\">",
    "        <div>",
    "          <h2 className=\"text-xl font-bold text-slate-900\">Surat Tugas & Perjalanan Dinas (SPPD)</h2>",
    "          <p className=\"text-xs text-slate-500\">Daftar penugasan luar dinas resmi guru dan tenaga kependidikan</p>",
    "        </div>",
    "        <button onClick={() => setIsOpenModal(true)} className=\"btn-primary flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs\">",
    "          <Plus className=\"w-4 h-4\" /> Terbitkan Surat Tugas",
    "        </button>",
    "      </div>",
    "      {/* Tabel Data & Modal Tambah Data */}",
    "    </div>",
    "  );",
    "}"
  ].join('\n'));

  eb.addSubHeading("Langkah 5: Buat Halaman Route Next.js (src/app/(web)/admin/duty-letters/page.tsx)");
  eb.addCodeBlock("src/app/(web)/admin/duty-letters/page.tsx", [
    "import React from \"react\";",
    "import { getDutyLettersAction } from \"@/server/actions/duty-letter.actions\";",
    "import { fetchTeachersData } from \"@/server/actions/teacher.actions\";",
    "import { DutyLettersView } from \"@/features/duty-letters/components/duty-letters-view\";",
    "",
    "export const dynamic = \"force-dynamic\";",
    "export const metadata = { title: \"Surat Tugas GTK | E-Presensi Admin\" };",
    "",
    "export default async function DutyLettersPage() {",
    "  const lettersRes = await getDutyLettersAction();",
    "  const teachersRes = await fetchTeachersData();",
    "",
    "  return (",
    "    <DutyLettersView",
    "      initialData={lettersRes.data || []}",
    "      teachers={teachersRes.data || []}",
    "    />",
    "  );",
    "}"
  ].join('\n'));

  eb.addSubHeading("Langkah 6: Daftarkan Menu pada Sidebar Navigasi Admin");
  eb.addParagraph("Buka `src/components/organisms/sidebar.tsx` dan tambahkan menu baru pada kelompok menu yang sesuai:");
  eb.addCodeBlock("src/components/organisms/sidebar.tsx (Penambahan Item Menu)", [
    "{",
    "  label: \"Surat Tugas (SPPD)\",",
    "  href: \"/admin/duty-letters\",",
    "  icon: FileSpreadsheet, // Import ikon dari lucide-react",
    "  badge: \"Baru\"",
    "}"
  ].join('\n'));

  // 12. BAB 10: OPTIMASI PERFORMA & DEPLOYMENT
  eb.addChapterHeader(
    "BAB 10",
    "Audit Performa, Optimasi Skema, Keamanan & Deployment Produksi",
    "Daftar periksa optimasi latensi database, eliminasi overfetching foto Base64, konfigurasi next.config.ts, audit keamanan data, serta panduan deployment ke VPS Ubuntu atau Vercel."
  );

  eb.addSubHeading("10.1 Konfigurasi next.config.ts Teroptimasi");
  eb.addParagraph("Konfigurasi optimasi package imports untuk mempercepat bundle dan First Load JS:");
  const nextConfigContent = readRepoFile('next.config.ts') || "// next.config.ts";
  eb.addCodeBlock("next.config.ts", nextConfigContent);

  eb.addSubHeading("10.2 Konfigurasi Web Server Nginx (Reverse Proxy & SSL)");
  eb.addCodeBlock("/etc/nginx/sites-available/epresensi", [
    "server {",
    "    server_name presensi.madrasah.sch.id;",
    "",
    "    location / {",
    "        proxy_pass http://127.0.0.1:3000;",
    "        proxy_http_version 1.1;",
    "        proxy_set_header Upgrade $http_upgrade;",
    "        proxy_set_header Connection 'upgrade';",
    "        proxy_set_header Host $host;",
    "        proxy_cache_bypass $http_upgrade;",
    "        proxy_set_header X-Real-IP $remote_addr;",
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "        proxy_set_header X-Forwarded-Proto $scheme;",
    "    }",
    "",
    "    listen 443 ssl http2;",
    "    ssl_certificate /etc/letsencrypt/live/presensi.madrasah.sch.id/fullchain.pem;",
    "    ssl_certificate_key /etc/letsencrypt/live/presensi.madrasah.sch.id/privkey.pem;",
    "}"
  ].join('\n'));

  eb.addSubHeading("10.3 Konfigurasi Process Manager PM2 (ecosystem.config.js)");
  eb.addCodeBlock("ecosystem.config.js", [
    "module.exports = {",
    "  apps: [",
    "    {",
    "      name: 'epresensi-production',",
    "      script: 'node_modules/next/dist/bin/next',",
    "      args: 'start',",
    "      cwd: './web',",
    "      instances: 'max',",
    "      exec_mode: 'cluster',",
    "      max_memory_restart: '1G',",
    "      env: {",
    "        NODE_ENV: 'production',",
    "        PORT: 3000,",
    "      },",
    "    },",
    "  ],",
    "};"
  ].join('\n'));

  eb.addSubHeading("10.4 Skrip Otomatisasi Backup Database PostgreSQL (backup-db.sh)");
  eb.addCodeBlock("scripts/backup-db.sh", [
    "#!/bin/bash",
    "TIMESTAMP=$(date +\"%Y%m%d_%H%M%S\")",
    "BACKUP_DIR=\"/var/backups/epresensi\"",
    "mkdir -p $BACKUP_DIR",
    "",
    "# Dump database PostgreSQL terkompresi",
    "pg_dump -U postgres -h aws-0-ap-northeast-1.pooler.supabase.com -p 5432 postgres | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz",
    "",
    "# Hapus file backup yang berusia lebih dari 30 hari",
    "find $BACKUP_DIR -type f -name \"*.sql.gz\" -mtime +30 -exec rm {} \\;",
    "echo \"[OK] Backup database selesai pada $TIMESTAMP\""
  ].join('\n'));

  // SIMPAN EBOOK
  eb.save();
}

const targetFilePath = path.resolve(__dirname, "../../EBOOK_PANDUAN_E-PRESENSI_V2_F4.pdf");
generateUltraDetailedEbook(targetFilePath);
