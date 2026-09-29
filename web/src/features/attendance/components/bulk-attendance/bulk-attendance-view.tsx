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
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { BulkAttendanceModal, type SelectedTeacherInfo } from "./bulk-attendance-modal";
import { BulkAttendanceDateRangeModal } from "./bulk-attendance-date-range-modal";
import { SingleAttendanceModal } from "./single-attendance-modal";
import { fetchTeachersAttendanceByDateAction } from "@/server/actions/attendance.actions";
import { swalError, swalSuccess } from "@/lib/swal";
import type { TeacherWithAttendance } from "@/server/repositories/attendance.repo";

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
    } | null;
    dateStr: string;
    teachers: TeacherWithAttendance[];
    summary: {
      totalTeachers: number;
      recordedCount: number;
      unrecordedCount: number;
      presentCount: number;
      lateCount: number;
      permitCount: number;
      sickCount: number;
      absentCount: number;
      percentage: number;
    };
  };
}

export function BulkAttendanceView({ initialData }: BulkAttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialData.dateStr);
  const [teachers, setTeachers] = useState<TeacherWithAttendance[]>(initialData.teachers || []);
  const [summary, setSummary] = useState(initialData.summary);
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
      if (statusFilterTab === "UNRECORDED") return t.attendanceLog === null;
      if (statusFilterTab === "RECORDED") return t.attendanceLog !== null;
      return t.attendanceLog?.status === statusFilterTab;
    });
  }, [teachers, searchQuery, statusFilterTab]);

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
                Catat presensi kehadiran, izin dinas, atau dispensasi secara kolektif untuk seluruh atau beberapa guru terpilih.
              </p>
            </div>
          </div>
        </div>

        {/* Institution Info Badge */}
        <div className="flex items-center gap-3 bg-card border border-border/80 p-3 rounded-2xl shadow-xs">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            MIN
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-xs font-bold text-foreground truncate">
              {initialData.madrasahName}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              NSM: {initialData.nsm}
            </span>
          </div>
        </div>
      </div>

      {/* Date Selector & KPI Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Date Control Card */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Pilih Tanggal</span>
              </span>
              {isPending && (
                <RefreshCw className="size-3.5 text-primary animate-spin" />
              )}
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => loadDateData(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
            />

            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => loadDateData(getTodayStr())}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isToday
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => loadDateData(getYesterdayStr())}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDate === getYesterdayStr()
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Kemarin
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-700 dark:text-emerald-400">
              Tanggal Terpilih:
            </span>
            <span className="text-xs font-bold block mt-0.5">
              {formatDateDisplay(selectedDate)}
            </span>
          </div>
        </div>

        {/* 3 KPI Summary Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Guru */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Total Guru</span>
              <Users className="size-4 text-primary" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {summary.totalTeachers}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Guru aktif terdaftar
              </span>
            </div>
          </div>

          {/* Card 2: Belum Absen */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-xs font-bold">Belum Absen</span>
              <UserX className="size-4" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {summary.unrecordedCount}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Belum ada catatan
              </span>
            </div>
          </div>

          {/* Card 3: Sudah Hadir */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-bold">Hadir / Telat</span>
              <CheckCircle2 className="size-4" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {summary.presentCount + summary.lateCount}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                {summary.presentCount} tepat, {summary.lateCount} telat
              </span>
            </div>
          </div>

          {/* Card 4: Izin / Sakit / Alpa */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-xs font-bold">Dispensasi</span>
              <FileText className="size-4" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {summary.permitCount + summary.sickCount}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                {summary.permitCount} izin, {summary.sickCount} sakit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar (Visible whenever teachers are selected) */}
      {selectedTeacherIds.size > 0 && (
        <div className="sticky top-4 z-30 p-4 rounded-2xl bg-[#0B1320] text-white border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-150">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
              {selectedTeacherIds.size}
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                {selectedTeacherIds.size} Guru Dipilih untuk Presensi Massal
              </span>
              <span className="text-xs text-slate-400 block">
                Tanggal target: <strong>{formatDateDisplay(selectedDate)}</strong>
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

            {summary.unrecordedCount > 0 && (
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
              <option value="UNRECORDED">Belum Absen ({summary.unrecordedCount})</option>
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
                        {formatTime(log?.checkInTime || null)}
                      </td>

                      {/* Jam Pulang */}
                      <td className="py-3.5 px-4 font-mono text-xs text-foreground whitespace-nowrap">
                        {formatTime(log?.checkOutTime || null)}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {log?.notes || "-"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingTeacher(teacher)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                        >
                          <Edit3 className="size-3.5 text-primary" />
                          <span>{log ? "Ubah" : "Catat"}</span>
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
      />
    </div>
  );
}
