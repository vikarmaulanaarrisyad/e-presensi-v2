import * as XLSX from "xlsx";

export interface ParsedTeacherRow {
  index: number;
  name: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  fullNameDisplay: string;
  pegId?: string;
  nuptk?: string;
  nip?: string;
  nik?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  gender?: string; // "L" | "P"
  statusKepegawaian?: string;
  jenisGtk?: string;
  email: string;
  phone?: string;
  password?: string;
  isValid: boolean;
  errorReason?: string;
}

/**
 * Normalizes Date string or Excel serial number into YYYY-MM-DD
 */
export function parseExcelDate(val: any): string | null {
  if (val === undefined || val === null || val === "") return null;

  // Handle Excel Serial Number (e.g., 34567)
  if (typeof val === "number" && !isNaN(val)) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, "0");
    const d = ymd[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Normalizes gender input into "L" or "P"
 */
export function normalizeGender(val: any): string {
  if (!val) return "";
  const s = String(val).trim().toUpperCase();
  if (s.startsWith("L") || s.includes("LAKI") || s.includes("PRIA")) return "L";
  if (s.startsWith("P") || s.includes("PEREMPUAN") || s.includes("WANITA")) return "P";
  return s;
}

/**
 * Format complete teacher name with front and back degrees
 */
export function formatTeacherName(
  name: string,
  gelarDepan?: string | null,
  gelarBelakang?: string | null
): string {
  const cleanName = (name || "").trim();
  const cleanGelarDepan = (gelarDepan || "").trim();
  const cleanGelarBelakang = (gelarBelakang || "").trim();

  let formatted = cleanName;
  if (cleanGelarDepan) {
    formatted = `${cleanGelarDepan} ${formatted}`;
  }
  if (cleanGelarBelakang) {
    formatted = `${formatted}, ${cleanGelarBelakang}`;
  }
  return formatted;
}

/**
 * Strips leading quotes (single quote ', backtick `, or double quote ")
 * commonly placed by Excel/EMIS exports to force text mode on numbers (PegID, NUPTK, NIK, NIP)
 */
export function stripLeadingQuote(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val)
    .trim()
    .replace(/^['"`\s]+/, "")
    .replace(/['"`\s]+$/, "")
    .trim();
}

/**
 * Masks NIK (Nomor Induk Kependudukan 16 digit) with asterisks for data security & privacy
 * e.g., "3507123456780001" -> "3507********0001"
 */
export function maskNik(nik?: string | null): string {
  if (!nik) return "-";
  const clean = stripLeadingQuote(nik);
  if (!clean || clean === "-") return "-";
  if (clean.length <= 4) return "****";
  if (clean.length < 8) {
    return clean.slice(0, 2) + "*".repeat(clean.length - 2);
  }
  const first = clean.slice(0, 4);
  const last = clean.slice(-4);
  const middleMask = "*".repeat(Math.max(4, clean.length - 8));
  return `${first}${middleMask}${last}`;
}

/**
 * Downloads an official EMIS 4.0 / Simpatika GTK compatible Excel template
 */
export function downloadTeacherTemplate() {
  const headers = [
    "Peg ID",
    "NUPTK",
    "Gelar Depan",
    "Nama Lengkap",
    "Gelar Belakang",
    "NIP",
    "NIK",
    "Tempat Lahir",
    "Tanggal Lahir (YYYY-MM-DD)",
    "Jenis Kelamin (L/P)",
    "Status Kepegawaian",
    "Jenis GTK / Jabatan",
    "Nomor WhatsApp / HP",
    "Email Akun",
    "Password Awal",
  ];

  const sampleData = [
    [
      "205400018921",
      "1234567890123456",
      "Dr. H.",
      "Muhammad Zain",
      "M.Pd.I",
      "197508122002121003",
      "3507121208750001",
      "Malang",
      "1975-08-12",
      "L",
      "PNS",
      "Kepala Madrasah",
      "081234567890",
      "zain.guru@kemenag.go.id",
      "Password123!",
    ],
    [
      "205400029310",
      "8765432109876543",
      "",
      "Fathimatuz Zahra",
      "S.Pd",
      "199304152019032015",
      "3507155504930002",
      "Surabaya",
      "1993-04-15",
      "P",
      "PPPK",
      "Guru Mapel",
      "081298765432",
      "zahra.guru@kemenag.go.id",
      "Password123!",
    ],
    [
      "205400038829",
      "",
      "Ustadz",
      "Abdul Somad",
      "Lc., M.A.",
      "", // Non-PNS
      "3507201010890003",
      "Kediri",
      "1989-10-10",
      "L",
      "GTY / Non-PNS",
      "Guru Kelas",
      "085712345678",
      "somad.guru@madrasah.id",
      "Password123!",
    ],
  ];

  const worksheetData = [headers, ...sampleData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Column widths
  worksheet["!cols"] = [
    { wch: 16 }, // Peg ID
    { wch: 18 }, // NUPTK
    { wch: 12 }, // Gelar Depan
    { wch: 28 }, // Nama Lengkap
    { wch: 16 }, // Gelar Belakang
    { wch: 22 }, // NIP
    { wch: 20 }, // NIK
    { wch: 16 }, // Tempat Lahir
    { wch: 22 }, // Tanggal Lahir
    { wch: 18 }, // Jenis Kelamin
    { wch: 18 }, // Status Kepegawaian
    { wch: 22 }, // Jenis GTK
    { wch: 20 }, // No WA
    { wch: 28 }, // Email
    { wch: 16 }, // Password
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Format EMIS GTK");

  XLSX.writeFile(workbook, "Template_Import_EMISGTK_Kemenag.xlsx");
}

/**
 * Exports current teachers data with complete EMIS 4.0 attributes
 */
export function exportTeachersToExcel(teachers: any[], madrasahName: string) {
  const headers = [
    "No",
    "Peg ID",
    "NUPTK",
    "Gelar Depan",
    "Nama Lengkap",
    "Gelar Belakang",
    "Nama & Gelar Lengkap",
    "NIP",
    "NIK",
    "Tempat Lahir",
    "Tanggal Lahir",
    "Jenis Kelamin",
    "Status Kepegawaian",
    "Jenis GTK / Jabatan",
    "Email Akun",
    "Nomor Telepon / WA",
    "Status Akun",
    "Total Presensi",
    "Tanggal Didaftarkan",
  ];

  const rows = teachers.map((t, idx) => [
    idx + 1,
    t.pegId || "-",
    t.nuptk || "-",
    t.gelarDepan || "",
    t.name || "",
    t.gelarBelakang || "",
    formatTeacherName(t.name, t.gelarDepan, t.gelarBelakang),
    t.nip || "-",
    maskNik(t.nik),
    t.tempatLahir || "-",
    t.tanggalLahir
      ? new Date(t.tanggalLahir).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-",
    t.gender ? (t.gender.toUpperCase().startsWith("L") ? "Laki-laki" : "Perempuan") : "-",
    t.statusKepegawaian || "-",
    t.position?.name || t.jenisGtk || "Guru Madrasah",
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
    { wch: 6 },  // No
    { wch: 16 }, // Peg ID
    { wch: 18 }, // NUPTK
    { wch: 12 }, // Gelar Depan
    { wch: 24 }, // Nama
    { wch: 14 }, // Gelar Belakang
    { wch: 32 }, // Nama & Gelar
    { wch: 22 }, // NIP
    { wch: 20 }, // NIK
    { wch: 16 }, // Tempat Lahir
    { wch: 14 }, // Tgl Lahir
    { wch: 14 }, // Gender
    { wch: 18 }, // Status
    { wch: 22 }, // Jenis GTK
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 12 }, // Status Akun
    { wch: 14 }, // Presensi
    { wch: 18 }, // Tgl Daftar
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru EMIS GTK");

  const sanitizedMadrasah = madrasahName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Data_Guru_EMISGTK_${sanitizedMadrasah}_${new Date().toISOString().split("T")[0]}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Reads and parses an uploaded Excel file on the client side
 * Intelligently handles:
 * 1. Direct unduhan Excel dari EMIS 4.0 / Simpatika Kemenag
 * 2. Template standar aplikasi
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

        // Find header row (some EMIS exports have title at row 0 or 1)
        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(5, rawJson.length); r++) {
          const rowStr = (rawJson[r] || []).map((c) => String(c || "").toLowerCase()).join(" ");
          if (rowStr.includes("nama") || rowStr.includes("peg id") || rowStr.includes("nuptk") || rowStr.includes("nip")) {
            headerRowIndex = r;
            break;
          }
        }

        const headerRow = (rawJson[headerRowIndex] || []).map((h: any) =>
          String(h || "").trim().toLowerCase()
        );

        // Smart column mapping for EMIS 4.0 & Standard Excel
        const pegIdIdx = headerRow.findIndex((h) => h.includes("peg id") || h.includes("peg_id") || h.includes("pegid") || h.includes("id pegawai"));
        const nuptkIdx = headerRow.findIndex((h) => h.includes("nuptk"));
        const gelarDepanIdx = headerRow.findIndex((h) => h.includes("gelar depan") || h.includes("glr depan") || h.includes("gelar_depan"));
        const gelarBelakangIdx = headerRow.findIndex((h) => h.includes("gelar belakang") || h.includes("glr belakang") || h.includes("gelar_belakang"));
        
        // Name index: either "nama lengkap" or "nama"
        const nameIdx = headerRow.findIndex((h) => h.includes("nama lengkap") || h === "nama" || h.includes("nama guru") || h.includes("nama gtk") || h.includes("nama"));
        const nipIdx = headerRow.findIndex((h) => h === "nip" || (h.includes("nip") && !h.includes("tgl")));
        const nikIdx = headerRow.findIndex((h) => h === "nik" || h.includes("nik") || h.includes("ktp"));
        
        const tempatLahirIdx = headerRow.findIndex((h) => h.includes("tempat lahir") || h.includes("tempat_lahir") || h.includes("tmp lahir"));
        const tanggalLahirIdx = headerRow.findIndex((h) => h.includes("tanggal lahir") || h.includes("tgl lahir") || h.includes("tgl_lahir") || h.includes("tgl. lahir") || h.includes("tgl.lahir"));
        const genderIdx = headerRow.findIndex((h) => h.includes("jenis kelamin") || h.includes("gender") || h === "jk" || h.includes("l/p") || h === "l / p");
        const statusIdx = headerRow.findIndex((h) => h.includes("status kepegawaian") || h.includes("status pegawai") || h.includes("kepegawaian"));
        const jenisGtkIdx = headerRow.findIndex((h) => h.includes("jenis gtk") || h.includes("tugas utama") || h.includes("jabatan") || h.includes("tugas"));

        const emailIdx = headerRow.findIndex((h) => h.includes("email") || h.includes("surel"));
        const phoneIdx = headerRow.findIndex(
          (h) => h.includes("phone") || h.includes("telp") || h.includes("hp") || h.includes("whatsapp") || h.includes("wa") || h.includes("telepon")
        );
        const passIdx = headerRow.findIndex(
          (h) => h.includes("pass") || h.includes("sandi")
        );

        if (nameIdx === -1 && pegIdIdx === -1 && nuptkIdx === -1) {
          throw new Error(
            "Kolom 'Nama Lengkap' atau 'Peg ID' tidak ditemukan pada baris header file Excel."
          );
        }

        const rows: ParsedTeacherRow[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = headerRowIndex + 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === "")) {
            continue; // Skip empty rows
          }

          const rawName = nameIdx !== -1 ? stripLeadingQuote(row[nameIdx]) : "";
          const rawPegId = pegIdIdx !== -1 ? stripLeadingQuote(row[pegIdIdx]) : "";
          const rawNuptk = nuptkIdx !== -1 ? stripLeadingQuote(row[nuptkIdx]) : "";
          const rawGelarDepan = gelarDepanIdx !== -1 ? stripLeadingQuote(row[gelarDepanIdx]) : "";
          const rawGelarBelakang = gelarBelakangIdx !== -1 ? stripLeadingQuote(row[gelarBelakangIdx]) : "";
          const rawNip = nipIdx !== -1 ? stripLeadingQuote(row[nipIdx]) : "";
          const rawNik = nikIdx !== -1 ? stripLeadingQuote(row[nikIdx]) : "";
          const rawTempatLahir = tempatLahirIdx !== -1 ? stripLeadingQuote(row[tempatLahirIdx]) : "";
          const rawTanggalLahir = tanggalLahirIdx !== -1 ? parseExcelDate(row[tanggalLahirIdx]) || "" : "";
          const rawGender = genderIdx !== -1 ? normalizeGender(row[genderIdx]) : "";
          const rawStatus = statusIdx !== -1 ? stripLeadingQuote(row[statusIdx]) : "";
          const rawJenisGtk = jenisGtkIdx !== -1 ? stripLeadingQuote(row[jenisGtkIdx]) : "";

          let rawEmail = emailIdx !== -1 ? stripLeadingQuote(row[emailIdx]).toLowerCase() : "";
          const rawPhone = phoneIdx !== -1 ? stripLeadingQuote(row[phoneIdx]) : "";
          const rawPass = passIdx !== -1 ? stripLeadingQuote(row[passIdx]) : "";

          // Fallback generated email if missing in EMIS 4.0
          if (!rawEmail || !rawEmail.includes("@")) {
            const idKey = rawPegId || rawNuptk || rawNip || `guru_${i}`;
            rawEmail = `${idKey.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()}@madrasah.id`;
          }

          // Validation
          let isValid = true;
          let errorReason = "";

          if (!rawName) {
            isValid = false;
            errorReason = "Nama lengkap guru kosong";
          }

          if (isValid) {
            validCount++;
          } else {
            invalidCount++;
          }

          rows.push({
            index: i,
            name: rawName,
            gelarDepan: rawGelarDepan,
            gelarBelakang: rawGelarBelakang,
            fullNameDisplay: formatTeacherName(rawName, rawGelarDepan, rawGelarBelakang),
            pegId: rawPegId,
            nuptk: rawNuptk,
            nip: rawNip,
            nik: rawNik,
            tempatLahir: rawTempatLahir,
            tanggalLahir: rawTanggalLahir,
            gender: rawGender,
            statusKepegawaian: rawStatus,
            jenisGtk: rawJenisGtk,
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
