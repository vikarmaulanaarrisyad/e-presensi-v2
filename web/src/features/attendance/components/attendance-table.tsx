"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Camera, 
  Download,
  UserCheck,
  Building2,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";

export interface AttendanceRowData {
  id: string;
  userId: string;
  user: {
    name: string;
    nip: string | null;
    email: string;
    avatarUrl: string | null;
  };
  status: "PRESENT" | "LATE" | "PERMIT" | "SICK" | "ABSENT";
  checkInTime: string | Date | null;
  checkInDistance: number | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInPhotoUrl: string | null;
  notes: string | null;
  date: string | Date;
}

interface AttendanceTableProps {
  data: AttendanceRowData[];
  maxRadiusMeters?: number;
}

export function AttendanceTable({
  data,
  maxRadiusMeters = 50,
}: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<AttendanceRowData | null>(null);

  // Filtered Data Memo
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Search term (Name or NIP)
      const matchesSearch =
        item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.user.nip && item.user.nip.includes(searchTerm));

      // 2. Status filter
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge variant="success" icon={<CheckCircle2 className="size-3" />}>
            Hadir Tepat Waktu
          </Badge>
        );
      case "LATE":
        return (
          <Badge variant="warning" icon={<Clock className="size-3" />}>
            Terlambat
          </Badge>
        );
      case "PERMIT":
        return (
          <Badge variant="gold" icon={<FileText className="size-3" />}>
            Izin Dinas
          </Badge>
        );
      case "SICK":
        return (
          <Badge variant="secondary" icon={<AlertTriangle className="size-3" />}>
            Sakit
          </Badge>
        );
      default:
        return <Badge variant="destructive">Alpa / Belum Absen</Badge>;
    }
  };

  // Helper format time
  const formatTime = (time: string | Date | null) => {
    if (!time) return "-";
    const date = new Date(time);
    return (
      date.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) + " WIB"
    );
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/20">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <UserCheck className="size-4.5 text-primary" />
            <span>Rekap Kehadiran Guru Hari Ini</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar absensi real-time terverifikasi dengan radius geofence & timestamp.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Cari nama guru / NIP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="size-4" />}
            />
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="PRESENT">Hadir Tepat Waktu</option>
              <option value="LATE">Terlambat</option>
              <option value="PERMIT">Izin</option>
              <option value="SICK">Sakit</option>
            </select>
          </div>

          {/* Quick Presensi Massal Button */}
          <Link
            href="/admin/bulk-attendance"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserCheck className="size-4" />
            <span>Presensi Massal</span>
          </Link>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">No</th>
              <th className="py-3.5 px-4">Guru / Tenaga Pendidik</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Jam Masuk</th>
              <th className="py-3.5 px-4">Jarak Radius</th>
              <th className="py-3.5 px-4">Keterangan</th>
              <th className="py-3.5 px-4 text-center w-28">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  Tidak ada data presensi yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const distance = row.checkInDistance;
                const isInside = distance !== null && distance <= maxRadiusMeters;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* No */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>

                    {/* Guru */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {row.user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {row.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            NIP: {row.user.nip || "-"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* Jam Masuk */}
                    <td className="py-3.5 px-4 font-mono text-xs text-foreground whitespace-nowrap">
                      {formatTime(row.checkInTime)}
                    </td>

                    {/* Jarak Geofence */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {distance !== null ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin
                            className={`size-3.5 ${
                              isInside ? "text-emerald-500" : "text-destructive"
                            }`}
                          />
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {distance.toFixed(1)} m
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            / {maxRadiusMeters} m
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Keterangan */}
                    <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                      {row.notes || "Hadir reguler"}
                    </td>

                    {/* Aksi Detail */}
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(row)}
                        className="text-xs"
                        leftIcon={<Eye className="size-3.5" />}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="p-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/10">
        <div>
          Menampilkan{" "}
          <strong className="text-foreground">
            {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{" "}
          sampai{" "}
          <strong className="text-foreground">
            {Math.min(currentPage * pageSize, filteredData.length)}
          </strong>{" "}
          dari <strong className="text-foreground">{filteredData.length}</strong> data presensi
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            leftIcon={<ChevronLeft className="size-3.5" />}
          >
            Sebelumnya
          </Button>

          <span className="px-2 font-medium">
            Halaman {currentPage} dari {totalPages}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            rightIcon={<ChevronRight className="size-3.5" />}
          >
            Selanjutnya
          </Button>
        </div>
      </div>

      {/* Detail Dialog Modal (If clicked) — portal ke body agar selalu di tengah viewport */}
      {selectedLog && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-transparent flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-card border border-border/80 rounded-2xl max-w-md w-full p-6 my-auto shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] flex flex-col gap-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <MapPin className="size-4.5 text-primary" />
                <span>Detail Verifikasi Presensi</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Nama Guru:</span>
                <span className="font-bold text-foreground">{selectedLog.user.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">NIP:</span>
                <span className="font-mono text-foreground">{selectedLog.user.nip || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Status:</span>
                <div>{renderStatusBadge(selectedLog.status)}</div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Waktu Masuk:</span>
                <span className="font-mono font-semibold text-foreground">{formatTime(selectedLog.checkInTime)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Jarak dari Titik Pusat:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedLog.checkInDistance ? `${selectedLog.checkInDistance.toFixed(1)} meter` : "-"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Koordinat GPS:</span>
                <span className="font-mono text-muted-foreground">
                  {selectedLog.checkInLat ? `${selectedLog.checkInLat}, ${selectedLog.checkInLng}` : "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1 py-1.5">
                <span className="text-muted-foreground">Catatan / Alasan:</span>
                <span className="text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                  {selectedLog.notes || "Tidak ada catatan tambahan."}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="default" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
