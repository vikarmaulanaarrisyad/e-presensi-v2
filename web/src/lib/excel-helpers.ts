import * as XLSX from "xlsx";

export interface ParsedTeacherRow {
  index: number;
  name: string;
  nip: string;
  email: string;
  phone: string;
  password?: string;
  isValid: boolean;
  errorReason?: string;
}

/**
 * Downloads a pre-formatted Excel template for importing teachers
 */
export function downloadTeacherTemplate() {
  const headers = [
    "Nama Lengkap",
    "NIP / NIK",
    "Email",
    "Nomor WhatsApp",
    "Password Awal",
  ];

  const sampleData = [
    [
      "Drs. H. Muhammad Zain, M.Pd.I",
      "197508122002121003",
      "zain.guru@kemenag.go.id",
      "081234567890",
      "Password123!",
    ],
    [
      "Fathimatuz Zahra, S.Pd",
      "199304152019032015",
      "zahra.guru@kemenag.go.id",
      "081298765432",
      "Password123!",
    ],
    [
      "Ustadz Abdul Somad, Lc",
      "", // Contoh guru non-PNS / tanpa NIP
      "somad.guru@kemenag.go.id",
      "085712345678",
      "Password123!",
    ],
  ];

  const worksheetData = [headers, ...sampleData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 35 }, // Nama Lengkap
    { wch: 24 }, // NIP / NIK
    { wch: 30 }, // Email
    { wch: 18 }, // Nomor WhatsApp
    { wch: 16 }, // Password Awal
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Format Import Guru");

  // Generate file and trigger download in browser
  XLSX.writeFile(workbook, "Template_Import_Guru_Madrasah.xlsx");
}

/**
 * Exports current teachers data to an Excel spreadsheet
 */
export function exportTeachersToExcel(teachers: any[], madrasahName: string) {
  const headers = [
    "No",
    "Nama Lengkap",
    "NIP / NIK",
    "Email Akun",
    "Nomor Telepon",
    "Status Akun",
    "Total Presensi",
    "Tanggal Didaftarkan",
  ];

  const rows = teachers.map((t, idx) => [
    idx + 1,
    t.name,
    t.nip || "-",
    t.email,
    t.phone || "-",
    t.isActive ? "Aktif" : "Non-Aktif",
    t._count?.attendanceLogs || 0,
    new Date(t.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 15 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru");

  const sanitizedMadrasah = madrasahName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Data_Guru_${sanitizedMadrasah}_${new Date().toISOString().split("T")[0]}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Reads and parses an uploaded Excel file on the client side
 */
export async function parseTeacherExcelFile(file: File): Promise<{
  rows: ParsedTeacherRow[];
  validCount: number;
  invalidCount: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("File Excel tidak memiliki lembar kerja (worksheet).");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawJson.length < 2) {
          throw new Error("File Excel kosong atau hanya memiliki baris header.");
        }

        const headerRow = rawJson[0].map((h: any) => String(h || "").trim().toLowerCase());

        // Map column indices
        const nameIdx = headerRow.findIndex((h) => h.includes("nama"));
        const nipIdx = headerRow.findIndex((h) => h.includes("nip") || h.includes("nik"));
        const emailIdx = headerRow.findIndex((h) => h.includes("email") || h.includes("surel"));
        const phoneIdx = headerRow.findIndex(
          (h) => h.includes("phone") || h.includes("telp") || h.includes("hp") || h.includes("whatsapp") || h.includes("wa")
        );
        const passIdx = headerRow.findIndex(
          (h) => h.includes("pass") || h.includes("sandi")
        );

        if (nameIdx === -1 || emailIdx === -1) {
          throw new Error(
            "Kolom 'Nama Lengkap' dan 'Email' wajib ada pada baris pertama file Excel."
          );
        }

        const rows: ParsedTeacherRow[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === "")) {
            continue; // Skip empty rows
          }

          const rawName = String(row[nameIdx] || "").trim();
          const rawNip = nipIdx !== -1 ? String(row[nipIdx] || "").trim() : "";
          const rawEmail = String(row[emailIdx] || "").trim().toLowerCase();
          const rawPhone = phoneIdx !== -1 ? String(row[phoneIdx] || "").trim() : "";
          const rawPass = passIdx !== -1 ? String(row[passIdx] || "").trim() : "";

          // Validation
          let isValid = true;
          let errorReason = "";

          if (!rawName) {
            isValid = false;
            errorReason = "Nama lengkap kosong";
          } else if (!rawEmail) {
            isValid = false;
            errorReason = "Alamat email kosong";
          } else if (!rawEmail.includes("@") || !rawEmail.includes(".")) {
            isValid = false;
            errorReason = "Format email tidak valid";
          }

          if (isValid) {
            validCount++;
          } else {
            invalidCount++;
          }

          rows.push({
            index: i,
            name: rawName,
            nip: rawNip,
            email: rawEmail,
            phone: rawPhone,
            password: rawPass || "Password123!",
            isValid,
            errorReason,
          });
        }

        resolve({ rows, validCount, invalidCount });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca file Excel."));
    };

    reader.readAsArrayBuffer(file);
  });
}
