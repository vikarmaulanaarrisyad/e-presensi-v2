# Panduan Integrasi Mesin Fingerprint Solution / ZKTeco dengan E-Presensi Cloud

Bridge Agent ini berfungsi menghubungkan mesin absensi sidik jari merk **Solution** (seperti tipe X100-C, X105-ID, P207, P208, A100, V800, dll) yang berada di jaringan lokal LAN/WiFi madrasah ke aplikasi **E-Presensi Cloud**.

---

## 🏗️ Topologi / Cara Kerja

```
[ Mesin Solution (LAN) ] 
       │ (Port 4370 TCP/UDP)
       ▼
[ PC Operator / TU di Sekolah ] (Menjalankan Bridge Agent)
       │ (HTTPS REST API / Internet)
       ▼
[ E-Presensi Next.js Cloud ] (Vercel / VPS / Supabase)
```

1. Mesin fingerprint Solution terhubung ke WiFi atau Switch LAN madrasah (misal IP `192.168.1.201`).
2. PC Komputer Operator / TU sekolah yang berada di WiFi/LAN yang sama menjalankan **Bridge Agent**.
3. Bridge Agent otomatis menarik data sidik jari terbaru setiap **2 menit** dari mesin.
4. Bridge Agent mem-push data log kehadiran ke server cloud E-Presensi via API Key yang aman.
5. Server Cloud E-Presensi secara otomatis mencocokkan PIN guru, memvalidasi jam masuk/pulang, dan mencatat status Hadir/Terlambat di database.

---

## 📋 Langkah-Langkah Pemasangan (Setup)

### 1. Pengaturan IP di Mesin Solution
1. Nyalakan mesin fingerprint Solution.
2. Masuk ke **Menu** -> **Comm (Komunikasi)** -> **Jaringan / Ethernet**.
3. Atur IP Address mesin ke IP statis, misalnya: `192.168.1.201`.
4. Pastikan Subnet Mask (`255.255.255.0`) dan Gateway sesuai dengan router madrasah Anda.
5. Pastikan Port mesin adalah `4370`.
6. Colokkan kabel LAN mesin ke router/switch atau hubungkan ke WiFi sekolah.

### 2. Dapatkan API Key di Web Admin Madrasah
1. Login ke Dashboard E-Presensi sebagai **Admin Madrasah**.
2. Masuk ke menu **Mesin Fingerprint** di sidebar kiri.
3. Klik tombol **Salin API Key** (contoh: `fp_sec_xxxxxxxxxxxxxx`).

### 3. Konfigurasi Bridge Agent di Komputer Sekolah
1. Buka folder `solution-bridge-agent` di komputer operator / TU sekolah.
2. Salin file `.env.example` dan ubah namanya menjadi `.env`:
   ```bash
   copy .env.example .env
   ```
3. Edit file `.env` dengan Notepad, lalu sesuaikan:
   ```env
   # Alamat Cloud E-Presensi Anda
   EP_CLOUD_URL=https://alamat-web-presensi-anda.com

   # Tempelkan API Key yang disalin dari web admin
   EP_API_KEY=fp_sec_xxxxxxxxxxxxxxxxxxxxxxxx

   # IP Mesin Solution di jaringan sekolah Anda
   FP_MACHINE_IP=192.168.1.201

   # Port ZK (Default: 4370)
   FP_MACHINE_PORT=4370

   # Sinkronisasi tiap berapa menit
   SYNC_INTERVAL_MINUTES=2
   ```

### 4. Menjalankan Bridge Agent
Cukup klik ganda (double-click) file **`start.bat`**.

Bridge Agent akan otomatis:
- Memeriksa & menginstall dependensi yang diperlukan.
- Menguji koneksi ke Server Cloud E-Presensi.
- Menghubungkan ke IP mesin Solution.
- Menjalankan sinkronisasi berkelanjutan di latar belakang.

---

## 👥 Pemetaan PIN Guru (Enroll Number)
Agar absensi sidik jari masuk ke nama guru yang benar:
1. Di mesin Solution, tiap jari guru didaftarkan dengan nomor **User ID / PIN** (misal: 1, 2, 3, dst).
2. Di Web Admin E-Presensi -> Menu **Mesin Fingerprint** -> Tab **Pemetaan PIN Guru**:
   - Isi kolom **PIN Mesin** untuk masing-masing guru sesuai dengan nomor User ID di mesin.
   - Atau klik tombol **Auto-Assign PIN (1, 2, 3...)** untuk membuatkan nomor urut otomatis.

---

## 💾 Alternatif Cadangan: Import File Flashdisk (USB)
Jika jaringan sekolah mati lampu atau WiFi bermasalah:
1. Colokkan Flashdisk ke port USB mesin Solution.
2. Di mesin, pilih menu **Download Log Kehadiran** (file berekstensi `.dat` atau `.txt`).
3. Di Web Admin E-Presensi -> Menu **Mesin Fingerprint** -> Tab **Import USB**.
4. Pilih file tersebut dan klik **Proses Log USB**. Semua data presensi akan langsung terproses seketika!
