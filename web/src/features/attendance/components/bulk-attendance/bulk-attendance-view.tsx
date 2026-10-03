"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Calendar, 
  CalendarRange,
  CheckSquare, 
  Square, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  UserCheck, 
  UserX, 
  ArrowLeft, 
  RefreshCw, 
  Filter, 
  Edit3, 
  Check, 
  AlertCircle,
  HelpCircle,
  Building2,
  ChevronRight,
  ShieldCheck,
  Palmtree
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { BulkAttendanceModal, type SelectedTeacherInfo } from "./bulk-attendance-modal";
import { BulkAttendanceDateRangeModal } from "./bulk-attendance-date-range-modal";
import { SingleAttendanceModal } from "./single-attendance-modal";
import { fetchTeachersAttendanceByDateAction } from "@/server/actions/attendance.actions";
import { swalError, swalSuccess } from "@/lib/swal";
import type { TeacherWithAttendance, DateHolidayInfo } from "@/server/repositories/attendance.repo";

interface BulkAttendanceViewProps {
  initialData: {
    madrasahId: string;
    madrasahName: string;
    nsm: string;
    settings: {
      workStartTime: string;
      lateThreshold: string;
      workEndTime: string;
      radiusMeters: number;
      latitude: number;
      longitude: number;
      dailySchedules?: string | null;
    } | null;
    dateStr: string;
    teachers: TeacherWithAttendance[];
    summary: {
      totalTeachers: number;
      recordedCount: number;
      unrecordedCount: number;
      holidayCount?: number;
      presentCount: number;
      lateCount: number;
      permitCount: number;
      sickCount: number;
      absentCount: number;
      percentage: number;
      isHoliday?: boolean;
      holidayName?: string | null;
      holidayType?: string | null;
    };
    holidayInfo?: DateHolidayInfo | null;
  };
}

