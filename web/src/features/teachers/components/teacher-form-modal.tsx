"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Hash, 
  Phone, 
  Lock, 
  X, 
  Save, 
  ShieldCheck, 
  Award, 
  Calendar, 
  MapPin, 
  IdCard, 
  Briefcase,
  BadgeCheck
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { FormInput } from "@/components/molecules/form-field";
import { createTeacherAction, updateTeacherAction } from "@/server/actions/teacher.actions";
import { swalLoading, swalSuccess, swalError, swalClose } from "@/lib/swal";
import { formatTeacherName, stripLeadingQuote } from "@/lib/excel-helpers";

export interface TeacherData {
  id: string;
  name: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  email: string;
  nip?: string | null;
  nik?: string | null;
  pegId?: string | null;
  nuptk?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | Date | null;
  gender?: string | null;
  statusKepegawaian?: string | null;
  jenisGtk?: string | null;
  phone?: string | null;
  isActive: boolean;
  positionId?: string | null;
}

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  madrasahId: string;
  teacherToEdit?: TeacherData | null;
  positions?: { id: string; name: string; code?: string | null; isHeadmaster?: boolean }[];
  onSuccess: () => void;
}

export function TeacherFormModal({
  isOpen,
  onClose,
  madrasahId,
  teacherToEdit,
  positions = [],
  onSuccess,
}: TeacherFormModalProps) {
  const [activeTab, setActiveTab] = useState<"identitas" | "kepegawaian" | "akun">("identitas");

  // Identitas & Gelar
  const [name, setName] = useState("");
  const [gelarDepan, setGelarDepan] = useState("");
  const [gelarBelakang, setGelarBelakang] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [gender, setGender] = useState("L");

  // Kepegawaian EMIS GTK
  const [pegId, setPegId] = useState("");
  const [nuptk, setNuptk] = useState("");
  const [nip, setNip] = useState("");
  const [nik, setNik] = useState("");
  const [statusKepegawaian, setStatusKepegawaian] = useState("PNS");
  const [jenisGtk, setJenisGtk] = useState("Guru Mapel");
  const [positionId, setPositionId] = useState("");

  // Akun Login & Kontak
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(teacherToEdit);

  useEffect(() => {
    if (teacherToEdit) {
      setName(stripLeadingQuote(teacherToEdit.name) || "");
      setGelarDepan(stripLeadingQuote(teacherToEdit.gelarDepan) || "");
      setGelarBelakang(stripLeadingQuote(teacherToEdit.gelarBelakang) || "");
      setTempatLahir(stripLeadingQuote(teacherToEdit.tempatLahir) || "");
      
      if (teacherToEdit.tanggalLahir) {
        const d = new Date(teacherToEdit.tanggalLahir);
        if (!isNaN(d.getTime())) {
          setTanggalLahir(d.toISOString().split("T")[0]);
        } else {
          setTanggalLahir("");
        }
      } else {
        setTanggalLahir("");
      }

      setGender(teacherToEdit.gender ? (teacherToEdit.gender.toUpperCase().startsWith("P") ? "P" : "L") : "L");

      setPegId(stripLeadingQuote(teacherToEdit.pegId) || "");
      setNuptk(stripLeadingQuote(teacherToEdit.nuptk) || "");
      setNip(stripLeadingQuote(teacherToEdit.nip) || "");
      setNik(stripLeadingQuote(teacherToEdit.nik) || "");
      setStatusKepegawaian(stripLeadingQuote(teacherToEdit.statusKepegawaian) || "PNS");
      setJenisGtk(stripLeadingQuote(teacherToEdit.jenisGtk) || "Guru Mapel");
      setPositionId(teacherToEdit.positionId || "");

      setEmail(stripLeadingQuote(teacherToEdit.email) || "");
      setPhone(stripLeadingQuote(teacherToEdit.phone) || "");
      setIsActive(teacherToEdit.isActive ?? true);
      setPassword("");
    } else {
      setName("");
      setGelarDepan("");
      setGelarBelakang("");
      setTempatLahir("");
      setTanggalLahir("");
      setGender("L");

      setPegId("");
      setNuptk("");
      setNip("");
      setNik("");
      setStatusKepegawaian("PNS");
      setJenisGtk("Guru Mapel");
      setPositionId("");

      setEmail("");
      setPhone("");
      setPassword("Password123!");
      setIsActive(true);
    }
    setActiveTab("identitas");
  }, [teacherToEdit, isOpen]);

  if (!isOpen) return null;

  // Auto-generate preview formatted name
  const formattedPreview = formatTeacherName(name, gelarDepan, gelarBelakang);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = stripLeadingQuote(name);
    const cleanEmail = stripLeadingQuote(email);

    if (!cleanName) {
      swalError("Form Belum Lengkap", "Nama Lengkap Guru wajib diisi.");
      setActiveTab("identitas");
      return;
    }

    if (!cleanEmail) {
      swalError("Form Belum Lengkap", "Email Akun Login wajib diisi.");
      setActiveTab("akun");
      return;
    }

    setIsSubmitting(true);
    swalLoading(
      isEditing ? "Menyimpan Perubahan..." : "Mendaftarkan Guru...",
      "Sedang menyelaraskan data dengan database EMIS GTK..."
    );

    const payload = {
      name: cleanName,
      gelarDepan: stripLeadingQuote(gelarDepan) || null,
      gelarBelakang: stripLeadingQuote(gelarBelakang) || null,
      pegId: stripLeadingQuote(pegId) || null,
      nuptk: stripLeadingQuote(nuptk) || null,
      nip: stripLeadingQuote(nip) || null,
      nik: stripLeadingQuote(nik) || null,
      tempatLahir: stripLeadingQuote(tempatLahir) || null,
      tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
      gender: gender || null,
      statusKepegawaian: stripLeadingQuote(statusKepegawaian) || null,
      jenisGtk: stripLeadingQuote(jenisGtk) || null,
      email: cleanEmail.toLowerCase(),
      phone: stripLeadingQuote(phone) || null,
      positionId: positionId || null,
      isActive,
    };

    let res: any;
    if (isEditing && teacherToEdit) {
      res = await updateTeacherAction(teacherToEdit.id, {
        ...payload,
        password: password.trim() ? password.trim() : undefined,
      });
    } else {
      res = await createTeacherAction(madrasahId, {
        ...payload,
        password: password.trim() || "Password123!",
      });
    }

    setIsSubmitting(false);
    swalClose();

    if (res?.success) {
      swalSuccess(
        isEditing ? "Berhasil Diperbarui!" : "Guru Berhasil Ditambahkan!",
        isEditing
          ? `Data ${formattedPreview} berhasil diperbarui.`
          : `Akun GTK untuk ${formattedPreview} siap digunakan.`
      );
      onSuccess();
      onClose();
    } else {
      swalError("Gagal Menyimpan", res?.error || "Terjadi kesalahan saat menyimpan data guru.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between bg-gradient-to-r from-[#042817] to-[#0A5C36] text-white">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-accent">
              <User className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  {isEditing ? "Edit Data Guru (EMIS 4.0)" : "Tambah Guru Baru (EMIS 4.0)"}
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  EMIS GTK
                </span>
              </div>
              <p className="text-xs text-emerald-100/90">
                {isEditing
                  ? `Mengubah profil & data kepegawaian ${teacherToEdit?.name}`
                  : "Lengkapi data profil pendidik sesuai standar EMIS 4.0 Kemenag."}
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border bg-muted/40 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("identitas")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "identitas"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="size-3.5" />
            <span>1. Identitas &amp; Gelar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kepegawaian")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "kepegawaian"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="size-3.5" />
            <span>2. Kepegawaian (EMIS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("akun")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "akun"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="size-3.5" />
            <span>3. Akun Login &amp; Kontak</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* TAB 1: IDENTITAS */}
          {activeTab === "identitas" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Live Preview Name with Degrees */}
              {name.trim() && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        Tampilan Nama Lengkap &amp; Gelar:
                      </span>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                        {formattedPreview}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                    Format EMIS
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <FormInput
                    label="Gelar Depan"
                    placeholder="Contoh: Dr., Drs., H."
                    value={gelarDepan}
                    onChange={(e) => setGelarDepan(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormInput
                    label="Nama Lengkap (Tanpa Gelar)"
                    placeholder="Contoh: Muhammad Zain"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <FormInput
                    label="Gelar Belakang"
                    placeholder="Contoh: S.Pd, M.Pd"
                    value={gelarBelakang}
                    onChange={(e) => setGelarBelakang(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormInput
                  label="Tempat Lahir"
                  placeholder="Contoh: Malang / Jakarta"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                />

                <FormInput
                  label="Tanggal Lahir"
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    NIK (Nomor Induk Kependudukan KTP)
                  </label>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                    🔒 <span className="text-amber-600 dark:text-amber-400 font-semibold">Tersamar otomatis</span> di aplikasi &amp; laporan
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="16 digit NIK resmi (Contoh: 3507123456780001)"
                  value={nik}
                  maxLength={20}
                  onChange={(e) => setNik(stripLeadingQuote(e.target.value).replace(/[^0-9]/g, "").slice(0, 16))}
                  className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground placeholder:text-muted-foreground"
                />
                <span className="text-[11px] text-muted-foreground">
                  Format tampilan publik: <strong className="font-mono text-foreground">3507********0001</strong> (8 digit tengah disamarkan bintang untuk perlindungan data pribadi).
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: KEPEGAWAIAN EMIS */}
          {activeTab === "kepegawaian" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Peg ID (Simpatika / EMIS Kemenag)"
                  placeholder="Contoh: 205400018921"
                  value={pegId}
                  onChange={(e) => setPegId(stripLeadingQuote(e.target.value).replace(/[^0-9a-zA-Z]/g, ""))}
                />

                <FormInput
                  label="NUPTK (16 Digit)"
                  placeholder="Contoh: 1234567890123456"
                  maxLength={20}
                  value={nuptk}
                  onChange={(e) => setNuptk(stripLeadingQuote(e.target.value).replace(/[^0-9]/g, "").slice(0, 16))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="NIP (Khusus PNS / PPPK)"
                  placeholder="18 digit NIP (Contoh: 198801012015011002)"
                  maxLength={22}
                  value={nip}
                  onChange={(e) => setNip(stripLeadingQuote(e.target.value).replace(/[^0-9]/g, "").slice(0, 18))}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Status Kepegawaian</label>
                  <select
                    value={statusKepegawaian}
                    onChange={(e) => setStatusKepegawaian(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground"
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (Pegawai Pemerintah dg Perjanjian Kerja)</option>
                    <option value="GTY">GTY (Guru Tetap Yayasan)</option>
                    <option value="GTT">GTT (Guru Tidak Tetap)</option>
                    <option value="Non-PNS">Guru Honor / Non-PNS</option>
                    <option value="Tenaga Kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Jenis GTK / Tugas Utama</label>
                  <select
                    value={jenisGtk}
                    onChange={(e) => setJenisGtk(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground"
                  >
                    <option value="Guru Mapel">Guru Mata Pelajaran</option>
                    <option value="Guru Kelas">Guru Kelas (MI / RA)</option>
                    <option value="Kepala Madrasah">Kepala Madrasah</option>
                    <option value="Guru BK">Guru Bimbingan Konseling (BK)</option>
                    <option value="Tenaga Administrasi">Tenaga Administrasi / TU</option>
                    <option value="Laboran">Laboran</option>
                    <option value="Pustakawan">Pustakawan</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Jabatan Madrasah</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Master Jabatan</span>
                  </label>
                  <select
                    value={positionId}
                    onChange={(e) => setPositionId(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-2xs text-foreground"
                  >
                    <option value="">-- Tanpa Jabatan Khusus --</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.isHeadmaster ? "👑 " : "📌 "}
                        {pos.name} {pos.code ? `(${pos.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AKUN LOGIN & KONTAK */}
          {activeTab === "akun" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <FormInput
                label="Email Akun Login"
                type="email"
                placeholder="Contoh: nama.guru@kemenag.go.id"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <FormInput
                label="Nomor WhatsApp / HP"
                placeholder="Contoh: 081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                    Status Keaktifan Presensi
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Guru aktif dapat melakukan absensi mobile GPS di madrasah.
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
            </div>
          )}

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

            <div className="flex items-center gap-2">
              {activeTab !== "identitas" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "akun") setActiveTab("kepegawaian");
                    else if (activeTab === "kepegawaian") setActiveTab("identitas");
                  }}
                >
                  Kembali
                </Button>
              )}

              {activeTab !== "akun" ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "identitas") {
                      if (!name.trim()) {
                        swalError("Nama Belum Diisi", "Silakan masukkan nama guru terlebih dahulu.");
                        return;
                      }
                      setActiveTab("kepegawaian");
                    } else if (activeTab === "kepegawaian") {
                      setActiveTab("akun");
                    }
                  }}
                >
                  Selanjutnya &rarr;
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  isLoading={isSubmitting}
                  leftIcon={<Save className="size-4" />}
                >
                  {isEditing ? "Simpan Perubahan" : "Daftarkan Guru"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
