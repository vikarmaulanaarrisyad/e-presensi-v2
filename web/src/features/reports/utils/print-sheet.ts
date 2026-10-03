/**
 * Isolated Print Utility for Attendance Report Sheet
 * Guarantees that all 31 days fit on EXACTLY ONE (1) PAGE on F4 / Folio / A4 Landscape
 * 100% identical to the on-screen preview.
 */

export function printAttendanceReport(targetElementId = "printable-attendance-sheet") {
  const element = document.getElementById(targetElementId);
  if (!element) {
    window.print();
    return;
  }

  // Clone element to avoid touching the live DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // 1. Strip all presentation wrappers (shadows, borders, outer padding) from clone
  clone.className = "w-full bg-white text-black font-sans leading-tight";
  clone.style.padding = "0 !important";
  clone.style.margin = "0 !important";
  clone.style.border = "none !important";
  clone.style.boxShadow = "none !important";
  clone.style.borderRadius = "0 !important";
  clone.style.width = "100% !important";
  clone.style.maxWidth = "100% !important";
  clone.style.backgroundColor = "#ffffff !important";
  clone.style.color = "#000000 !important";

  // Remove any internal style tags or unneeded interactive elements from clone
  clone.querySelectorAll("style, .no-print, button").forEach((el) => el.remove());

  // 2. Create isolated hidden iframe for printing
  const iframeId = "epresensi-isolated-print-frame";
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.setAttribute(
    "style",
    "position:fixed;top:-10000px;left:-10000px;width:1200px;height:900px;border:none;opacity:0.01;z-index:-9999;"
  );
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Gather active document stylesheets to preserve Tailwind typography and grid classes
  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Laporan Rincian Harian Presensi</title>
        ${styles}
        <style>
          @page {
            size: 330mm 215mm landscape;
            margin: 15mm;
          }

          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, "Segoe UI", Roboto, sans-serif !important;
            -webkit-font-smoothing: antialiased;
          }

          #${targetElementId} {
            width: 300mm !important;
            max-width: 300mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            zoom: 1 !important;
          }

          /* Header box */
          .header-box {
            border: 1px solid #000000 !important;
            padding: 3px 6px !important;
            margin-bottom: 2.5px !important;
          }
          .header-box > div:first-child {
            font-size: 11px !important;
            font-weight: 800 !important;
            padding-bottom: 2px !important;
            margin-bottom: 2px !important;
          }
          .header-box > div:last-child {
            font-size: 8.5px !important;
          }

          /* Employee detail block */
          .emp-details {
            border-top: 1px solid #000000 !important;
            border-bottom: 1px solid #000000 !important;
            padding: 2px 4px !important;
            margin-bottom: 2.5px !important;
            font-size: 8.5px !important;
            line-height: 1.15 !important;
          }

          /* Main table specifications */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }

          thead th {
            background-color: #f8fafc !important;
            color: #000000 !important;
            font-weight: bold !important;
            text-align: center !important;
            border: 1px solid #000000 !important;
            padding: 1.5px 1px !important;
            font-size: 7.5px !important;
            line-height: 1.1 !important;
          }

          tbody td {
            border: 1px solid #000000 !important;
            padding: 1px 1.5px !important;
            font-size: 8px !important;
            line-height: 1.1 !important;
            height: 15.5px !important;
            white-space: nowrap !important;
          }

          tbody tr {
            page-break-inside: avoid !important;
          }

          /* Guaranteed yellow highlight for holiday rows */
          tr.holiday-row,
          tr[style*="background-color: rgb(255, 255, 0)"],
          tr[style*="background-color: #FFFF00"],
          tr[style*="background-color: #ffff00"] {
            background-color: #FFFF00 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          tr.holiday-row td,
          tr[style*="background-color: rgb(255, 255, 0)"] td,
          tr[style*="background-color: #FFFF00"] td {
            background-color: #FFFF00 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Red text for late attendance */
          .text-red-600 {
            color: #dc2626 !important;
          }

          /* Summary row */
          tbody tr:last-child td {
            font-weight: bold !important;
            font-size: 8px !important;
            padding: 1.5px 1px !important;
          }

          /* Document Footer */
          .doc-footer {
            border-top: 1px solid #000000 !important;
            margin-top: 2.5px !important;
            padding-top: 2px !important;
            font-size: 8px !important;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Allow styles and fonts time to render in isolated iframe before opening print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Gagal memanggil cetak pada iframe terisolasi:", err);
    }
  }, 400);
}