export function BulkAttendanceView({ initialData }: BulkAttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialData.dateStr);
  const [teachers, setTeachers] = useState<TeacherWithAttendance[]>(initialData.teachers || []);
  const [summary, setSummary] = useState(initialData.summary);
  const [holidayInfo, setHolidayInfo] = useState<DateHolidayInfo | null>(initialData.holidayInfo || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilterTab, setStatusFilterTab] = useState<string>("ALL");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  
  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithAttendance | null>(null);
  
  // Loading transition
  const [isPending, startTransition] = useTransition();

  // Madrasah settings
  const settings = initialData.settings;
  const madrasahId = initialData.madrasahId;
  const workStartTime = settings?.workStartTime || "07:00";
  const workEndTime = settings?.workEndTime || "14:00";

  // Reload data for selected date
  const loadDateData = (newDateStr: string) => {
    setSelectedDate(newDateStr);
    setSelectedTeacherIds(new Set()); // reset selection
    startTransition(async () => {
      const res = await fetchTeachersAttendanceByDateAction(newDateStr, madrasahId);
      if (res.success && res.data) {
        setTeachers(res.data.teachers);
        setSummary(res.data.summary);
        setHolidayInfo(res.data.holidayInfo || null);
      } else {
        swalError("Gagal Memuat Data", res.error);
      }
    });
  };

  // Format date display
  const formatDateDisplay = (isoStr: string) => {
    try {
      const [y, m, d] = isoStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const formatDateShort = (isoStr: string) => {
    try {
      const [y, m, d] = isoStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  // Quick date pickers
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isToday = selectedDate === getTodayStr();

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // 1. Search filter
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.nip && t.nip.includes(searchQuery));

      if (!matchesSearch) return false;

      // 2. Status tab filter
      if (statusFilterTab === "ALL") return true;
      if (statusFilterTab === "UNRECORDED") return t.attendanceLog === null && !holidayInfo?.isHoliday;
      if (statusFilterTab === "HOLIDAY") return t.attendanceLog === null && Boolean(holidayInfo?.isHoliday);
      if (statusFilterTab === "RECORDED") return t.attendanceLog !== null;
      return t.attendanceLog?.status === statusFilterTab;
    });
  }, [teachers, searchQuery, statusFilterTab, holidayInfo]);

  // Selected teacher objects
  const selectedTeachersList: SelectedTeacherInfo[] = useMemo(() => {
    return teachers
      .filter((t) => selectedTeacherIds.has(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        nip: t.nip,
        currentStatus: t.attendanceLog?.status || null,
      }));
  }, [teachers, selectedTeacherIds]);

  // Selection helpers
  const handleToggleSelectAll = () => {
    if (selectedTeacherIds.size === filteredTeachers.length && filteredTeachers.length > 0) {
      // Unselect all in current view
      setSelectedTeacherIds(new Set());
    } else {
      // Select all currently filtered
      const newSet = new Set<string>();
      filteredTeachers.forEach((t) => newSet.add(t.id));
      setSelectedTeacherIds(newSet);
    }
  };

  const handleSelectAllUnrecorded = () => {
    const newSet = new Set<string>();
    teachers.forEach((t) => {
      if (!t.attendanceLog) {
        newSet.add(t.id);
      }
    });
    setSelectedTeacherIds(newSet);
  };

  const handleToggleTeacher = (teacherId: string) => {
    const newSet = new Set(selectedTeacherIds);
    if (newSet.has(teacherId)) {
      newSet.delete(teacherId);
    } else {
      newSet.add(teacherId);
    }
    setSelectedTeacherIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedTeacherIds(new Set());
  };

  // Status badge helper
  const renderStatusBadge = (log: TeacherWithAttendance["attendanceLog"]) => {
    if (!log) {
      if (holidayInfo?.isHoliday) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <Palmtree className="size-3.5 text-amber-600 shrink-0" />
            <span>Libur ({holidayInfo.name || "Libur Rutin"})</span>
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
          <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
          Belum Absen
        </span>
      );
    }

    switch (log.status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Hadir Tepat Waktu
          </span>
        );
      case "LATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <Clock className="size-3.5 text-amber-600" />
            Terlambat
          </span>
        );
      case "PERMIT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <FileText className="size-3.5 text-blue-600" />
            Izin Dinas
          </span>
        );
      case "SICK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
            <AlertTriangle className="size-3.5 text-purple-600" />
            Sakit
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="size-3.5 text-rose-600" />
            Alpa / Tanpa Keterangan
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (time: Date | null) => {
    if (!time) return "-";
    const d = new Date(time);
    return (
      d.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) + " WIB"
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* Top Breadcrumb & Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1">
              <Building2 className="size-3.5" />
              <span>Dashboard Admin</span>
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="text-foreground font-semibold">Presensi Massal Guru</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-md shrink-0">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <span>Presensi Massal Guru</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Fitur Operator
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola presensi harian secara kolektif dengan sinkronisasi jam kerja, status kehadiran, dan jitter natural.
              </p>
            </div>
          </div>
        </div>

        {/* Institution Info Badge & Direct Range Action */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDateRangeModalOpen(true)}
            leftIcon={<CalendarRange className="size-3.5 text-emerald-600" />}
            className="border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs text-xs"
          >
            Presensi Rentang Tanggal
          </Button>

          <div className="flex items-center gap-3 bg-card border border-border/80 p-2.5 px-3 rounded-2xl shadow-xs">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              MIN
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-bold text-foreground truncate max-w-[150px] sm:max-w-xs">
                {initialData.madrasahName}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                NSM: {initialData.nsm}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Holiday Alert Banner if selected date is a holiday */}
      {holidayInfo?.isHoliday && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Palmtree className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-foreground">
                  Tanggal Libur: {holidayInfo.name || "Libur Rutin"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                  Bebas Presensi
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pada tanggal libur tidak ada kewajiban presensi KBM bagi guru dan tidak dihitung sebagai alpa/terlambat.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/25 self-start sm:self-auto shrink-0">
            Jadwal Kalender: Libur
          </span>
        </div>
      )}

      {/* Date Selector & KPI Statistics Cards (Executive 5-Card Bento Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Pilihan Tanggal */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Calendar className="size-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Pilih Tanggal
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {isToday ? "Presensi Hari Ini" : "Histori Tanggal"}
                </span>
              </div>
            </div>
            {isPending && (
              <RefreshCw className="size-3.5 text-primary animate-spin" />
            )}
          </div>

          <div className="my-1.5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => loadDateData(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-border/80 bg-background/80 hover:bg-background focus:bg-background text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs"
            />

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => loadDateData(getTodayStr())}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isToday
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Clock className="size-3" />
                <span>Hari Ini</span>
              </button>
              <button
                type="button"
                onClick={() => loadDateData(getYesterdayStr())}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  selectedDate === getYesterdayStr()
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Kemarin</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="font-bold text-foreground truncate" title={formatDateDisplay(selectedDate)}>
              {formatDateShort(selectedDate)}
            </span>
            {holidayInfo?.isHoliday ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                Libur
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                Hari Kerja
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Guru */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600 dark:from-slate-600 dark:to-slate-400" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Guru
            </span>
            <div className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>

          <div className="my-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground tracking-tight">
                {summary.totalTeachers}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Guru Aktif
              </span>
            </div>
            
            {/* Micro progress bar */}
            <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${summary.percentage}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">Partisipasi</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {holidayInfo?.isHoliday ? "100% Libur Terjadwal" : `${summary.percentage}% Tercatat`}
            </span>
          </div>
        </div>

        {/* Card 3: Belum Absen / Hari Libur */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${holidayInfo?.isHoliday ? "from-amber-500 to-yellow-500" : "from-rose-500 to-pink-500"}`} />
          
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${holidayInfo?.isHoliday ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
              {holidayInfo?.isHoliday ? "Hari Libur" : "Belum Absen"}
            </span>
            <div className={`size-8 rounded-xl flex items-center justify-center ${holidayInfo?.isHoliday ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400" : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"}`}>
              {holidayInfo?.isHoliday ? <Palmtree className="size-4" /> : <UserX className="size-4" />}
            </div>
          </div>

          <div className="my-1.5">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tight ${holidayInfo?.isHoliday ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                {holidayInfo?.isHoliday ? (summary.holidayCount ?? summary.totalTeachers) : summary.unrecordedCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {holidayInfo?.isHoliday ? "Guru Libur" : "Guru"}
              </span>
            </div>

            {/* Micro progress bar */}
            <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${holidayInfo?.isHoliday ? "bg-amber-500 w-full" : "bg-rose-500"}`}
                style={!holidayInfo?.isHoliday ? { 
                  width: `${summary.totalTeachers > 0 ? (summary.unrecordedCount / summary.totalTeachers) * 100 : 0}%` 
                } : undefined}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">Status</span>
            {holidayInfo?.isHoliday ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Check className="size-3" /> Bebas Presensi
              </span>
            ) : summary.unrecordedCount === 0 ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="size-3" /> Lengkap 100%
              </span>
            ) : (
              <span className="font-bold text-rose-600 dark:text-rose-400">
                Perlu Presensi
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Hadir / Telat */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Hadir / Telat
            </span>
            <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>

          <div className="my-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {summary.presentCount + summary.lateCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Guru Hadir
              </span>
            </div>

            {/* Micro dual progress bar */}
            <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ 
                  width: `${summary.totalTeachers > 0 ? (summary.presentCount / summary.totalTeachers) * 100 : 0}%` 
                }}
              />
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ 
                  width: `${summary.totalTeachers > 0 ? (summary.lateCount / summary.totalTeachers) * 100 : 0}%` 
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {summary.presentCount} tepat
            </span>
            <span className="text-muted-foreground font-medium">·</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {summary.lateCount} telat
            </span>
          </div>
        </div>

        {/* Card 5: Dispensasi */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Dispensasi
            </span>
            <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="size-4" />
            </div>
          </div>

          <div className="my-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground tracking-tight">
                {summary.permitCount + summary.sickCount + summary.absentCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Guru
              </span>
            </div>

            {/* Micro progress bar */}
            <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden flex">
              <div 
                className="bg-blue-500 h-full transition-all duration-500" 
                style={{ 
                  width: `${summary.totalTeachers > 0 ? (summary.permitCount / summary.totalTeachers) * 100 : 0}%` 
                }}
              />
              <div 
                className="bg-purple-500 h-full transition-all duration-500" 
                style={{ 
                  width: `${summary.totalTeachers > 0 ? (summary.sickCount / summary.totalTeachers) * 100 : 0}%` 
                }}
              />
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ 
                  width: `${summary.totalTeachers > 0 ? (summary.absentCount / summary.totalTeachers) * 100 : 0}%` 
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {summary.permitCount} izin
            </span>
            <span className="text-muted-foreground font-medium">·</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {summary.sickCount} sakit
            </span>
            <span className="text-muted-foreground font-medium">·</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {summary.absentCount} alpa
            </span>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar (Visible whenever teachers are selected) */}
      {selectedTeacherIds.size > 0 && (
        <div className={`sticky top-4 z-30 p-4 rounded-2xl text-white border shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-150 ${holidayInfo?.isHoliday ? "bg-[#1A1810] border-amber-500/50" : "bg-[#0B1320] border-emerald-500/40"}`}>
          <div className="flex items-center gap-3">
            <div className={`size-9 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${holidayInfo?.isHoliday ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"}`}>
              {selectedTeacherIds.size}
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                {selectedTeacherIds.size} Guru Dipilih {holidayInfo?.isHoliday ? "— Hari Libur" : "untuk Presensi Massal"}
              </span>
              <span className="text-xs text-slate-400 block">
                Tanggal target: <strong>{formatDateDisplay(selectedDate)}</strong> {holidayInfo?.isHoliday && `(${holidayInfo.name || "Libur Rutin"})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClearSelection}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal Pilihan
            </button>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setIsDateRangeModalOpen(true)}
              leftIcon={<CalendarRange className="size-4" />}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/50 font-bold shadow-md cursor-pointer"
            >
              Rentang Tanggal
            </Button>
            <Button
              type="button"
              variant="default"
              size="default"
              onClick={() => setIsBulkModalOpen(true)}
              leftIcon={<CheckCircle2 className="size-4" />}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md cursor-pointer"
            >
              Presensi Massal (1 Hari)
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-2xs"
            >
              {selectedTeacherIds.size === filteredTeachers.length && filteredTeachers.length > 0 ? (
                <>
                  <CheckSquare className="size-4 text-primary" />
                  <span>Batalkan Semua ({filteredTeachers.length})</span>
                </>
              ) : (
                <>
                  <Square className="size-4 text-muted-foreground" />
                  <span>Pilih Semua Tampil ({filteredTeachers.length})</span>
                </>
              )}
            </button>

            {!holidayInfo?.isHoliday && summary.unrecordedCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllUnrecorded}
                className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="size-3.5 text-rose-600" />
                <span>Pilih Semua yang Belum Absen ({summary.unrecordedCount})</span>
              </button>
            )}

            {selectedTeacherIds.size > 0 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsBulkModalOpen(true)}
                leftIcon={<CheckCircle2 className="size-3.5" />}
              >
                Presensi Massal ({selectedTeacherIds.size})
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDateRangeModalOpen(true)}
              leftIcon={<CalendarRange className="size-3.5 text-blue-600 dark:text-blue-400" />}
              className="border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5 hover:bg-blue-500/10 text-blue-800 dark:text-blue-300 font-bold shadow-2xs text-xs"
            >
              Presensi Rentang Tanggal
            </Button>
          </div>

          {/* Search & Status Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="Cari guru / NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="size-4" />}
              />
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilterTab}
              onChange={(e) => setStatusFilterTab(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
            >
              <option value="ALL">Semua Guru ({teachers.length})</option>
              {holidayInfo?.isHoliday ? (
                <option value="HOLIDAY">Guru Libur ({summary.holidayCount ?? teachers.length})</option>
              ) : (
                <option value="UNRECORDED">Belum Absen ({summary.unrecordedCount})</option>
              )}
              <option value="PRESENT">Hadir Tepat Waktu ({summary.presentCount})</option>
              <option value="LATE">Terlambat ({summary.lateCount})</option>
              <option value="PERMIT">Izin Dinas ({summary.permitCount})</option>
              <option value="SICK">Sakit ({summary.sickCount})</option>
              <option value="ABSENT">Alpa ({summary.absentCount})</option>
            </select>
          </div>
        </div>

        {/* Teacher Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedTeacherIds.size === filteredTeachers.length &&
                      filteredTeachers.length > 0
                    }
                    onChange={handleToggleSelectAll}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Guru / Tenaga Pendidik</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-4">Catatan / Keterangan</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    Tidak ada guru yang sesuai dengan kriteria filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const isSelected = selectedTeacherIds.has(teacher.id);
                  const log = teacher.attendanceLog;

                  return (
                    <tr
                      key={teacher.id}
                      className={`transition-colors group ${
                        isSelected
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTeacher(teacher.id)}
                          className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      {/* Teacher Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {teacher.name.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                              {teacher.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                              NIP: {teacher.nip || "Belum diisi"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(log)}
                      </td>

                      {/* Jam Masuk */}
                      <td className="py-3.5 px-4 font-mono text-xs text-foreground whitespace-nowrap">
                        {log ? formatTime(log.checkInTime || null) : holidayInfo?.isHoliday ? <span className="text-muted-foreground/60 italic">Libur</span> : "-"}
                      </td>

                      {/* Jam Pulang */}
                      <td className="py-3.5 px-4 font-mono text-xs text-foreground whitespace-nowrap">
                        {log ? formatTime(log.checkOutTime || null) : holidayInfo?.isHoliday ? <span className="text-muted-foreground/60 italic">Libur</span> : "-"}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {log?.notes ? (
                          log.notes
                        ) : holidayInfo?.isHoliday ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {holidayInfo.name || "Libur Rutin"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingTeacher(teacher)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                        >
                          <Edit3 className="size-3.5 text-primary" />
                          <span>{log ? "Ubah" : holidayInfo?.isHoliday ? "Catat Khusus" : "Catat"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <span>
            Menampilkan <strong>{filteredTeachers.length}</strong> dari <strong>{teachers.length}</strong> guru aktif.
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Presensi massal oleh admin diverifikasi otomatis dalam radius geofence madrasah.</span>
          </span>
        </div>
      </div>

      {/* Bulk Attendance Modal (single date) */}
      <BulkAttendanceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => loadDateData(selectedDate)}
        selectedTeachers={selectedTeachersList}
        dateStr={selectedDate}
        madrasahId={madrasahId}
        defaultStartTime={workStartTime}
        defaultEndTime={workEndTime}
        dailySchedules={settings?.dailySchedules}
        isHoliday={holidayInfo?.isHoliday}
        holidayName={holidayInfo?.name}
      />

      {/* Date Range Bulk Attendance Modal */}
      <BulkAttendanceDateRangeModal
        isOpen={isDateRangeModalOpen}
        onClose={() => setIsDateRangeModalOpen(false)}
        onSuccess={() => loadDateData(selectedDate)}
        selectedTeachers={selectedTeachersList}
        madrasahId={madrasahId}
        defaultStartTime={workStartTime}
        defaultEndTime={workEndTime}
        dailySchedules={settings?.dailySchedules}
      />

      {/* Single Attendance Modal */}
      <SingleAttendanceModal
        isOpen={Boolean(editingTeacher)}
        onClose={() => setEditingTeacher(null)}
        onSuccess={() => loadDateData(selectedDate)}
        teacher={editingTeacher}
        dateStr={selectedDate}
        madrasahId={madrasahId}
        defaultStartTime={workStartTime}
        defaultEndTime={workEndTime}
        dailySchedules={settings?.dailySchedules}
        isHoliday={holidayInfo?.isHoliday}
        holidayName={holidayInfo?.name}
      />
    </div>
  );
}
