"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  FileText
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { getTeacherMonthlyHistoryAction } from "@/server/actions/mobile-attendance.actions";

interface MobileHistoryViewProps {
  userId: string;
}

export function MobileHistoryView({ userId }: MobileHistoryViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<{
    logs: any[];
    holidays: any[];
    stats: {
      present: number;
      late: number;
      permit: number;
      sick: number;
      absent: number;
      total: number;
    };
  } | null>(null);

  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await getTeacherMonthlyHistoryAction(userId, selectedMonth, selectedYear);
      if (res?.success) {
        setHistoryData({
          logs: res.logs || [],
          holidays: res.holidays || [],
          stats: res.stats || { present: 0, late: 0, permit: 0, sick: 0, absent: 0, total: 0 },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const formatLogDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatLogTime = (isoTime: string | null) => {
    if (!isoTime) return "-";
    return (
      new Date(isoTime).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* 1. Month Navigation Header (Flutter Cupertino Style) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </h3>
          <p className="text-[10px] text-slate-400">Rekapitulasi Kehadiran Bulanan</p>
        </div>

        <button
          onClick={handleNextMonth}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Monthly Summary Stat Chips */}
      {historyData && (
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 p-2.5 text-center">
            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 block">Hadir</span>
            <span className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-200">
              {historyData.stats.present}
            </span>
          </div>

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 p-2.5 text-center">
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 block">Telat</span>
            <span className="text-base font-bold font-mono text-amber-800 dark:text-amber-200">
              {historyData.stats.late}
            </span>
          </div>

          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 p-2.5 text-center">
            <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 block">Izin</span>
            <span className="text-base font-bold font-mono text-blue-800 dark:text-blue-200">
              {historyData.stats.permit}
            </span>
          </div>

          <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 p-2.5 text-center">
            <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 block">Sakit</span>
            <span className="text-base font-bold font-mono text-purple-800 dark:text-purple-200">
              {historyData.stats.sick}
            </span>
          </div>
        </div>
      )}

      {/* 3. Daily Attendance List (Flutter ListView) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Daftar Catatan Harian
          </span>
          <button
            onClick={fetchHistory}
            className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            Perbarui
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-xs">Memuat riwayat kehadiran...</span>
          </div>
        ) : historyData?.logs.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Belum ada data kehadiran di bulan {monthNames[selectedMonth - 1]} {selectedYear}.
            </p>
          </div>
        ) : (
          historyData?.logs.map((log) => {
            const isLate = log.status === "LATE";
            const isPresent = log.status === "PRESENT";
            const isPermit = log.status === "PERMIT";
            const isSick = log.status === "SICK";

            return (
              <div
                key={log.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-sm flex flex-col gap-2 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatLogDate(log.date)}
                    </span>
                  </div>

                  <Badge className={`text-[9px] px-2 py-0.5 font-semibold ${
                    isLate
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : isPresent
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : isPermit
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-purple-100 text-purple-800 border-purple-200"
                  }`}>
                    {isLate ? "Terlambat" : isPresent ? "Tepat Waktu" : isPermit ? "Izin" : "Sakit"}
                  </Badge>
                </div>

                {/* Clock-in and Clock-out times */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-[11px] border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Masuk:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {formatLogTime(log.checkInTime)}
                    </span>
                    {log.checkInDistance && (
                      <span className="text-[10px] text-slate-400 block">
                        ({log.checkInDistance.toFixed(1)}m)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Pulang:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {formatLogTime(log.checkOutTime)}
                    </span>
                    {log.checkOutDistance && (
                      <span className="text-[10px] text-slate-400 block">
                        ({log.checkOutDistance.toFixed(1)}m)
                      </span>
                    )}
                  </div>
                </div>

                {/* Photo Preview Thumbnail & Notes */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 italic truncate max-w-[200px]">
                    {log.notes || "-"}
                  </span>

                  {log.checkInPhotoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({
                          url: log.checkInPhotoUrl,
                          title: `Selfie - ${formatLogDate(log.date)}`,
                        })
                      }
                      className="text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Camera className="w-3 h-3" />
                      Foto Selfie
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Photo Preview Modal */}
      {isMounted && previewPhoto && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between text-white">
              <h4 className="text-xs font-bold">{previewPhoto.title}</h4>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-slate-300"
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto.url}
              alt="Bukti Selfie"
              className="w-full h-auto rounded-2xl border border-slate-800"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
