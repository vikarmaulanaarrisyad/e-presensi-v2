"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Hash, Phone, Lock, X, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { FormInput } from "@/components/molecules/form-field";
import { createTeacherAction, updateTeacherAction } from "@/server/actions/teacher.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";

export interface TeacherData {
  id: string;
  name: string;
  email: string;
  nip: string | null;
  phone: string | null;
  isActive: boolean;
}

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  madrasahId: string;
  teacherToEdit?: TeacherData | null;
  onSuccess: () => void;
}

export function TeacherFormModal({
  isOpen,
  onClose,
  madrasahId,
  teacherToEdit,
  onSuccess,
}: TeacherFormModalProps) {
  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(teacherToEdit);

  useEffect(() => {
    if (teacherToEdit) {
      setName(teacherToEdit.name || "");
      setNip(teacherToEdit.nip || "");
      setEmail(teacherToEdit.email || "");
      setPhone(teacherToEdit.phone || "");
      setIsActive(teacherToEdit.isActive ?? true);
      setPassword("");
    } else {
      setName("");
      setNip("");
      setEmail("");
      setPhone("");
      setPassword("Password123!");
      setIsActive(true);
    }
  }, [teacherToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      swalError("Form Belum Lengkap", "Nama dan Email wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    swalLoading(
      isEditing ? "Menyimpan Perubahan..." : "Mendaftarkan Guru...",
      "Sedang memproses data di database..."
    );

    let res: any;
    if (isEditing && teacherToEdit) {
      res = await updateTeacherAction(teacherToEdit.id, {
        name,
        nip: nip || null,
        email,
        phone: phone || null,
        password: password || undefined,
        isActive,
      });
    } else {
      res = await createTeacherAction(madrasahId, {
        name,
        nip: nip || null,
        email,
        phone: phone || null,
        password: password || "Password123!",
        isActive,
      });
    }

    setIsSubmitting(false);
    swalClose();

    if (res?.success) {
      swalSuccess(
        isEditing ? "Berhasil Diperbarui!" : "Guru Berhasil Ditambahkan!",
        isEditing
          ? "Perubahan biodata guru telah disimpan."
          : `Akun guru ${name} telah siap digunakan untuk presensi mobile.`
      );
      onSuccess();
      onClose();
    } else {
      swalError("Gagal Menyimpan", res?.error || "Terjadi kesalahan saat menyimpan data guru.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border/70 flex items-center justify-between bg-gradient-to-r from-[#042817] to-[#0A5C36] text-white">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-accent">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {isEditing ? "Edit Data Guru" : "Tambah Guru Baru"}
              </h2>
              <p className="text-xs text-emerald-100/90">
                {isEditing
                  ? "Perbarui informasi profil dan nomor kontak pendidik."
                  : "Daftarkan pendidik baru ke dalam presensi madrasah."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <FormInput
            label="Nama Lengkap & Gelar"
            placeholder="Contoh: Muhammad Ihsan, S.Pd.I"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="NIP / NIK"
              placeholder="Contoh: 198801012015011002"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
            />

            <FormInput
              label="Nomor WhatsApp / HP"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <FormInput
            label="Email Akun Login"
            type="email"
            placeholder="Contoh: ihsan@kemenag.go.id"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <FormInput
            label={isEditing ? "Kata Sandi Baru (Kosongkan jika tidak diubah)" : "Kata Sandi Awal"}
            type="text"
            placeholder={isEditing ? "Biarkan kosong untuk password lama" : "Default: Password123!"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-between border-t border-border/60">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                Status Akun Guru
              </span>
              <span className="text-[11px] text-muted-foreground">
                Guru non-aktif tidak dapat melakukan absensi mobile.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>

            <Button
              type="submit"
              variant="default"
              size="default"
              isLoading={isSubmitting}
              leftIcon={<Save className="size-4" />}
            >
              {isEditing ? "Simpan Perubahan" : "Daftarkan Guru"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
