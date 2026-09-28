import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportReportToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Elemen lembar presensi tidak ditemukan untuk diekspor.");
  }

  // Generate high-resolution canvas of the printable sheet
  const canvas = await html2canvas(element, {
    scale: 2, // 2x sharp crisp text
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");

  // Format F4 / Folio (215 mm x 330 mm) Landscape
  // jsPDF orientation: 'landscape', format: [height, width]
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [215, 330],
  });

  // Margin 1.5 cm = 15 mm
  const margin = 15;
  const printableWidth = 330 - margin * 2; // 300 mm
  const printableHeight = 215 - margin * 2; // 185 mm

  // Calculate scaled height based on aspect ratio
  const imgWidth = printableWidth;
  let imgHeight = (canvas.height * printableWidth) / canvas.width;

  if (imgHeight > printableHeight) {
    const scale = printableHeight / imgHeight;
    const finalWidth = imgWidth * scale;
    const finalHeight = printableHeight;
    const offsetX = margin + (printableWidth - finalWidth) / 2;
    pdf.addImage(imgData, "PNG", offsetX, margin, finalWidth, finalHeight);
  } else {
    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
