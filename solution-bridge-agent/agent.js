/**
 * ============================================================================
 * E-PRESENSI BRIDGE AGENT - MESIN FINGERPRINT SOLUTION / ZKTECO
 * ============================================================================
 * Agent mandiri untuk menghubungkan mesin fingerprint Solution di jaringan LAN
 * sekolah ke server E-Presensi Cloud secara otomatis & berkala.
 *
 * Fitur:
 * 1. Tarik log presensi otomatis & kirim ke cloud berkala.
 * 2. Upload data guru/karyawan (Nama & PIN) ke mesin Solution.
 * 3. Mendaftarkan sidik jari guru di mesin (Remote Enroll / Manual).
 * 4. Periksa daftar pengguna di memori mesin Solution.
 * 5. Uji koneksi Cloud E-Presensi & Mesin Solution.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const ZKLib = require("node-zklib");
const { COMMANDS } = require("node-zklib/constants");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Warna console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

function logInfo(msg) {
  console.log(`${colors.cyan}[INFO ${new Date().toLocaleTimeString("id-ID")}]${colors.reset} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${colors.green}[SUKSES ${new Date().toLocaleTimeString("id-ID")}]${colors.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${colors.yellow}[PERINGATAN ${new Date().toLocaleTimeString("id-ID")}]${colors.reset} ${msg}`);
}
function logError(msg) {
  console.log(`${colors.red}[GAGAL ${new Date().toLocaleTimeString("id-ID")}]${colors.reset} ${msg}`);
}

// Validasi file konfigurasi
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.log(`${colors.red}${colors.bold}`);
  console.log("==================================================================");
  console.log(" PERHATIAN: File .env tidak ditemukan!");
  console.log("==================================================================");
  console.log(`${colors.reset}`);
  console.log("Silakan salin file .env.example menjadi .env:");
  console.log("  copy .env.example .env");
  console.log("Lalu buka file .env dan masukkan EP_CLOUD_URL & EP_API_KEY madrasah Anda.");
  process.exit(1);
}

const CLOUD_URL = (process.env.EP_CLOUD_URL || "").trim().replace(/\/$/, "");
const API_KEY = (process.env.EP_API_KEY || "").trim();
const MACHINE_IP = (process.env.FP_MACHINE_IP || "192.168.1.201").trim();
const MACHINE_PORT = parseInt(process.env.FP_MACHINE_PORT || "4370", 10);
const TIMEOUT = parseInt(process.env.FP_TIMEOUT || "10000", 10);
const INTERVAL_MIN = Math.max(1, parseInt(process.env.SYNC_INTERVAL_MINUTES || "2", 10));
const LOOKBACK_DAYS = parseInt(process.env.SYNC_DAYS_LOOKBACK || "1", 10);

if (!API_KEY || API_KEY.includes("ganti_dengan_api_key")) {
  logError("EP_API_KEY belum diisi di file .env!");
  console.log("Dapatkan API Key di: Dashboard Admin Madrasah -> Menu Mesin Fingerprint.");
  process.exit(1);
}

/**
 * Encode paket data pengguna 72-byte untuk protokol Solution / ZKTeco Standalone (CMD_USER_WRQ = 8)
 */
function encodeUserData72(user) {
  const buf = Buffer.alloc(72, 0);
  const uid = parseInt(user.pin, 10) || 1;
  const pin = String(user.pin || "").trim();
  const name = String(user.name || "").replace(/[\t\r\n]/g, " ").trim().slice(0, 24);
  const password = String(user.password || "").trim().slice(0, 8);
  const role = user.role || 0; // 0 = User, 14 = Admin
  const cardno = user.cardno || 0;

  // Offset 0 (2 bytes): uid uint16 LE
  buf.writeUInt16LE(uid, 0);
  // Offset 2 (1 byte): role
  buf.writeUInt8(role, 2);
  // Offset 3 (8 bytes): password
  buf.write(password, 3, Math.min(password.length, 8), "ascii");
  // Offset 11 (24 bytes): name
  buf.write(name, 11, Math.min(name.length, 24), "ascii");
  // Offset 35 (4 bytes): cardno uint32 LE
  buf.writeUInt32LE(cardno, 35);
  // Offset 39 (1 byte): group
  buf.writeUInt8(1, 39);
  // Offset 40 (2 bytes): timezones
  buf.writeUInt16LE(0, 40);
  // Offset 48 (24 bytes): pin / userId
  buf.write(pin, 48, Math.min(pin.length, 24), "ascii");

  return buf;
}

