"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Camera, 
  CameraOff,
  Download, 
  UserCheck, 
  Calendar,
  Maximize2,
  ExternalLink,
  X,
  Cloud,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { fetchAttendancePhotoAction } from "@/server/actions/attendance.actions";
import { getOptimizedPhotoUrl, getPhotoDownloadUrl } from "@/features/attendance/lib/photo-helper";

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
  checkInPhotoUrl?: string | null;
  checkOutTime?: string | Date | null;
  checkOutDistance?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkOutPhotoUrl?: string | null;
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
  const [zoomedPhoto, setZoomedPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState(false);
  const [photoCache, setPhotoCache] = useState<
    Record<string, { checkInPhotoUrl: string | null; checkOutPhotoUrl: string | null }>
  >({});
  const [loadingPhotoLogId, setLoadingPhotoLogId] = useState<string | null>(null);

  // Reset lightbox error when photo changes
  useEffect(() => {
    setLightboxImgError(false);
  }, [zoomedPhoto]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomedPhoto) {
          setZoomedPhoto(null);
        } else if (selectedLog) {
          setSelectedLog(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedPhoto, selectedLog]);

  // On-demand photo fetch when a log is selected
  useEffect(() => {
    if (!selectedLog) return;
    const logId = selectedLog.id;

    // Check if already in photoCache
    if (photoCache[logId]) return;

    // If row already has photo URLs provided
    if (selectedLog.checkInPhotoUrl !== undefined || selectedLog.checkOutPhotoUrl !== undefined) {
      setPhotoCache((prev) => ({
        ...prev,
        [logId]: {
          checkInPhotoUrl: selectedLog.checkInPhotoUrl || null,
          checkOutPhotoUrl: selectedLog.checkOutPhotoUrl || null,
        },
      }));
      return;
    }

    let isMounted = true;
    setLoadingPhotoLogId(logId);

    fetchAttendancePhotoAction(logId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setPhotoCache((prev) => ({
            ...prev,
            [logId]: {
              checkInPhotoUrl: res.checkInPhotoUrl || null,
              checkOutPhotoUrl: res.checkOutPhotoUrl || null,
            },
          }));
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil foto presensi:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingPhotoLogId(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLog, photoCache]);

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
  const formatTime = (time: string | Date | null | undefined) => {
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

  // Helper format full date
  const formatDateFull = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return String(dateVal);
    }
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
            Daftar absensi real-time. Klik pada baris guru untuk melihat foto selfie verifikasi & detail radius geofence.
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
              <th className="py-3.5 px-4">Jam Pulang</th>
              <th className="py-3.5 px-4">Foto Presensi</th>
              <th className="py-3.5 px-4">Jarak Radius</th>
              <th className="py-3.5 px-4">Keterangan</th>
              <th className="py-3.5 px-4 text-center w-28">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                  Tidak ada data presensi yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const distance = row.checkInDistance;
                const isInside = distance !== null && distance <= maxRadiusMeters;
                const hasPhotos = Boolean(row.checkInPhotoUrl || row.checkOutPhotoUrl);

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedLog(row)}
                    className="hover:bg-primary/5 transition-colors group cursor-pointer"
                    title="Klik baris untuk melihat foto presensi & detail verifikasi"
                  >
                    {/* No */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>

                    {/* Guru */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                          {row.user.avatarUrl ? (
                            <img
                              src={getOptimizedPhotoUrl(row.user.avatarUrl)}
                              alt={row.user.name}
                              referrerPolicy="no-referrer"
                              className="size-full rounded-xl object-cover"
                            />
                          ) : (
                            row.user.name.charAt(0)
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
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

                    {/* Jam Pulang */}
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {row.checkOutTime ? formatTime(row.checkOutTime) : "-"}
                    </td>

                    {/* Foto Presensi Quick Thumbnail / Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {(() => {
                        const cached = photoCache[row.id];
                        const inPhoto = cached ? cached.checkInPhotoUrl : row.checkInPhotoUrl;
                        const outPhoto = cached ? cached.checkOutPhotoUrl : row.checkOutPhotoUrl;
                        const hasCachedPhotos = Boolean(inPhoto || outPhoto);

                        if (cached && !hasCachedPhotos) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 italic">
                              <CameraOff className="size-3" />
                              <span>Tanpa Foto</span>
                            </span>
                          );
                        }

                        if (hasCachedPhotos) {
                          return (
                            <div className="flex items-center gap-1.5">
                              {inPhoto && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomedPhoto({
                                      url: inPhoto,
                                      title: `Foto Masuk - ${row.user.name}`,
                                      subtitle: `Waktu Masuk: ${formatTime(row.checkInTime)} ${row.checkInDistance ? `• Jarak: ${row.checkInDistance.toFixed(1)}m` : ""}`,
                                    });
                                  }}
                                  className="relative size-8 rounded-lg overflow-hidden border border-border/80 hover:border-primary shadow-2xs hover:scale-110 transition-all cursor-pointer group/photo"
                                  title="Klik untuk perbesar Foto Masuk"
                                >
                                  <img
                                    src={getOptimizedPhotoUrl(inPhoto)}
                                    alt="Foto Masuk"
                                    referrerPolicy="no-referrer"
                                    className="size-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="size-3 text-white" />
                                  </div>
                                </button>
                              )}
                              {outPhoto && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomedPhoto({
                                      url: outPhoto,
                                      title: `Foto Pulang - ${row.user.name}`,
                                      subtitle: `Waktu Pulang: ${formatTime(row.checkOutTime)} ${row.checkOutDistance ? `• Jarak: ${row.checkOutDistance.toFixed(1)}m` : ""}`,
                                    });
                                  }}
                                  className="relative size-8 rounded-lg overflow-hidden border border-border/80 hover:border-primary shadow-2xs hover:scale-110 transition-all cursor-pointer group/photo"
                                  title="Klik untuk perbesar Foto Pulang"
                                >
                                  <img
                                    src={getOptimizedPhotoUrl(outPhoto)}
                                    alt="Foto Pulang"
                                    referrerPolicy="no-referrer"
                                    className="size-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="size-3 text-white" />
                                  </div>
                                </button>
                              )}
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                Ada Foto
                              </span>
                            </div>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(row);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 hover:border-primary/50 bg-muted/40 hover:bg-primary/5 text-foreground/80 hover:text-primary text-xs font-medium transition-colors cursor-pointer group/btn"
                            title="Klik untuk memuat foto selfie & detail verifikasi guru"
                          >
                            <Camera className="size-3.5 text-primary group-hover/btn:scale-110 transition-transform" />
                            <span>Lihat Foto</span>
                          </button>
                        );
                      })()}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(row);
                        }}
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

      {/* Detail Dialog Modal (When a teacher / row is clicked) */}
      {selectedLog && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full p-5 sm:p-6 my-auto shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {selectedLog.user.avatarUrl ? (
                    <img
                      src={getOptimizedPhotoUrl(selectedLog.user.avatarUrl)}
                      alt={selectedLog.user.name}
                      referrerPolicy="no-referrer"
                      className="size-full rounded-xl object-cover"
                    />
                  ) : (
                    selectedLog.user.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <span>{selectedLog.user.name}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">NIP: {selectedLog.user.nip || "Belum diisi"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-primary" />
                      {formatDateFull(selectedLog.date)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div>{renderStatusBadge(selectedLog.status)}</div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="size-8 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Tutup (ESC)"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Attendance Selfie Photo Verification Section */}
            {(() => {
              const selectedPhotos = photoCache[selectedLog.id] || {
                checkInPhotoUrl: selectedLog.checkInPhotoUrl ?? null,
                checkOutPhotoUrl: selectedLog.checkOutPhotoUrl ?? null,
              };
              const isPhotoLoading = Boolean(loadingPhotoLogId === selectedLog.id);

              return (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="size-4 text-primary" />
                      <span>Foto Presensi Terverifikasi</span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Klik foto untuk melihat ukuran penuh
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Foto Presensi Masuk */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-emerald-500" />
                          <span>Presensi Masuk</span>
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatTime(selectedLog.checkInTime)}
                        </span>
                      </div>

                      {isPhotoLoading ? (
                        <div className="aspect-4/3 rounded-lg border border-border/60 bg-muted/20 flex flex-col items-center justify-center p-4 text-center gap-2">
                          <Loader2 className="size-6 animate-spin text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">
                            Mengambil foto verifikasi...
                          </span>
                        </div>
                      ) : selectedPhotos.checkInPhotoUrl ? (
                        <div className="space-y-2">
                          <div
                            onClick={() =>
                              setZoomedPhoto({
                                url: selectedPhotos.checkInPhotoUrl!,
                                title: `Foto Selfie Masuk - ${selectedLog.user.name}`,
                                subtitle: `Waktu Masuk: ${formatTime(selectedLog.checkInTime)} ${
                                  selectedLog.checkInDistance
                                    ? `• Jarak Radius: ${selectedLog.checkInDistance.toFixed(1)} m`
                                    : ""
                                }`,
                              })
                            }
                            className="relative aspect-4/3 rounded-lg overflow-hidden border border-border/80 bg-black/5 dark:bg-white/5 group cursor-pointer shadow-xs"
                          >
                            <img
                              src={getOptimizedPhotoUrl(selectedPhotos.checkInPhotoUrl)}
                              alt="Foto Presensi Masuk"
                              referrerPolicy="no-referrer"
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Google Drive indicator badge if saved in drive */}
                            {(selectedPhotos.checkInPhotoUrl.includes("googleusercontent.com") ||
                              selectedPhotos.checkInPhotoUrl.includes("drive.google.com")) && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                                <Cloud className="size-3" />
                                <span>Google Drive</span>
                              </span>
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-2xs">
                              <Maximize2 className="size-5" />
                              <span className="text-[11px] font-bold">Perbesar Foto</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                            <span className="font-mono">
                              {selectedLog.checkInDistance
                                ? `Jarak: ${selectedLog.checkInDistance.toFixed(1)} m`
                                : "Jarak tidak tercatat"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedPhoto({
                                  url: selectedPhotos.checkInPhotoUrl!,
                                  title: `Foto Selfie Masuk - ${selectedLog.user.name}`,
                                  subtitle: `Waktu: ${formatTime(selectedLog.checkInTime)}`,
                                })
                              }
                              className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 className="size-3" />
                              <span>Ukuran Penuh</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-4/3 rounded-lg border border-dashed border-border flex flex-col items-center justify-center p-4 text-center bg-muted/10">
                          <CameraOff className="size-7 text-muted-foreground/40 mb-1.5" />
                          <span className="text-xs font-semibold text-foreground">
                            Tidak Ada Foto Masuk
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            Presensi via fingerprint atau manual tanpa selfie.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. Foto Presensi Pulang */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-blue-500" />
                          <span>Presensi Pulang</span>
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {selectedLog.checkOutTime ? formatTime(selectedLog.checkOutTime) : "Belum Pulang"}
                        </span>
                      </div>

                      {isPhotoLoading ? (
                        <div className="aspect-4/3 rounded-lg border border-border/60 bg-muted/20 flex flex-col items-center justify-center p-4 text-center gap-2">
                          <Loader2 className="size-6 animate-spin text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">
                            Mengambil foto verifikasi...
                          </span>
                        </div>
                      ) : selectedPhotos.checkOutPhotoUrl ? (
                        <div className="space-y-2">
                          <div
                            onClick={() =>
                              setZoomedPhoto({
                                url: selectedPhotos.checkOutPhotoUrl!,
                                title: `Foto Selfie Pulang - ${selectedLog.user.name}`,
                                subtitle: `Waktu Pulang: ${formatTime(selectedLog.checkOutTime)} ${
                                  selectedLog.checkOutDistance
                                    ? `• Jarak Radius: ${selectedLog.checkOutDistance.toFixed(1)} m`
                                    : ""
                                }`,
                              })
                            }
                            className="relative aspect-4/3 rounded-lg overflow-hidden border border-border/80 bg-black/5 dark:bg-white/5 group cursor-pointer shadow-xs"
                          >
                            <img
                              src={getOptimizedPhotoUrl(selectedPhotos.checkOutPhotoUrl)}
                              alt="Foto Presensi Pulang"
                              referrerPolicy="no-referrer"
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {(selectedPhotos.checkOutPhotoUrl.includes("googleusercontent.com") ||
                              selectedPhotos.checkOutPhotoUrl.includes("drive.google.com")) && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                                <Cloud className="size-3" />
                                <span>Google Drive</span>
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-2xs">
                              <Maximize2 className="size-5" />
                              <span className="text-[11px] font-bold">Perbesar Foto</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                            <span className="font-mono">
                              {selectedLog.checkOutDistance
                                ? `Jarak: ${selectedLog.checkOutDistance.toFixed(1)} m`
                                : "Jarak tidak tercatat"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedPhoto({
                                  url: selectedPhotos.checkOutPhotoUrl!,
                                  title: `Foto Selfie Pulang - ${selectedLog.user.name}`,
                                  subtitle: `Waktu: ${formatTime(selectedLog.checkOutTime)}`,
                                })
                              }
                              className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 className="size-3" />
                              <span>Ukuran Penuh</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedLog.checkOutTime ? (
                        <div className="aspect-4/3 rounded-lg border border-dashed border-border flex flex-col items-center justify-center p-4 text-center bg-muted/10">
                          <CameraOff className="size-7 text-muted-foreground/40 mb-1.5" />
                          <span className="text-xs font-semibold text-foreground">
                            Pulang Tercatat: {formatTime(selectedLog.checkOutTime)}
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            Presensi pulang dicatat tanpa foto selfie.
                          </span>
                        </div>
                      ) : (
                        <div className="aspect-4/3 rounded-lg border border-dashed border-border/60 flex flex-col items-center justify-center p-4 text-center bg-muted/5">
                          <Clock className="size-7 text-muted-foreground/30 mb-1.5" />
                          <span className="text-xs font-medium text-muted-foreground">
                            Belum Presensi Pulang
                          </span>
                          <span className="text-[11px] text-muted-foreground/80 mt-0.5">
                            Guru belum melakukan clock-out untuk hari ini.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Detail Verification Metadata */}
            <div className="border-t border-border/60 pt-4 flex flex-col gap-3 text-xs">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                <span>Geolokasi & Catatan Kehadiran</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col gap-1.5">
                  <span className="text-muted-foreground font-medium">Jarak Radius Geofence:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm">
                      {selectedLog.checkInDistance ? `${selectedLog.checkInDistance.toFixed(1)} meter` : "-"}
                    </span>
                    {selectedLog.checkInDistance !== null && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedLog.checkInDistance <= maxRadiusMeters
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}
                      >
                        {selectedLog.checkInDistance <= maxRadiusMeters
                          ? "Dalam Radius"
                          : "Di Luar Radius"}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Batas radius sekolah: {maxRadiusMeters} meter
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col gap-1.5">
                  <span className="text-muted-foreground font-medium">Koordinat GPS Masuk:</span>
                  <span className="font-mono font-semibold text-foreground text-xs">
                    {selectedLog.checkInLat ? `${selectedLog.checkInLat}, ${selectedLog.checkInLng}` : "-"}
                  </span>
                  {selectedLog.checkInLat && selectedLog.checkInLng && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedLog.checkInLat},${selectedLog.checkInLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold mt-0.5"
                    >
                      <ExternalLink className="size-3" />
                      <span>Buka Lokasi di Google Maps</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col gap-1">
                <span className="text-muted-foreground font-medium">Catatan / Alasan:</span>
                <p className="text-foreground font-normal leading-relaxed">
                  {selectedLog.notes || "Hadir reguler (tidak ada catatan tambahan)."}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button size="sm" variant="default" onClick={() => setSelectedLog(null)}>
                Tutup Detail
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {zoomedPhoto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setZoomedPhoto(null)}
        >
          {/* Lightbox Topbar */}
          <div
            className="flex items-center justify-between text-white border-b border-white/10 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {zoomedPhoto.title}
              </h3>
              {zoomedPhoto.subtitle && (
                <p className="text-xs text-white/70 mt-0.5">
                  {zoomedPhoto.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getOptimizedPhotoUrl(zoomedPhoto.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Buka Foto Asli di Tab Baru"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Buka Asli</span>
              </a>

              <a
                href={getPhotoDownloadUrl(zoomedPhoto.url)}
                download={`presensi-${Date.now()}.jpg`}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh Gambar"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Unduh</span>
              </a>

              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="size-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Tutup (ESC)"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            {lightboxImgError ? (
              <div 
                className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-2xl max-w-md text-center gap-3 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertTriangle className="size-10 text-amber-400" />
                <h4 className="text-white font-bold text-sm">Gagal Menampilkan Foto</h4>
                <p className="text-white/70 text-xs leading-relaxed">
                  Gambar tidak dapat dimuat secara langsung karena pembatasan akses atau kendala jaringan.
                </p>
                <a
                  href={getOptimizedPhotoUrl(zoomedPhoto.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mt-2"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Buka Gambar di Tab Baru</span>
                </a>
              </div>
            ) : (
              <img
                src={getOptimizedPhotoUrl(zoomedPhoto.url)}
                alt={zoomedPhoto.title}
                referrerPolicy="no-referrer"
                onError={() => setLightboxImgError(true)}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
              />
            )}
          </div>

          {/* Lightbox Footer */}
          <div className="text-center text-xs text-white/60 pt-2 border-t border-white/10">
            Klik area gelap atau tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/90 font-mono">ESC</kbd> untuk menutup tampilan penuh.
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
