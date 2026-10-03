"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { formatTeacherName, stripLeadingQuote, maskNik } from "@/lib/excel-helpers";
import { requireMadrasahAdmin } from "@/server/utils/auth-guard";

export interface DailyReportRow {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // "Wednesday 01/01/2025"
  dayNameEn: string; // "Wednesday"
  dayNameId: string; // "Rabu"
  dayNumber: number; // 1 to 31
  dayOfWeek: number; // 0 to 6 (0 = Sunday)
  shiftName: string; // "Libur", "Senin - kamis (NON PNS)", "Jum'at (NON PNS)", "Sabtu (NON PNS)"
  jamMasuk: string; // "07.00"
  scanMasuk: string; // "06.45"
  terlambatMenit: string; // "" or number
  jamKeluar: string; // "14.30"
  scanKeluar: string; // "14.35"
  pulangCepatMenit: string; // "" or number
  durasi: string; // "06.00" or "00.00"
  lemburAwal: string;
  lemburAkhir: string;
  lemburAkhir2: string;
  shiftLembur: string;
  istirahat: string;
  istirahatLebih: string;
  istirahat2: string;
  istirahatLebih2: string;
  keterangan: string; // "Libur", "libur rutin", etc.
  isHoliday: boolean; // Highlights yellow
  status: "PRESENT" | "LATE" | "HOLIDAY" | "PERMIT" | "SICK" | "ABSENT";
}

export interface AttendanceReportData {
  madrasah: {
    id: string;
    name: string;
    nsm: string;
    address: string | null;
  };
  employee: {
    pin: string;
    nuptk: string;
    pegId?: string;
    nik?: string;
    nip?: string;
    idType: string;
    idNumber: string;
    secondaryIdType: string;
    secondaryIdNumber: string;
    name: string;
    jabatan: string;
    departemen: string;
    status: string;
  };
  period: {
    startDate: string; // "01/01/2025"
    endDate: string; // "31/01/2025"
    month: number;
    year: number;
    filterJenis: string; // "Semua"
  };
  rows: DailyReportRow[];
  summary: {
    totalWorkDays: number;
    totalPresent: number; // e.g. 23
    totalHoliday: number;
    totalLate: number;
    totalDurationFormatted: string; // e.g. "138:30"
    printedAt: string; // "31/01/2025 22:19:48"
    printedBy: string; // "admin"
  };
}

export interface ReportFilterParams {
  madrasahId?: string;
  teacherId?: string;
  month?: number; // 1-12
  year?: number; // e.g. 2025
  filterType?: string; // "all" | "present" | "late" | "holiday"
  isSampleWariah?: boolean;
}

const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Fetch initial list of teachers and madrasah info for report page
 */
export async function fetchReportInitialData(madrasahId?: string) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(madrasahId);

    const madrasah = await prisma.madrasah.findUnique({
      where: { id: targetMadrasahId },
      include: {
        settings: true,
      },
    });

    const teachers = await prisma.user.findMany({
      where: {
        madrasahId: targetMadrasahId,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
        gelarDepan: true,
        gelarBelakang: true,
        nip: true,
        pegId: true,
        nuptk: true,
        email: true,
        phone: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      data: {
        madrasah,
        teachers,
      },
    };
  } catch (error) {
    console.error("Gagal memuat data awal laporan:", error);
    return { error: "Gagal memuat data awal laporan." };
  }
}

/**
 * Fetch Detailed Daily Attendance Report (Laporan Rincian Harian) - 100% Real Database
 */
