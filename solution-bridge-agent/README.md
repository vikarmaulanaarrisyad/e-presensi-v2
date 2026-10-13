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

## 👥 1. Mengunggah (Upload) Data Guru ke Mesin Solution

Agar nama dan nomor PIN guru langsung tersimpan di memori mesin Solution (tanpa harus mengetik nama guru satu per satu di tombol keypad mesin):

### Cara A: Otomatis via Bridge Agent (Jaringan LAN / WiFi)
1. Pastikan nomor PIN guru sudah terisi di menu **Mesin Fingerprint** -> Tab **Pemetaan PIN Guru** di Web Dashboard E-Presensi.
2. Buka file `start.bat` di komputer madrasah, lalu pilih menu **[2] Upload / Kirim Data Semua Guru ke Mesin Solution**.
   - Atau jalankan lewat Command Prompt:
     ```bash
     node agent.js --upload-users
     ```
3. Agent akan otomatis mengambil data semua guru dari Cloud E-Presensi dan mengirimkannya ke memori mesin Solution dalam hitungan detik.
4. Nama guru akan langsung muncul di layar LCD mesin Solution saat absensi!

### Cara B: Offline via Flashdisk USB (`user.dat`)
1. Di Dashboard Web Admin E-Presensi -> Tab **Pemetaan PIN Guru**, klik tombol **Download user.dat (USB)**.
2. Simpan file `user.dat` ke dalam Flashdisk (simpan di luar folder / root).
3. Tancapkan Flashdisk ke port USB mesin Solution.
4. Di mesin Solution, tekan tombol **Menu** -> **Manajemen USB** -> **Upload Pengguna** (atau *Upload Data Pengguna*).
5. Mesin akan membaca file dan seluruh data guru otomatis tersimpan di mesin Solution!

---

## 👆 2. Mendaftarkan Sidik Jari Guru di Mesin Solution

Setelah nama dan PIN guru ter-upload ke mesin, daftarkan sidik jari guru dengan salah satu cara berikut:

### Cara A: Rekam Langsung di Mesin Solution (Rekomendasi)
1. Tekan tombol **[Menu]** atau **[M/OK]** pada mesin Solution.
2. Masuk ke menu **Pengguna** (*User Mng*) -> **Atur Pengguna** (*Manage*).
3. Cari nama guru atau masukkan nomor **User ID / PIN** guru yang bersangkutan.
4. Pilih menu **Sidik Jari** (*Fingerprint*).
5. Pilih jari yang ingin didaftarkan (misalnya Telunjuk Kanan atau Jempol).
6. Minta guru menempelkan jarinya ke sensor kaca mesin sebanyak **3 KALI** berturut-turut.
7. Setelah 3 kali scan, mesin akan berbunyi *"Terima Kasih"* (atau bersuara tanda sukses dan muncul centang hijau).
8. Tekan **[ESC]** untuk menyimpan. Sidik jari guru telah aktif dan siap digunakan untuk absensi masuk & pulang!

### Cara B: Remote Enrollment via Bridge Agent
Anda juga dapat memicu sensor mesin Solution langsung dari komputer operator tanpa menyentuh tombol Menu di mesin:
1. Buka `start.bat` dan pilih menu **[3] Daftarkan Sidik Jari Guru Baru di Mesin (Remote Enroll)**.
2. Masukkan nomor PIN guru (misalnya `1`).
3. Atau jalankan langsung via command line:
   ```bash
   node agent.js --enroll 1
   ```
4. Mesin Solution akan langsung mengeluarkan bunyi perintah suara dan mengaktifkan lampu sensor rekam sidik jari untuk guru dengan PIN tersebut sebanyak 3 kali.

---

## 🔄 3. Sinkronisasi Log Presensi Otomatis (Background Sync)

Untuk menjalankan sinkronisasi presensi secara terus-menerus:
1. Jalankan `start.bat` dan pilih menu **[1] Mulai Auto-Sync Kehadiran**.
2. Agent akan memeriksa data scan terbaru dari mesin setiap **2 menit** dan otomatis mem-push data absensi ke Cloud E-Presensi.

---

## 💾 4. Alternatif Cadangan: Import File Flashdisk (USB)
Jika jaringan sekolah mati lampu atau WiFi bermasalah:
1. Colokkan Flashdisk ke port USB mesin Solution.
2. Di mesin, pilih menu **Download Log Kehadiran** (file berekstensi `.dat` atau `.txt`).
3. Di Web Admin E-Presensi -> Menu **Mesin Fingerprint** -> Tab **Import USB**.
4. Pilih file tersebut dan klik **Proses Log USB**. Semua data presensi akan langsung terproses seketika!