/**
 * Buat paket perintah pendaftaran sidik jari (CMD_STARTENROLL = 61)
 */
function makeStartEnrollData(pin, fingerId = 1) {
  const buf = Buffer.alloc(26, 0);
  const pinStr = String(pin).trim();
  buf.write(pinStr, 0, Math.min(pinStr.length, 24), "ascii");
  buf.writeUInt8(fingerId, 24); // Index jari: 0=Jempol Kanan, 1=Telunjuk Kanan, dst
  buf.writeUInt8(1, 25); // Flag
  return buf;
}

/**
 * Tes koneksi ke Cloud API E-Presensi
 */
async function testCloudConnection() {
  const targetUrl = `${CLOUD_URL}/api/fingerprint/sync`;
  logInfo(`Menguji koneksi ke Server Cloud: ${targetUrl}...`);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "x-api-key": API_KEY,
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      logError(`Gagal terhubung ke Cloud E-Presensi: ${data.error || res.statusText}`);
      return false;
    }

    logSuccess(`Terhubung ke Cloud E-Presensi: [${data.madrasah?.name}] (NSM: ${data.madrasah?.nsm})`);
    return true;
  } catch (err) {
    logError(`Tidak dapat menjangkau server cloud (${targetUrl}). Error: ${err.message}`);
    return false;
  }
}

/**
 * Mengambil daftar seluruh guru dari Cloud API
 */
async function fetchTeachersFromCloud() {
  const targetUrl = `${CLOUD_URL}/api/fingerprint/teachers`;
  logInfo(`Mengambil data guru dari Cloud: ${targetUrl}...`);

  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "x-api-key": API_KEY,
      Accept: "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Gagal mengambil data guru dari Cloud API");
  }

  return data.teachers || [];
}

/**
 * Upload seluruh data guru yang memiliki PIN ke Mesin Fingerprint Solution
 */
