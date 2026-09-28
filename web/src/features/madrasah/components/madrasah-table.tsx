"use client";

import React, { useState, useMemo } from "react";
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Power, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  School,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { FormInput } from "@/components/molecules/form-field";
import { toggleMadrasahAction, createMadrasahAction } from "@/server/actions/madrasah.actions";

export interface MadrasahRow {
  id: string;
  name: string;
  nsm: string;
  npsn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  settings: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  } | null;
  _count: {
    users: number;
    attendanceLogs: number;
  };
}

interface MadrasahTableProps {
  initialData: MadrasahRow[];
}

export function MadrasahTable({ initialData }: MadrasahTableProps) {
  const [data, setData] = useState<MadrasahRow[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Madrasah Form State
  const [formData, setFormData] = useState({
    name: "",
    nsm: "",
    npsn: "",
    address: "",
    phone: "",
    email: "",
    latitude: "-6.2615",
    longitude: "106.8106",
    radiusMeters: "50",
  });

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nsm.includes(searchTerm) ||
        (item.npsn && item.npsn.includes(searchTerm));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.isActive) ||
        (statusFilter === "INACTIVE" && !item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (item: MadrasahRow) => {
    setTogglingId(item.id);
    const res = await toggleMadrasahAction(item.id, item.isActive);
    if (res?.success) {
      setData((prev) =>
        prev.map((m) =>
          m.id === item.id ? { ...m, isActive: !item.isActive } : m
        )
      );
    }
    setTogglingId(null);
  };

  // Handle Form Submission
  const handleCreateMadrasah = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.nsm.trim()) {
      setFormError("Nama Madrasah dan NSM wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createMadrasahAction({
        name: formData.name,
        nsm: formData.nsm,
        npsn: formData.npsn || undefined,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        latitude: parseFloat(formData.latitude) || -6.2615,
        longitude: parseFloat(formData.longitude) || 106.8106,
        radiusMeters: parseFloat(formData.radiusMeters) || 50,
      });

      if (res?.error) {
        setFormError(res.error);
        setIsSubmitting(false);
        return;
      }

      if (res?.data) {
        setData((prev) => [
          {
            ...res.data,
            _count: { users: 0, attendanceLogs: 0 },
          } as unknown as MadrasahRow,
          ...prev,
        ]);
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        nsm: "",
        npsn: "",
        address: "",
        phone: "",
        email: "",
        latitude: "-6.2615",
        longitude: "106.8106",
        radiusMeters: "50",
      });
    } catch {
      setFormError("Terjadi kesalahan sistem saat menyimpan madrasah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Top Header Controls */}
      <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/20">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Building2 className="size-4.5 text-primary" />
            <span>Daftar Seluruh Madrasah Ibtidaiyah</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manajemen entitas madrasah, status izin operasional, dan parameter geofence.
          </p>
        </div>

        {/* Right Action & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-60">
            <Input
              placeholder="Cari nama / NSM / NPSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="size-4" />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif Saja</option>
            <option value="INACTIVE">Nonaktif Saja</option>
          </select>

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="size-4" />}
          >
            Tambah Madrasah
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">No</th>
              <th className="py-3.5 px-4">Nama Madrasah & NSM</th>
              <th className="py-3.5 px-4">Kontak & Alamat</th>
              <th className="py-3.5 px-4">Koordinat & Radius</th>
              <th className="py-3.5 px-4 text-center">Guru</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  Tidak ada madrasah yang ditemukan.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  {/* No */}
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </td>

                  {/* Nama Madrasah & NSM */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                        <School className="size-4.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground text-sm truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <span>NSM: {item.nsm}</span>
                          {item.npsn && <span>&bull; NPSN: {item.npsn}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Kontak & Alamat */}
                  <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs">
                    <p className="truncate text-foreground font-medium">
                      {item.address || "Belum ada alamat"}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {item.phone || item.email || "-"}
                    </span>
                  </td>

                  {/* Koordinat Geofence */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                    {item.settings ? (
                      <div className="flex flex-col font-mono text-[11px]">
                        <span className="text-foreground font-medium flex items-center gap-1">
                          <MapPin className="size-3 text-primary" />
                          {item.settings.latitude.toFixed(4)}, {item.settings.longitude.toFixed(4)}
                        </span>
                        <span className="text-muted-foreground">
                          Radius: <strong className="text-emerald-600 dark:text-emerald-400">{item.settings.radiusMeters}m</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* Jumlah Guru */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                      <Users className="size-3" />
                      <span>{item._count.users}</span>
                    </span>
                  </td>

                  {/* Status Aktif / Nonaktif */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.isActive ? (
                      <Badge variant="success" icon={<CheckCircle2 className="size-3" />}>
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="destructive" icon={<XCircle className="size-3" />}>
                        Nonaktif
                      </Badge>
                    )}
                  </td>

                  {/* Aksi Toggle */}
                  <td className="py-3.5 px-4 text-center">
                    <Button
                      size="sm"
                      variant={item.isActive ? "destructive" : "outline"}
                      isLoading={togglingId === item.id}
                      onClick={() => handleToggleStatus(item)}
                      className="text-xs"
                      leftIcon={<Power className="size-3.5" />}
                    >
                      {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
        <span>Menampilkan <strong>{filteredData.length}</strong> madrasah</span>
        <span>Sistem Multi-Tenant Terisolasi Kemenag</span>
      </div>

      {/* Modal Dialog Tambah Madrasah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Tambah Madrasah Baru
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Daftarkan entitas madrasah dan konfigurasi koordinat geofencing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMadrasah} className="flex flex-col gap-3.5 text-xs">
              <FormInput
                label="Nama Madrasah Ibtidaiyah"
                required
                placeholder="Contoh: MIN 2 Jakarta Barat"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="NSM (Wajib)"
                  required
                  placeholder="111131740002"
                  value={formData.nsm}
                  onChange={(e) => setFormData({ ...formData, nsm: e.target.value })}
                />
                <FormInput
                  label="NPSN (Opsional)"
                  placeholder="60721235"
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                />
              </div>

              <FormInput
                label="Alamat Madrasah"
                placeholder="Jl. Pendidikan Islam No. 10, Jakarta Barat"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="No. Telepon"
                  placeholder="021-5551234"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <FormInput
                  label="Email Madrasah"
                  type="email"
                  placeholder="kontak@min2jakbar.sch.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-2.5">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <MapPin className="size-3.5 text-primary" />
                  Konfigurasi Geofencing GPS:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <FormInput
                    label="Latitude"
                    placeholder="-6.2615"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                  <FormInput
                    label="Longitude"
                    placeholder="106.8106"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                  <FormInput
                    label="Radius (Meter)"
                    placeholder="50"
                    value={formData.radiusMeters}
                    onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Simpan Madrasah
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
