"use client";

import React, { useState, useTransition } from "react";
import {
  ClipboardCheck,
  Check,
  X,
  Search,
  Calendar,
  Paperclip,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Filter,
  RefreshCw,
  Eye,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  approvePermitAction,
  rejectPermitAction,
  getAdminPermitsListAction,
} from "@/server/actions/permit.actions";
import { getOptimizedPhotoUrl } from "@/features/attendance/lib/photo-helper";
import { PermitStatus } from "@prisma/client";

interface PermitItem {
  id: string;
  type: "PERMIT" | "SICK" | "DUTY";
  status: "PENDING" | "APPROVED" | "REJECTED";
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  notes: string;
  attachmentUrl: string | null;
  rejectionReason: string | null;
  approvedAt: Date | string | null;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    nip: string | null;
    avatarUrl: string | null;
    position: { name: string } | null;
  };
  approvedBy: {
    id: string;
    name: string;
  } | null;
}

interface AdminPermitsViewProps {
  initialData?: {
    data: PermitItem[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null;
}

export function AdminPermitsView({ initialData }: AdminPermitsViewProps) {
  const [permits, setPermits] = useState<PermitItem[]>(initialData?.data || []);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const refreshData = async () => {
    const res = await getAdminPermitsListAction();
    if (res?.success && res.data) {
      setPermits(res.data.data as any);
    }
  };

  const handleApprove = (permit: PermitItem) => {
    const permitTypeLabel =
      permit.type === "DUTY" ? "Dinas Luar" : permit.type === "SICK" ? "Sakit" : "Izin";

    Swal.fire({
      title: "Setujui Permohonan?",
      html: `Konfirmasi persetujuan <b>${permitTypeLabel}</b> untuk <b>${permit.user.name}</b> (${permit.totalDays} hari).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Setujui",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    }).then((result) => {
      if (result.isConfirmed) {
        setActionLoadingId(permit.id);
        startTransition(async () => {
          const res = await approvePermitAction(permit.id);
          setActionLoadingId(null);
          if (res.success) {
            Swal.fire({
              icon: "success",
              title: "Berhasil Disetujui",
              text: res.message,
              timer: 2000,
              showConfirmButton: false,
            });
            refreshData();
          } else {
            Swal.fire("Gagal", res.error || "Gagal menyetujui", "error");
          }
        });
      }
    });
  };

  const handleReject = (permit: PermitItem) => {
    Swal.fire({
      title: "Tolak Permohonan?",
      html: `Berikan catatan alasan penolakan untuk <b>${permit.user.name}</b>:`,
      input: "textarea",
      inputPlaceholder: "Contoh: Surat keterangan dokter belum dilampirkan...",
      showCancelButton: true,
      confirmButtonText: "Tolak Permohonan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage("Alasan penolakan wajib diisi!");
        }
        return value;
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setActionLoadingId(permit.id);
        startTransition(async () => {
          const res = await rejectPermitAction(permit.id, result.value);
          setActionLoadingId(null);
          if (res.success) {
            Swal.fire({
              icon: "success",
              title: "Permohonan Ditolak",
              text: res.message,
              timer: 2000,
              showConfirmButton: false,
            });
            refreshData();
          } else {
            Swal.fire("Gagal", res.error || "Gagal menolak", "error");
          }
        });
      }
    });
  };

  const handleViewAttachment = (url: string, name: string) => {
    Swal.fire({
      title: `Bukti Surat: ${name}`,
      html: url.startsWith("data:application/pdf")
        ? `<embed src="${url}" type="application/pdf" width="100%" height="450px" />`
        : `<div class="max-h-[70vh] overflow-auto flex justify-center"><img src="${getOptimizedPhotoUrl(url)}" referrerpolicy="no-referrer" class="rounded-xl max-w-full max-h-[60vh] object-contain shadow-md" alt="Bukti Surat" /></div>`,
      width: "650px",
      confirmButtonText: "Tutup",
      confirmButtonColor: "#059669",
    });
  };

  const filteredPermits = permits.filter((p) => {
    if (activeTab !== "ALL" && p.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.user?.name?.toLowerCase().includes(q);
      const matchNip = p.user?.nip?.includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      return matchName || matchNip || matchNotes;
    }
    return true;
  });

  const totalCount = permits.length;
  const pendingCount = permits.filter((p) => p.status === "PENDING").length;
  const approvedCount = permits.filter((p) => p.status === "APPROVED").length;
  const rejectedCount = permits.filter((p) => p.status === "REJECTED").length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 via-indigo-800 to-indigo-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-md">
              <ClipboardCheck className="h-7 w-7 text-blue-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pusat Persetujuan Izin, Cuti & Dinas Luar</h1>
              <p className="text-sm text-blue-100">
                Verifikasi dan arsip digital permohonan izin, sakit, maupun penugasan dinas luar guru & tenaga kependidikan madrasah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Segarkan
            </button>
          </div>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground font-medium">Total Permohonan</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totalCount}</div>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-xs">
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center justify-between">
            <span>Menunggu Approval</span>
            {pendingCount > 0 && (
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {pendingCount}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Disetujui</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {approvedCount}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-xs">
          <div className="text-xs text-rose-700 dark:text-rose-400 font-medium">Ditolak</div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "ALL"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({totalCount})
            </button>

            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "PENDING"
                  ? "bg-card text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Menunggu ({pendingCount})
            </button>

            <button
              onClick={() => setActiveTab("APPROVED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "APPROVED"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Disetujui ({approvedCount})
            </button>

            <button
              onClick={() => setActiveTab("REJECTED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "REJECTED"
                  ? "bg-card text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ditolak ({rejectedCount})
            </button>
          </div>

          {/* Search */}
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tabel Permohonan */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs text-muted-foreground">
            <thead className="bg-muted/50 text-[11px] uppercase font-bold text-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Guru & Pegawai</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Rentang Tanggal</th>
                <th className="px-4 py-3">Alasan / Catatan</th>
                <th className="px-4 py-3 text-center">Bukti Surat</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPermits.map((permit) => {
                const isSick = permit.type === "SICK";
                const isDuty = permit.type === "DUTY";
                const isPendingItem = permit.status === "PENDING";
                const isApproved = permit.status === "APPROVED";
                const isRejected = permit.status === "REJECTED";
                const isProcessing = actionLoadingId === permit.id;

                const startFormatted = new Date(permit.startDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const endFormatted = new Date(permit.endDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const dateRangeStr =
                  permit.startDate === permit.endDate
                    ? startFormatted
                    : `${startFormatted} s/d ${endFormatted}`;

                return (
                  <tr key={permit.id} className="hover:bg-muted/30 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {permit.user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-xs leading-snug">
                            {permit.user.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {permit.user.nip || permit.user.position?.name || "Guru"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDuty
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            : isSick
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {isDuty ? "💼 Dinas Luar" : isSick ? "🩺 Sakit" : "📋 Izin"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{dateRangeStr}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {permit.totalDays} Hari Kerja
                        </span>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-foreground/90 italic" title={permit.notes}>
                        &ldquo;{permit.notes}&rdquo;
                      </p>
                      {permit.rejectionReason && (
                        <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                          Alasan Ditolak: {permit.rejectionReason}
                        </p>
                      )}
                    </td>

                    {/* Attachment */}
                    <td className="px-4 py-3.5 text-center">
                      {permit.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() => handleViewAttachment(permit.attachmentUrl!, permit.user.name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2 py-1 text-[10px] font-semibold text-primary transition-colors"
                        >
                          <Paperclip className="size-3" />
                          <span>Lihat Surat</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {isPendingItem && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          <Clock className="size-3" /> Menunggu
                        </span>
                      )}
                      {isApproved && (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" /> Disetujui
                          </span>
                          {permit.approvedBy && (
                            <span className="text-[9px] text-muted-foreground mt-0.5">
                              oleh {permit.approvedBy.name}
                            </span>
                          )}
                        </div>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          <XCircle className="size-3" /> Ditolak
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      {isPendingItem ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isProcessing || isPending}
                            onClick={() => handleReject(permit)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors disabled:opacity-50"
                          >
                            Tolak
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing || isPending}
                            onClick={() => handleApprove(permit)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <RefreshCw className="size-3 animate-spin" />
                            ) : (
                              <Check className="size-3" />
                            )}
                            Setujui
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Telah diproses
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPermits.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Tidak ada data permohonan izin yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