async function uploadTeachersToMachine() {
  console.log("\n==================================================================");
  logInfo("MEMULAI PROSES UPLOAD DATA GURU KE MESIN SOLUTION...");
  console.log("==================================================================");

  // 1. Ambil data guru dari Cloud
  const teachers = await fetchTeachersFromCloud();
  const validTeachers = teachers.filter((t) => t.pin && String(t.pin).trim().length > 0);

  if (validTeachers.length === 0) {
    logWarn("Belum ada guru yang memiliki nomor PIN Mesin!");
    console.log("Silakan buka Dashboard Admin -> Mesin Fingerprint -> Tab Pemetaan PIN Guru");
    console.log("Klik tombol 'Auto-Assign PIN' untuk membuat nomor PIN otomatis terlebih dahulu.");
    return;
  }

  logInfo(`Ditemukan ${validTeachers.length} guru dengan nomor PIN yang siap diunggah.`);

  // 2. Hubungkan ke Mesin Solution
  logInfo(`Menghubungkan ke Mesin Solution di ${MACHINE_IP}:${MACHINE_PORT}...`);
  const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, TIMEOUT, 4000);

  try {
    await zk.createSocket();
    logSuccess(`Terhubung ke mesin fingerprint ${MACHINE_IP}:${MACHINE_PORT}!`);

    const client = zk.connectionType === "tcp" ? zk.zklibTcp : zk.zklibUdp;

    // 3. Matikan sementara sensor mesin agar proses transfer stabil
    try {
      await zk.disableDevice();
    } catch {}

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validTeachers.length; i++) {
      const teacher = validTeachers[i];
      const pin = String(teacher.pin).trim();
      const name = teacher.name;

      try {
        const userBuf = encodeUserData72({
          pin,
          name,
          role: 0,
        });

        // Kirim perintah CMD_USER_WRQ (8)
        await client.executeCmd(COMMANDS.CMD_USER_WRQ, userBuf);
        successCount++;
        process.stdout.write(`\r${colors.green}[PROGRES]${colors.reset} Mengunggah [${i + 1}/${validTeachers.length}] PIN ${pin}: ${name.slice(0, 20)}... `);
      } catch (uploadErr) {
        failedCount++;
        console.log(`\n${colors.red}[GAGAL]${colors.reset} Gagal mengunggah PIN ${pin} (${name}): ${uploadErr.message}`);
      }
    }

    console.log("\n");

    // 4. Refresh internal memory mesin agar data langsung muncul di layar LCD
    logInfo("Menyegarkan memori cache mesin Solution (CMD_REFRESHDATA)...");
    try {
      await client.executeCmd(COMMANDS.CMD_REFRESHDATA, "");
    } catch {}

    // 5. Hidupkan kembali sensor mesin
    try {
      await zk.enableDevice();
      await zk.disconnect();
    } catch {}

    logSuccess(`UPLOAD SELESAI! [Berhasil: ${successCount}, Gagal: ${failedCount}]`);
    console.log(`${colors.cyan}${colors.bold}`);
    console.log("------------------------------------------------------------------");
    console.log(" HASIL UPLOAD:");
    console.log(` Nama dan PIN dari ${successCount} guru kini sudah tersimpan di mesin Solution.`);
    console.log(" Anda kini dapat mendaftarkan sidik jari guru tersebut langsung di mesin!");
    console.log("------------------------------------------------------------------");
    console.log(`${colors.reset}`);

    // 6. Laporkan aktivitas upload ke Cloud E-Presensi
    try {
      await fetch(`${CLOUD_URL}/api/fingerprint/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          source: "AGENT_UPLOAD_USERS",
          count: successCount,
          message: `Berhasil mengunggah ${successCount} guru ke mesin Solution via Bridge Agent`,
        }),
      });
      logSuccess("Laporan aktivitas upload berhasil dicatat di Dashboard Cloud.");
    } catch {}
  } catch (connErr) {
    try {
      await zk.disconnect();
    } catch {}
    logError(`Gagal menghubungkan ke mesin Solution: ${connErr.message}`);
  }
}

/**
 * Daftarkan sidik jari guru (Trigger Remote Enroll pada Mesin Solution)
 */
async function startFingerprintEnrollment(pin, fingerId = 1) {
  if (!pin) {
    logError("Nomor PIN guru diperlukan!");
    return;
  }

  const fingerNames = [
    "Jempol Kanan (0)",
    "Telunjuk Kanan (1)",
    "Jari Tengah Kanan (2)",
    "Jari Manis Kanan (3)",
    "Kelingking Kanan (4)",
    "Jempol Kiri (5)",
    "Telunjuk Kiri (6)",
    "Jari Tengah Kiri (7)",
    "Jari Manis Kiri (8)",
    "Kelingking Kiri (9)",
  ];

  console.log("\n==================================================================");
  logInfo(`MEMULAI PENDAFTARAN SIDIK JARI GURU [PIN: ${pin}]`);
  logInfo(`Jari Target: ${fingerNames[fingerId] || `Jari Index ${fingerId}`}`);
  console.log("==================================================================");

  const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, TIMEOUT, 4000);

  try {
    await zk.createSocket();
    logSuccess(`Terhubung ke mesin Solution di ${MACHINE_IP}:${MACHINE_PORT}!`);

    const client = zk.connectionType === "tcp" ? zk.zklibTcp : zk.zklibUdp;
    const enrollData = makeStartEnrollData(pin, fingerId);

    // Kirim perintah CMD_STARTENROLL (61)
    await client.executeCmd(COMMANDS.CMD_STARTENROLL, enrollData);

    console.log(`\n${colors.yellow}${colors.bold}`);
    console.log("******************************************************************");
    console.log(` PERINTAH REKAM SIDIK JARI TERKIRIM KE MESIN SOLUTION!`);
    console.log("******************************************************************");
    console.log(`${colors.reset}`);
    console.log(`1. Perhatikan layar mesin Solution: status pendaftaran untuk PIN ${pin} aktif.`);
    console.log(`2. Minta guru meletakkan jarinya pada sensor mesin sebanyak 3 KALI berturut-turut.`);
    console.log(`3. Mesin akan berbunyi beep setiap kali jari diangkat dan ditempelkan.`);
    console.log(`4. Setelah 3 kali scan berhasil, mesin akan bersuara 'Terima Kasih' atau 'Success'.`);
    console.log("------------------------------------------------------------------\n");

    try {
      await zk.disconnect();
    } catch {}
  } catch (err) {
    try {
      await zk.disconnect();
    } catch {}
    logError(`Gagal mengirim perintah rekam sidik jari ke mesin: ${err.message}`);
    console.log(`${colors.yellow}CATATAN ALTERNATIF CARA REKAM MANUAL:${colors.reset}`);
    console.log(`Anda juga dapat langsung merekam sidik jari guru di mesin Solution:`);
    console.log(`1. Tekan tombol MENU pada mesin Solution`);
    console.log(`2. Pilih: Kelola Pengguna (User Mgt) -> Ubah (Edit)`);
    console.log(`3. Pilih nama guru dengan PIN ${pin}`);
    console.log(`4. Pilih: Sidik Jari (Fingerprint)`);
    console.log(`5. Tempelkan jari guru 3 kali pada scanner.`);
  }
}

/**
 * Tampilkan daftar pengguna yang sudah ada di memori mesin Solution
 */
async function listUsersOnMachine() {
  logInfo(`Membaca daftar pengguna dari memori mesin Solution di ${MACHINE_IP}:${MACHINE_PORT}...`);
  const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, TIMEOUT, 4000);

  try {
    await zk.createSocket();
    const usersData = await zk.getUsers();
    try {
      await zk.disconnect();
    } catch {}

    const users = (usersData && usersData.data) ? usersData.data : [];
    console.log(`\n${colors.green}${colors.bold}=== DAFTAR PENGGUNA DI MESIN SOLUTION (${users.length} Orang) ===${colors.reset}`);
    console.log("------------------------------------------------------------------");
    console.log(" No  | PIN / User ID    | Nama Pengguna          | Role");
    console.log("------------------------------------------------------------------");

    users.forEach((u, idx) => {
      const pinStr = String(u.userId || u.uid || "-").padEnd(16);
      const nameStr = String(u.name || "-").padEnd(22).slice(0, 22);
      const roleStr = u.role === 14 ? "Admin" : "User";
      console.log(` ${(idx + 1).toString().padStart(3)} | ${pinStr} | ${nameStr} | ${roleStr}`);
    });

    console.log("------------------------------------------------------------------\n");
    return users;
  } catch (err) {
    try {
      await zk.disconnect();
    } catch {}
    logError(`Gagal membaca data pengguna dari mesin: ${err.message}`);
    return [];
  }
}

/**
 * Tarik data log presensi dari mesin Solution via protokol ZK (Port 4370)
 */
async function fetchLogsFromMachine() {
  logInfo(`Menghubungkan ke Mesin Solution di ${MACHINE_IP}:${MACHINE_PORT}...`);
  const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, TIMEOUT, 4000);

  try {
    await zk.createSocket();
    logSuccess(`Terhubung ke mesin fingerprint ${MACHINE_IP}:${MACHINE_PORT}!`);

    logInfo("Membaca log absensi dari memori mesin...");
    const attendanceData = await zk.getAttendances();

    try {
      await zk.disconnect();
    } catch {}

    const logs = attendanceData && attendanceData.data ? attendanceData.data : [];
    logSuccess(`Berhasil mengambil ${logs.length} total baris log dari mesin.`);
    return logs;
  } catch (err) {
    try {
      await zk.disconnect();
    } catch {}
    throw new Error(`Gagal komunikasi dengan mesin fingerprint: ${err.message}`);
  }
}

/**
 * Filter log agar hanya menyinkronkan data beberapa hari terakhir
 */
function filterRecentLogs(rawLogs) {
  if (!rawLogs || rawLogs.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);
  cutoffDate.setHours(0, 0, 0, 0);

  const filtered = [];

  for (const item of rawLogs) {
    const pin = String(item.deviceUserId || item.user_id || item.pin || "").trim();
    const rawTime = item.recordTime || item.timestamp || item.record_time;

    if (!pin || !rawTime) continue;

    const recordDate = new Date(rawTime);
    if (isNaN(recordDate.getTime())) continue;

    if (recordDate >= cutoffDate) {
      filtered.push({
        pin,
        timestamp: rawTime,
        verifyType: item.verifyType || 1,
      });
    }
  }

  return filtered;
}

/**
 * Kirimkan data log kehadiran ke Cloud API E-Presensi
 */
async function pushLogsToCloud(logs) {
  if (logs.length === 0) {
    logInfo("Tidak ada data log baru yang perlu dikirim ke cloud.");
    return;
  }

  logInfo(`Mengirimkan ${logs.length} data scan ke Cloud E-Presensi...`);
  const targetUrl = `${CLOUD_URL}/api/fingerprint/sync`;

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      source: "AGENT",
      logs,
    }),
  });

  const resData = await response.json().catch(() => ({}));

  if (!response.ok || !resData.success) {
    throw new Error(resData.error || `Server HTTP ${response.status}`);
  }

  const result = resData.result || {};
  logSuccess(
    `Sinkronisasi Selesai! [Baru: ${result.insertedCount || 0}, Diperbarui: ${result.updatedCount || 0}, Dilewati: ${result.ignoredCount || 0}]`
  );

  if (result.unmappedPins && result.unmappedPins.length > 0) {
    logWarn(
      `Perhatian: Ada PIN di mesin yang belum dipetakan ke guru: [${result.unmappedPins.join(", ")}]. Silakan atur di menu web admin.`
    );
  }
}

/**
 * Siklus satu kali sinkronisasi log
 */
async function runSyncCycle() {
  console.log("\n------------------------------------------------------------------");
  logInfo(`Memulai siklus sinkronisasi log kehadiran mesin...`);

  try {
    const rawLogs = await fetchLogsFromMachine();
    const recentLogs = filterRecentLogs(rawLogs);
    logInfo(`Ditemukan ${recentLogs.length} data scan dalam rentang ${LOOKBACK_DAYS} hari terakhir.`);
    await pushLogsToCloud(recentLogs);
  } catch (err) {
    logError(`Siklus sinkronisasi gagal: ${err.message}`);
    logInfo(`Agent akan mencoba lagi pada jadwal berikutnya (${INTERVAL_MIN} menit lagi).`);
  }
}

/**
 * Menjalankan background auto-sync secara periodik
 */
async function startAutoSyncDaemon() {
  console.log("\n==================================================================");
  logInfo(`MEMULAI AUTO-SYNC DAEMON (INTERVAL: SETIAP ${INTERVAL_MIN} MENIT)...`);
  console.log("==================================================================");

  const cloudReady = await testCloudConnection();
  if (!cloudReady) {
    logWarn("Koneksi awal ke cloud belum berhasil. Tetap melanjutkan dengan interval berkala...");
  }

  // Jalankan siklus pertama langsung
  await runSyncCycle();

  // Pasang interval otomatis
  const intervalMs = INTERVAL_MIN * 60 * 1000;
  setInterval(async () => {
    await runSyncCycle();
  }, intervalMs);

  logInfo(`Bridge Agent aktif di latar belakang. Tekan Ctrl+C untuk menghentikan.`);
}

/**
 * Menampilkan Menu Interaktif CLI
 */
function showInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n==================================================================");
  console.log("                      PILIHAN MENU OPERASI                        ");
  console.log("==================================================================");
  console.log(" [1] Mulai Auto-Sync Kehadiran (Background Sync Tiap 2 Menit)");
  console.log(" [2] Upload / Kirim Data Semua Guru ke Mesin Solution");
  console.log(" [3] Daftarkan Sidik Jari Guru Baru di Mesin (Remote Enroll)");
  console.log(" [4] Lihat Daftar Pengguna yang Sudah Ada di Mesin");
  console.log(" [5] Uji Koneksi Mesin & Cloud E-Presensi");
  console.log(" [0] Keluar");
  console.log("==================================================================");

  rl.question(" Pilih nomor menu [1-5]: ", async (answer) => {
    const choice = answer.trim();

    if (choice === "1") {
      rl.close();
      await startAutoSyncDaemon();
    } else if (choice === "2") {
      rl.close();
      await uploadTeachersToMachine();
      setTimeout(showInteractiveMenu, 1500);
    } else if (choice === "3") {
      rl.question(" Masukkan PIN Guru yang ingin didaftarkan jarinya (misal: 1): ", (pinInput) => {
        rl.question(" Pilih Jari (0: Jempol Kanan, 1: Telunjuk Kanan [Default], 2: Tengah): ", async (fingerInput) => {
          rl.close();
          const pin = pinInput.trim();
          const fingerId = parseInt(fingerInput.trim() || "1", 10);
          await startFingerprintEnrollment(pin, fingerId);
          setTimeout(showInteractiveMenu, 1500);
        });
      });
    } else if (choice === "4") {
      rl.close();
      await listUsersOnMachine();
      setTimeout(showInteractiveMenu, 1000);
    } else if (choice === "5") {
      rl.close();
      console.log("\n--- UJI KONEKSI ---");
      await testCloudConnection();
      try {
        await fetchLogsFromMachine();
        logSuccess("Koneksi ke Mesin Solution BERHASIL!");
      } catch (e) {
        logError(e.message);
      }
      setTimeout(showInteractiveMenu, 1500);
    } else if (choice === "0") {
      rl.close();
      console.log("Sampai jumpa!");
      process.exit(0);
    } else {
      console.log("Pilihan tidak valid.");
      rl.close();
      showInteractiveMenu();
    }
  });
}

/**
 * Entry Point
 */
async function main() {
  console.log(`${colors.green}${colors.bold}`);
  console.log("==================================================================");
  console.log("     E-PRESENSI BRIDGE AGENT - MESIN FINGERPRINT SOLUTION         ");
  console.log("==================================================================");
  console.log(`${colors.reset}`);
  console.log(`- Cloud URL       : ${CLOUD_URL}`);
  console.log(`- IP Mesin        : ${MACHINE_IP}:${MACHINE_PORT}`);
  console.log(`- Interval Sync   : Setiap ${INTERVAL_MIN} menit`);
  console.log(`- Lookback Days   : ${LOOKBACK_DAYS} hari`);
  console.log("------------------------------------------------------------------");

  // CLI Arguments handling
  const args = process.argv.slice(2);

  if (args.includes("--test") || args.includes("--test-cloud")) {
    await testCloudConnection();
    process.exit(0);
  }

  if (args.includes("--test-machine")) {
    try {
      await fetchLogsFromMachine();
      logSuccess("Tes koneksi ke mesin fingerprint BERHASIL!");
    } catch (err) {
      logError(err.message);
    }
    process.exit(0);
  }

  if (args.includes("--upload-users") || args.includes("-u")) {
    await uploadTeachersToMachine();
    process.exit(0);
  }

  if (args.includes("--list-users") || args.includes("-l")) {
    await listUsersOnMachine();
    process.exit(0);
  }

  if (args.includes("--enroll") || args.includes("-e")) {
    const enrollIdx = args.indexOf("--enroll") !== -1 ? args.indexOf("--enroll") : args.indexOf("-e");
    const pin = args[enrollIdx + 1];
    const finger = parseInt(args[enrollIdx + 2] || "1", 10);
    if (!pin) {
      logError("Harap sertakan PIN guru. Contoh: node agent.js --enroll 1");
      process.exit(1);
    }
    await startFingerprintEnrollment(pin, finger);
    process.exit(0);
  }

  if (args.includes("--sync") || args.includes("-s")) {
    await startAutoSyncDaemon();
    return;
  }

  // Jika dipanggil tanpa argumen, tampilkan menu interaktif
  showInteractiveMenu();
}

main().catch((err) => {
  logError(`Fatal Error: ${err.message}`);
  process.exit(1);
});
