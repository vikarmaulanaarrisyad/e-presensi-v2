/**
 * Utility standarisasi tanggal ke format UTC Midnight untuk kolom database @db.Date di PostgreSQL / Prisma.
 * Seluruh kolom @db.Date (AttendanceLog.date, Holiday.date, TeachingJournal.date, User.tanggalLahir)
 * HARUS menggunakan Date.UTC(y, m - 1, d, 0, 0, 0, 0).
 */

export function toUtcMidnight(input?: string | Date | null): Date {
  if (!input) {
    const now = new Date();
    // Default: gunakan tanggal hari ini berbasis WIB (UTC+7)
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 0, 0, 0, 0));
  }

  if (typeof input === "string") {
    const cleanStr = input.trim();
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(cleanStr)) {
      const [y, m, d] = cleanStr.slice(0, 10).split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    // Format DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanStr)) {
      const [d, m, y] = cleanStr.split("/").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
    }
  }

  if (input instanceof Date && !isNaN(input.getTime())) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
  }

  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Mengambil rentang tanggal UTC Midnight untuk satu bulan penuh
 */
export function getMonthUtcRange(year: number, month: number): { startDate: Date; endDate: Date } {
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));
  return { startDate, endDate };
}

/**
 * Format string tanggal YYYY-MM-DD dari Date objek berbasis UTC
 */
export function toUtcDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
