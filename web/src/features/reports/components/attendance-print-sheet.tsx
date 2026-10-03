"use client";

import React, { forwardRef } from "react";
import { type AttendanceReportData } from "@/server/actions/report.actions";

function formatIndoTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  return timeStr.replace(/:/g, ".");
}

interface AttendancePrintSheetProps {
  data: AttendanceReportData;
  dateLanguage?: "en" | "id";
}

export const AttendancePrintSheet = forwardRef<HTMLDivElement, AttendancePrintSheetProps>(
  ({ data, dateLanguage = "id" }, ref) => {
    return (
      <div
        id="printable-attendance-sheet"
        ref={ref}
        className="w-full max-w-[1120px] bg-white text-black p-6 sm:p-8 font-sans border border-slate-300 shadow-xl rounded-sm text-[10px] leading-tight select-text print:p-0 print:border-0 print:shadow-none print:max-w-none print:w-full"
        style={{
          colorScheme: "light",
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        {/* Global Print Stylesheet */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @page {
                size: 330mm 215mm landscape;
                margin: 1mm;
              }
              @media print {
                html, body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: Arial, Helvetica, sans-serif !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .no-print, header, nav, aside, footer {
                  display: none !important;
                }
                #printable-attendance-sheet {
                  width: 300mm !important;
                  max-width: 300mm !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  transform: none !important;
                  zoom: 1 !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  page-break-inside: avoid !important;
                }
                tr {
                  page-break-inside: avoid !important;
                }
                thead th {
                  padding: 1.5px 1px !important;
                  font-size: 7.5px !important;
                  line-height: 1.1 !important;
                }
                tbody td {
                  padding: 1px 1.5px !important;
                  font-size: 8px !important;
                  line-height: 1.1 !important;
                  height: 15.5px !important;
                }
                table, tr, td, th {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                tr.holiday-row,
                tr[style*="background-color: rgb(255, 255, 0)"],
                tr[style*="background-color: #FFFF00"] {
                  background-color: #FFFF00 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `,
          }}
        />

        {/* 1. Header Box */}
        <div className="header-box border border-black p-1.5 mb-1.5">
          <div className="text-center font-extrabold text-xs sm:text-sm tracking-wide border-b border-black pb-1 mb-1">
            LAPORAN RINCIAN HARIAN
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] font-medium px-1">
            <div className="flex items-center gap-1">
              <span>Nama Madrasah</span>
              <span>:</span>
              <span className="font-bold">{data.madrasah.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Filter Jenis</span>
              <span>:</span>
              <span>{data.period.filterJenis}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Tgl. Periode</span>
              <span>:</span>
              <span>
                {data.period.startDate} s/d {data.period.endDate}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Employee Details Subheader - Colons strictly aligned vertically */}
        <div className="emp-details border-t border-b border-black py-1 px-1 mb-1 text-[10px] sm:text-[11px] leading-tight">
          <div className="grid grid-cols-3 gap-2">
            {/* Col 1 */}
            <div className="flex items-center">
              <span className="w-14 inline-block shrink-0 font-medium">{data.employee.idType || "NUPTK"}</span>
              <span className="w-3 text-center shrink-0 font-medium">:</span>
              <span className="font-semibold truncate">{data.employee.idNumber || data.employee.nuptk || "-"}</span>
            </div>
            {/* Col 2 */}
            <div className="flex items-center">
              <span className="w-24 inline-block shrink-0 font-medium">Nama Karyawan</span>
              <span className="w-3 text-center shrink-0 font-medium">:</span>
              <span className="font-bold truncate">{data.employee.name}</span>
            </div>
            {/* Col 3 */}
            <div className="flex items-center">
              <span className="w-14 inline-block shrink-0 font-medium">Jabatan</span>
              <span className="w-3 text-center shrink-0 font-medium">:</span>
              <span className="truncate">{data.employee.jabatan}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-0.5">
            {/* Col 1 */}
            <div className="flex items-center">
              <span className="w-14 inline-block shrink-0 font-medium">{data.employee.secondaryIdType || "Peg ID"}</span>
              <span className="w-3 text-center shrink-0 font-medium">:</span>
              <span className="font-semibold truncate">{data.employee.secondaryIdNumber || "-"}</span>
            </div>
            {/* Col 2 */}
            <div className="flex items-center">
              <span className="w-24 inline-block shrink-0 font-medium">Departemen</span>
              <span className="w-3 text-center shrink-0 font-medium">:</span>
              <span className="truncate">{data.employee.departemen}</span>
            </div>
            {/* Col 3 */}
            <div className="flex items-center">
              <span className="w-14 inline-block shrink-0 font-medium">Status</span>
              <span className="w-3 text-center shrink-0 font-medium">:</span>
              <span className="truncate">{data.employee.status}</span>
            </div>
          </div>
        </div>

        {/* 3. Main Attendance Table */}
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse border border-black text-[9px] sm:text-[9.5px]"
            style={{ borderCollapse: "collapse", borderColor: "#000000" }}
          >
            <thead>
              <tr className="bg-slate-50 font-bold text-center text-black">
                <th className="border border-black px-1.5 py-1 text-center whitespace-nowrap min-w-[105px]">
                  Tanggal
                </th>
                <th className="border border-black px-1.5 py-1 text-center whitespace-nowrap min-w-[105px]">
                  Nama Shift
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[40px] leading-tight">
                  Jam<br />Masuk
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[40px] leading-tight">
                  Scan<br />Masuk
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[46px] leading-tight">
                  Terlambat<br />(Menit)
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[40px] leading-tight">
                  Jam<br />Keluar
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[40px] leading-tight">
                  Scan<br />Keluar
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[46px] leading-tight">
                  P. Cepat<br />(Menit)
                </th>
                <th className="border border-black px-1 py-1 text-center whitespace-nowrap min-w-[40px]">
                  Durasi
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[36px] leading-tight">
                  Lembur<br />Awal
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[36px] leading-tight">
                  Lembur<br />Akhir
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[40px] leading-tight">
                  Lembur<br />Akhir 2
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[38px] leading-tight">
                  Shift<br />Lembur
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[36px]">
                  Istirahat
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[42px] leading-tight">
                  Istirahat<br />Lebih
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[38px] leading-tight">
                  Istirahat<br />2
                </th>
                <th className="border border-black px-0.5 py-1 text-center whitespace-nowrap min-w-[42px] leading-tight">
                  Istirahat<br />Lebih 2
                </th>
                <th className="border border-black px-1.5 py-1 text-center whitespace-nowrap min-w-[75px]">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const isYellow = row.isHoliday;
                const formattedDateString =
                  dateLanguage === "id"
                    ? `${row.dayNameId}, ${row.dayNumber.toString().padStart(2, "0")}/${data.period.month.toString().padStart(2, "0")}/${data.period.year}`
                    : row.dateFormatted;

                return (
                  <tr
                    key={row.date}
                    className={`hover:bg-slate-100/50 transition-colors ${isYellow ? "holiday-row bg-[#FFFF00]" : ""}`}
                    style={{
                      backgroundColor: isYellow ? "#FFFF00" : "transparent",
                      color: "#000000",
                    }}
                  >
                    {/* Tanggal */}
                    <td className="border border-black px-1.5 py-1 print:py-[3.5px] whitespace-nowrap text-left font-medium">
                      {formattedDateString}
                    </td>

                    {/* Nama Shift */}
                    <td className="border border-black px-1.5 py-1 print:py-[3.5px] whitespace-nowrap text-left">
                      {row.shiftName}
                    </td>

                    {/* Jam Masuk */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.jamMasuk)}
                    </td>

                    {/* Scan Masuk */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center font-mono">
                      {formatIndoTime(row.scanMasuk)}
                    </td>

                    {/* Terlambat (Menit) */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center text-red-600 font-semibold">
                      {row.terlambatMenit}
                    </td>

                    {/* Jam Keluar */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.jamKeluar)}
                    </td>

                    {/* Scan Keluar */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center font-mono">
                      {formatIndoTime(row.scanKeluar)}
                    </td>

                    {/* Pulang Cepat (Menit) */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {row.pulangCepatMenit}
                    </td>

                    {/* Durasi */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center font-mono font-medium">
                      {formatIndoTime(row.durasi)}
                    </td>

                    {/* Lembur Awal */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.lemburAwal)}
                    </td>

                    {/* Lembur Akhir */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.lemburAkhir)}
                    </td>

                    {/* Lembur Akhir 2 */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.lemburAkhir2)}
                    </td>

                    {/* Shift Lembur */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.shiftLembur)}
                    </td>

                    {/* Istirahat */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.istirahat)}
                    </td>

                    {/* Istirahat Lebih */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.istirahatLebih)}
                    </td>

                    {/* Istirahat 2 */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.istirahat2)}
                    </td>

                    {/* Istirahat Lebih 2 */}
                    <td className="border border-black px-1 py-1 print:py-[3.5px] text-center">
                      {formatIndoTime(row.istirahatLebih2)}
                    </td>

                    {/* Keterangan */}
                    <td className="border border-black px-1.5 py-1 print:py-[3.5px] text-left whitespace-nowrap">
                      {row.keterangan}
                    </td>
                  </tr>
                );
              })}

              {/* Total Summary Row */}
              <tr className="font-bold bg-white text-black" style={{ backgroundColor: "#ffffff" }}>
                <td
                  colSpan={2}
                  className="border border-black px-2 py-1 text-left italic font-bold"
                >
                  Total :
                </td>
                <td className="border border-black px-1 py-1 text-center font-bold">
                  {data.summary.totalPresent}
                </td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1 text-center font-bold font-mono">
                  {formatIndoTime(data.summary.totalDurationFormatted)}
                </td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Document Footer */}
        <div className="doc-footer flex items-center justify-between text-[10px] mt-2 pt-1 font-medium border-t border-black">
          <div className="w-1/3 text-left">
            <span>Halaman : 1</span>
            <span className="mx-3">dari : 1</span>
          </div>
          <div className="w-1/3 text-center">
            <span>Tgl. Cetak : </span>
            <span className="font-mono">{formatIndoTime(data.summary.printedAt)}</span>
          </div>
          <div className="w-1/3 text-right">
            <span>Oleh : </span>
            <span className="font-semibold">{data.summary.printedBy}</span>
          </div>
        </div>
      </div>
    );
  }
);

AttendancePrintSheet.displayName = "AttendancePrintSheet";