export async function fetchAttendanceReportData(params: ReportFilterParams) {
  try {
    const month = params.month ?? 1;
    const year = params.year ?? 2025;
    const filterType = params.filterType ?? "all";

    // Authenticate and resolve madrasah
    const guard = await requireMadrasahAdmin(
      params.madrasahId === "default" || !params.madrasahId ? undefined : params.madrasahId
    );
    const targetMadrasahId = guard.madrasahId;

    const madrasah = await prisma.madrasah.findUnique({
      where: { id: targetMadrasahId },
      include: { settings: true },
    });

    const madrasahName = madrasah?.name || "Madrasah";

    // Resolve Teacher strictly from Database
    let teacher: any = null;
    if (params.teacherId && params.teacherId !== "sample-wariah") {
      try {
        teacher = await prisma.user.findUnique({
          where: { id: params.teacherId },
          select: {
            id: true,
            name: true,
            gelarDepan: true,
            gelarBelakang: true,
            nip: true,
            nik: true,
            pegId: true,
            nuptk: true,
            jenisGtk: true,
            isActive: true,
            position: {
              select: {
                name: true,
                isHeadmaster: true,
              },
            },
          },
        });
      } catch (err) {
        teacher = await prisma.user.findUnique({
          where: { id: params.teacherId },
          select: {
            id: true,
            name: true,
            nip: true,
            isActive: true,
          },
        });
      }
    }

    // If teacher not selected or not found, load first active teacher in this madrasah
    if (!teacher) {
      teacher = await prisma.user.findFirst({
        where: {
          madrasahId: targetMadrasahId,
          role: "TEACHER",
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          gelarDepan: true,
          gelarBelakang: true,
          nip: true,
          nik: true,
          pegId: true,
          nuptk: true,
          jenisGtk: true,
          isActive: true,
          position: {
            select: {
              name: true,
              isHeadmaster: true,
            },
          },
        },
      });
    }

    if (!teacher) {
      return { error: "Belum ada data guru/pendidik yang terdaftar di madrasah ini." };
    }

    // Number of days in the requested month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Start & End dates for query matching PostgreSQL @db.Date in UTC
    const startDateObj = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDateObj = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // Fetch Holidays from DB (supporting single days and multi-day semester breaks)
    const holidays = await prisma.holiday.findMany({
      where: {
        madrasahId: targetMadrasahId,
        OR: [
          // 1. Single day holiday inside month
          {
            endDate: null,
            date: {
              gte: startDateObj,
              lte: endDateObj,
            },
          },
          // 2. Multi-day holiday range (e.g. Libur Semester) overlapping this month
          {
            date: {
              lte: endDateObj,
            },
            endDate: {
              gte: startDateObj,
            },
          },
        ],
      },
    });

    // Fetch Real Attendance Logs for this teacher from Database
    const logs = await prisma.attendanceLog.findMany({
      where: {
        userId: teacher.id,
        date: {
          gte: startDateObj,
          lte: endDateObj,
        },
      },
      orderBy: { date: "asc" },
    });

    // Map logs strictly by canonical date string (YYYY-MM-DD) from PostgreSQL @db.Date
    const logMap = new Map<string, (typeof logs)[0]>();
    for (const log of logs) {
      const d = new Date(log.date);
      const dateKey = d.toISOString().split("T")[0];
      logMap.set(dateKey, log);
    }

    // Map holidays by day using exact date range matching
    const holidayMap = new Map<number, string>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      for (const h of holidays) {
        const hStart = new Date(h.date);
        hStart.setHours(0, 0, 0, 0);
        const hEnd = h.endDate ? new Date(h.endDate) : new Date(h.date);
        hEnd.setHours(23, 59, 59, 999);

        if (dayStart <= hEnd && dayEnd >= hStart) {
          holidayMap.set(day, h.name);
          break;
        }
      }
    }

    // Parse madrasah settings for work days and daily schedule
    const workDaysList = madrasah?.settings?.workDays
      ? madrasah.settings.workDays.split(",").map((s) => Number(s.trim()))
      : [1, 2, 3, 4, 5, 6]; // Default Senin-Sabtu

    let parsedDailySchedules: Array<{
      day: number;
      dayName: string;
      isActive: boolean;
      startTime: string;
      lateThreshold: string;
      endTime: string;
      notes?: string;
    }> = [];

    if (madrasah?.settings?.dailySchedules) {
      try {
        parsedDailySchedules = JSON.parse(madrasah.settings.dailySchedules);
      } catch (e) {
        console.warn("Gagal parse dailySchedules dari madrasahSetting:", e);
      }
    }

    // Generate 1 to daysInMonth rows strictly from database records
    const now = new Date();
    const rows: DailyReportRow[] = [];
    let totalPresentDays = 0;
    let totalDurationMinutes = 0;
    let totalHolidays = 0;
    let totalLate = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const scheduleDayNum = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 = Mon, ..., 7 = Sun
      const dayStr = day.toString().padStart(2, "0");
      const monthStr = month.toString().padStart(2, "0");
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const dayNameEn = EN_DAYS[dayOfWeek];
      const dayNameId = ID_DAYS[dayOfWeek];
      const dateFormatted = `${dayNameEn} ${dayStr}/${monthStr}/${year}`;

      const daySchedule = parsedDailySchedules.find((s) => s.day === scheduleDayNum);
      const isWorkDay = daySchedule ? daySchedule.isActive : workDaysList.includes(scheduleDayNum);

      const isKnownHoliday = holidayMap.has(day);
      const isRoutineOff = !isWorkDay;
      const isHoliday = isRoutineOff || isKnownHoliday;

      if (isHoliday) {
        totalHolidays++;
        const holidayDesc = isRoutineOff
          ? "libur rutin"
          : holidayMap.get(day) || "Libur";

        rows.push({
          date: dateKey,
          dateFormatted,
          dayNameEn,
          dayNameId,
          dayNumber: day,
          dayOfWeek,
          shiftName: "Libur",
          jamMasuk: "",
          scanMasuk: "",
          terlambatMenit: "",
          jamKeluar: "",
          scanKeluar: "",
          pulangCepatMenit: "",
          durasi: "00.00",
          lemburAwal: "",
          lemburAkhir: "",
          lemburAkhir2: "",
          shiftLembur: "",
          istirahat: "",
          istirahatLebih: "",
          istirahat2: "",
          istirahatLebih2: "",
          keterangan: holidayDesc,
          isHoliday: true,
          status: "HOLIDAY",
        });
      } else {
        // Working Day - Default schedule from DB madrasah settings
        let shiftName = "Senin - kamis (NON PNS)";
        if (dayOfWeek === 5) {
          shiftName = "Jum'at (NON PNS)";
        } else if (dayOfWeek === 6) {
          shiftName = "Sabtu (NON PNS)";
        }

        let jamMasuk = "07.00";
        let jamKeluar = "14.30";

        if (daySchedule) {
          jamMasuk = daySchedule.startTime.replace(":", ".");
          jamKeluar = daySchedule.endTime.replace(":", ".");
        } else {
          if (dayOfWeek === 5) jamKeluar = "11.30";
          else if (dayOfWeek === 6) jamKeluar = "15.00";
          if (madrasah?.settings?.workStartTime) {
            jamMasuk = madrasah.settings.workStartTime.replace(":", ".");
          }
        }

        const existingLog = logMap.get(dateKey);

        if (existingLog) {
          // Real database attendance log from attendance_logs table
          const checkIn = existingLog.checkInTime ? new Date(existingLog.checkInTime) : null;
          const checkOut = existingLog.checkOutTime ? new Date(existingLog.checkOutTime) : null;

          // Format timestamps using Asia/Jakarta (WIB)
          const scanMasuk = checkIn
            ? checkIn.toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).replace(":", ".")
            : "";

          const scanKeluar = checkOut
            ? checkOut.toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).replace(":", ".")
            : "";

          // Actual duration in minutes between check-in and check-out
          let durMinutes = 0;
          if (checkIn && checkOut) {
            durMinutes = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
          }
          totalDurationMinutes += durMinutes;

          const durHours = Math.floor(durMinutes / 60).toString().padStart(2, "0");
          const durMins = (durMinutes % 60).toString().padStart(2, "0");
          const durasi = durMinutes > 0 ? `${durHours}.${durMins}` : "00.00";

          // Calculate real late minutes if status is LATE
          let terlambatMenit = "";
          if (existingLog.status === "LATE" && checkIn) {
            const wibInStr = checkIn.toLocaleTimeString("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const [h, m] = wibInStr.split(":").map(Number);
            const inMin = h * 60 + m;
            const [schedH, schedM] = jamMasuk.replace(".", ":").split(":").map(Number);
            const schedMin = schedH * 60 + schedM;
            const diff = Math.max(0, inMin - schedMin);
            terlambatMenit = diff > 0 ? String(diff) : "";
          }

          // Calculate real early departure minutes if check-out earlier than schedule
          let pulangCepatMenit = "";
          if (checkOut) {
            const wibOutStr = checkOut.toLocaleTimeString("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const [outH, outM] = wibOutStr.split(":").map(Number);
            const outMin = outH * 60 + outM;
            const [schedOutH, schedOutM] = jamKeluar.replace(".", ":").split(":").map(Number);
            const schedOutMin = schedOutH * 60 + schedOutM;
            const earlyDiff = schedOutMin - outMin;
            if (earlyDiff > 0) {
              pulangCepatMenit = String(earlyDiff);
            }
          }

          const isPresent = existingLog.status === "PRESENT" || existingLog.status === "LATE";
          if (isPresent) totalPresentDays++;
          if (existingLog.status === "LATE") totalLate++;

          let status: DailyReportRow["status"] = "PRESENT";
          let defaultNotes = "";

          if (existingLog.status === "LATE") {
            status = "LATE";
            defaultNotes = "Terlambat";
          } else if (existingLog.status === "SICK") {
            status = "SICK";
            defaultNotes = "Sakit";
          } else if (existingLog.status === "PERMIT") {
            status = "PERMIT";
            defaultNotes = "Izin";
          } else if (existingLog.status === "ABSENT") {
            status = "ABSENT";
            defaultNotes = "Tanpa Keterangan";
          } else {
            status = "PRESENT";
          }

          rows.push({
            date: dateKey,
            dateFormatted,
            dayNameEn,
            dayNameId,
            dayNumber: day,
            dayOfWeek,
            shiftName,
            jamMasuk,
            scanMasuk,
            terlambatMenit,
            jamKeluar,
            scanKeluar,
            pulangCepatMenit,
            durasi,
            lemburAwal: "",
            lemburAkhir: "",
            lemburAkhir2: "",
            shiftLembur: "",
            istirahat: "",
            istirahatLebih: "",
            istirahat2: "",
            istirahatLebih2: "",
            keterangan: existingLog.notes || defaultNotes,
            isHoliday: false,
            status,
          });
        } else {
          // Pure 100% Real Database: No attendance log in database for this date.
          // Working day in the past with no check-in is marked as "Tanpa Keterangan" (Alpa)
          const isPast = currentDate < now;

          rows.push({
            date: dateKey,
            dateFormatted,
            dayNameEn,
            dayNameId,
            dayNumber: day,
            dayOfWeek,
            shiftName,
            jamMasuk,
            scanMasuk: "",
            terlambatMenit: "",
            jamKeluar,
            scanKeluar: "",
            pulangCepatMenit: "",
            durasi: "00.00",
            lemburAwal: "",
            lemburAkhir: "",
            lemburAkhir2: "",
            shiftLembur: "",
            istirahat: "",
            istirahatLebih: "",
            istirahat2: "",
            istirahatLebih2: "",
            keterangan: isPast ? "Tanpa Keterangan" : "",
            isHoliday: false,
            status: "ABSENT",
          });
        }
      }
    }

    // Apply Filter if requested
    let filteredRows = rows;
    if (filterType === "present") {
      filteredRows = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE");
    } else if (filterType === "late") {
      filteredRows = rows.filter((r) => r.status === "LATE");
    } else if (filterType === "holiday") {
      filteredRows = rows.filter((r) => r.isHoliday);
    }

    // Calculate total duration in HHH.MM format (e.g. "138.30")
    const totHours = Math.floor(totalDurationMinutes / 60);
    const totMins = totalDurationMinutes % 60;
    const totalDurationFormatted = `${totHours}.${totMins.toString().padStart(2, "0")}`;

    // Current print timestamp in Indonesian format (dd/mm/yyyy HH.mm.ss)
    const printDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}.${now.getMinutes().toString().padStart(2, "0")}.${now.getSeconds().toString().padStart(2, "0")}`;

    // Identifiers logic for Report:
    // Specification: "Laporan jangan menggunakan NIK tapi PegId atau NUPTK"
    const rawNuptk = stripLeadingQuote((teacher as any).nuptk);
    const rawPegId = stripLeadingQuote((teacher as any).pegId);
    const rawNip = stripLeadingQuote(teacher.nip);

    // Primary ID (Row 1): Prioritize NUPTK, then Peg ID, then NIP (Never NIK)
    let idType = "NUPTK";
    let idNumber = "-";

    if (rawNuptk && rawNuptk.length > 0) {
      idType = "NUPTK";
      idNumber = rawNuptk;
    } else if (rawPegId && rawPegId.length > 0) {
      idType = "Peg ID";
      idNumber = rawPegId;
    } else if (rawNip && rawNip.length > 0 && rawNip !== "12") {
      idType = "NIP";
      idNumber = rawNip;
    } else {
      idType = "NUPTK";
      idNumber = "-";
    }

    // Secondary ID (Row 2): Complement with Peg ID or NUPTK (Never NIK)
    let secondaryIdType = "Peg ID";
    let secondaryIdNumber = "-";

    if (idType === "NUPTK") {
      if (rawPegId && rawPegId.length > 0) {
        secondaryIdType = "Peg ID";
        secondaryIdNumber = rawPegId;
      } else if (rawNip && rawNip.length > 0 && rawNip !== "12") {
        secondaryIdType = "NIP";
        secondaryIdNumber = rawNip;
      } else {
        secondaryIdType = "Peg ID";
        secondaryIdNumber = "-";
      }
    } else if (idType === "Peg ID") {
      if (rawNuptk && rawNuptk.length > 0) {
        secondaryIdType = "NUPTK";
        secondaryIdNumber = rawNuptk;
      } else if (rawNip && rawNip.length > 0 && rawNip !== "12") {
        secondaryIdType = "NIP";
        secondaryIdNumber = rawNip;
      } else {
        secondaryIdType = "NUPTK";
        secondaryIdNumber = "-";
      }
    } else {
      // idType is NIP
      if (rawNuptk && rawNuptk.length > 0) {
        secondaryIdType = "NUPTK";
        secondaryIdNumber = rawNuptk;
      } else if (rawPegId && rawPegId.length > 0) {
        secondaryIdType = "Peg ID";
        secondaryIdNumber = rawPegId;
      } else {
        secondaryIdType = "Peg ID";
        secondaryIdNumber = "-";
      }
    }

    const reportData: AttendanceReportData = {
      madrasah: {
        id: madrasah?.id || "default",
        name: madrasahName,
        nsm: madrasah?.nsm || "111131740001",
        address: madrasah?.address || null,
      },
      employee: {
        pin: idNumber,
        nuptk: rawNuptk || "-",
        pegId: rawPegId || "-",
        nip: rawNip && rawNip !== "12" ? rawNip : "Non-PNS",
        idType,
        idNumber,
        secondaryIdType,
        secondaryIdNumber,
        name: formatTeacherName(teacher.name, (teacher as any).gelarDepan, (teacher as any).gelarBelakang),
        jabatan: (teacher as any).position?.name || (teacher as any).jenisGtk || "Guru",
        departemen: madrasahName,
        status: teacher.isActive ? "Aktif" : "Non-Aktif",
      },
      period: {
        startDate: `01/${month.toString().padStart(2, "0")}/${year}`,
        endDate: `${daysInMonth.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`,
        month,
        year,
        filterJenis: filterType === "all" ? "Semua" : filterType === "present" ? "Hadir" : filterType === "late" ? "Terlambat" : "Libur",
      },
      rows: filteredRows,
      summary: {
        totalWorkDays: daysInMonth - totalHolidays,
        totalPresent: totalPresentDays,
        totalHoliday: totalHolidays,
        totalLate,
        totalDurationFormatted,
        printedAt: printDate,
        printedBy: "admin",
      },
    };

    return { data: reportData };
  } catch (error: any) {
    console.error("Gagal membuat laporan presensi harian:", error);
    return { error: error.message || "Gagal memproses laporan presensi." };
  }
}

/**
 * Quick Action to Register Semester Holiday Range (Libur Semester Ganjil / Genap)
 */
export async function saveSemesterHolidayAction(params: {
  madrasahId: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}) {
  try {
    const { madrasahId: targetMadrasahId } = await requireMadrasahAdmin(params.madrasahId);

    const holiday = await prisma.holiday.create({
      data: {
        madrasahId: targetMadrasahId,
        name: params.name.trim(),
        date: new Date(params.startDate),
        endDate: new Date(params.endDate),
        isNational: false,
        description: params.description || "Libur Semester Kalender Pendidikan Madrasah",
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/bulk-attendance");
    revalidatePath("/admin");
    revalidatePath("/guru");

    return { success: true, data: holiday };
  } catch (error: any) {
    console.error("Gagal menyimpan libur semester:", error);
    return { error: error.message || "Gagal menyimpan jadwal libur semester." };
  }
}

