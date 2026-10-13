/**
 * ============================================================================
 * E-PRESENSI BRIDGE AGENT - MESIN FINGERPRINT SOLUTION / ZKTECO
 * ============================================================================
 * Agent mandiri untuk menghubungkan mesin fingerprint Solution di jaringan LAN
 * sekolah ke server E-Presensi Cloud secara otomatis & berkala.
 */

const fs = require("fs");
const path = require("path");
const ZKLib = require("node-zklib");
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
  console.log(`${colors.cyan}[INFO ${new Date().toLocaleTimeString('id-ID')}]${colors.reset} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${colors.green}[SUKSES ${new Date().toLocaleTimeString('id-ID')}]${colors.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${colors.yellow}[PERINGATAN ${new Date().toLocaleTimeString('id-ID')}]${colors.reset} ${msg}`);
}
function logError(msg) {
  console.log(`${colors.red}[GAGAL ${new Date().toLocaleTimeString('id-ID')}]${colors.reset} ${msg}`);
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
 * Tarik data log presensi dari mesin Solution via protokol ZK (Port 4370)
 */
async function fetchLogsFromMachine() {
  logInfo(`Menghubungkan ke Mesin Solution di ${MACHINE_IP}:${MACHINE_PORT}...`);

  const zk = new ZKLib(MACHINE_IP, MACHINE_PORT, TIMEOUT, 4000);

  try {
    // 1. Buat socket koneksi ke mesin
    await zk.createSocket();
    logSuccess(`Terhubung ke mesin fingerprint ${MACHINE_IP}:${MACHINE_PORT}!`);

    // 2. Ambil data attendance logs dari mesin
    logInfo("Membaca log absensi dari memori mesin...");
    const attendanceData = await zk.getAttendances();

    // 3. Putuskan koneksi dengan rapi
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

  // Hitung batas waktu mulai lookback
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);
  cutoffDate.setHours(0, 0, 0, 0);

  const filtered = [];

  for (const item of rawLogs) {
    // Format dari ZKLib: { deviceUserId: '1', recordTime: '2026-10-13 07:15:00', ... }
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
 * Siklus satu kali sinkronisasi
 */
async function runSyncCycle() {
  console.log("\n------------------------------------------------------------------");
  logInfo(`Memulai siklus sinkronisasi mesin...`);

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
 * Fungsi Utama (Entry Point)
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
  console.log(`- Rentang Log     : ${LOOKBACK_DAYS} hari terakhir`);
  console.log("------------------------------------------------------------------\n");

  // Mode CLI test argument
  if (process.argv.includes("--test-cloud")) {
    await testCloudConnection();
    process.exit(0);
  }

  if (process.argv.includes("--test-machine")) {
    try {
      await fetchLogsFromMachine();
      logSuccess("Tes koneksi ke mesin fingerprint BERHASIL!");
    } catch (err) {
      logError(err.message);
    }
    process.exit(0);
  }

  // 1. Uji koneksi ke cloud terlebih dahulu
  const cloudReady = await testCloudConnection();
  if (!cloudReady) {
    logWarn("Koneksi awal ke cloud belum berhasil. Tetap melanjutkan dengan interval berkala...");
  }

  // 2. Jalankan siklus pertama langsung
  await runSyncCycle();

  // 3. Pasang loop interval otomatis
  const intervalMs = INTERVAL_MIN * 60 * 1000;
  setInterval(async () => {
    await runSyncCycle();
  }, intervalMs);

  logInfo(`Bridge Agent aktif di latar belakang. Tekan Ctrl+C untuk menghentikan.`);
}

main().catch((err) => {
  logError(`Fatal Error: ${err.message}`);
  process.exit(1);
});
