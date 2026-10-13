import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";

export function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/auth/google-drive/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate URL otentikasi Google OAuth 2.0 untuk Admin Madrasah
 */
export function getGoogleDriveAuthUrl(madrasahId: string) {
  const oauth2Client = getGoogleOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Wajib agar Google selalu mengirimkan refresh_token
    state: madrasahId,
    scope: [
      "https://www.googleapis.com/auth/drive.file", // Izin aman: Hanya file/folder yang dibuat aplikasi ini
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  });
}

/**
 * Tukar kode OAuth dari callback Google, buat folder di Google Drive, dan simpan kredensial ke database
 */
export async function exchangeCodeAndConnectMadrasah(code: string, madrasahId: string) {
  const oauth2Client = getGoogleOAuth2Client();

  // 1. Tukar authorization code dengan tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  if (!tokens.refresh_token) {
    // Jika user menghubungkan kembali tanpa consent baru, ambil refresh token yang sudah ada jika ada
    const existing = await prisma.madrasah.findUnique({
      where: { id: madrasahId },
      select: { googleDriveRefreshToken: true },
    });
    if (existing?.googleDriveRefreshToken) {
      tokens.refresh_token = existing.googleDriveRefreshToken;
    }
  }

  // 2. Dapatkan email akun Google yang dihubungkan
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const connectedEmail = userInfo.data.email || "Akun Google Madrasah";

  // 3. Ambil data madrasah untuk penamaan folder
  const madrasah = await prisma.madrasah.findUnique({
    where: { id: madrasahId },
    select: { name: true, nsm: true },
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const folderName = `E-Presensi - ${madrasah?.name || "Madrasah"} (${madrasah?.nsm || "Kemenag"})`;

  // 4. Cari apakah folder sudah ada atau buat baru di root Google Drive madrasah
  let targetFolderId: string | null = null;
  const searchFolder = await drive.files.list({
    q: `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (searchFolder.data.files && searchFolder.data.files.length > 0) {
    targetFolderId = searchFolder.data.files[0].id || null;
  } else {
    // Buat folder baru
    const createdFolder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        description: "Folder Arsip Foto Presensi Guru dari Aplikasi E-Presensi Kemenag",
      },
      fields: "id, name",
    });
    targetFolderId = createdFolder.data.id || null;
  }

  // 5. Simpan kredensial & folder ID ke database madrasah
  return await prisma.madrasah.update({
    where: { id: madrasahId },
    data: {
      googleDriveEmail: connectedEmail,
      googleDriveRefreshToken: tokens.refresh_token || undefined,
      googleDriveFolderId: targetFolderId,
      googleDriveFolderName: folderName,
      googleDriveConnectedAt: new Date(),
      googleDriveEnabled: true,
    },
  });
}

/**
 * Upload Foto Selfie Presensi ke Google Drive Madrasah
 * Mengembalikan URL publik/thumbnail yang langsung bisa ditampilkan di web & HP
 */
export async function uploadAttendancePhotoToDrive({
  madrasahId,
  photoBase64,
  teacherName,
  dateStr,
  type = "CHECK_IN",
}: {
  madrasahId: string;
  photoBase64: string;
  teacherName: string;
  dateStr: string;
  type?: "CHECK_IN" | "CHECK_OUT";
}): Promise<string | null> {
  try {
    if (!photoBase64 || !photoBase64.includes("base64")) {
      return null;
    }

    // 1. Ambil kredensial Google Drive madrasah
    const madrasah = await prisma.madrasah.findUnique({
      where: { id: madrasahId },
      select: {
        googleDriveEnabled: true,
        googleDriveRefreshToken: true,
        googleDriveFolderId: true,
      },
    });

    if (
      !madrasah ||
      !madrasah.googleDriveEnabled ||
      !madrasah.googleDriveRefreshToken ||
      !madrasah.googleDriveFolderId
    ) {
      return null;
    }

    // 2. Siapkan Google OAuth Client dengan Refresh Token
    const oauth2Client = getGoogleOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: madrasah.googleDriveRefreshToken,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 3. Konversi Base64 string ke Buffer
    const cleanBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(cleanBase64, "base64");
    const stream = new Readable();
    stream.push(imageBuffer);
    stream.push(null);

    // 4. Penamaan file rapi: PRESENSI_IN_NamaGuru_2026-10-13_173000.jpg
    const safeTeacherName = teacherName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const timeStamp = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
    const fileName = `PRESENSI_${type === "CHECK_IN" ? "IN" : "OUT"}_${safeTeacherName}_${dateStr}_${timeStamp}.jpg`;

    // 5. Upload ke Google Drive folder madrasah
    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [madrasah.googleDriveFolderId],
        mimeType: "image/jpeg",
      },
      media: {
        mimeType: "image/jpeg",
        body: stream,
      },
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = uploadRes.data.id;
    if (!fileId) return null;

    // 6. Buat izin read-only publik agar gambar bisa dimuat di dashboard/laporan tanpa login Google
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch {
      // Abaikan jika domain Google Workspace membatasi share keluar
    }

    // URL thumbnail cepat beresolusi tinggi yang didukung browser/mobile
    // https://lh3.googleusercontent.com/d/FILE_ID adalah format Google CDN paling cepat & stabil
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  } catch (error: any) {
    console.error("Gagal mengunggah foto selfie ke Google Drive:", error?.message || error);
    // Jangan gagalkan presensi jika Google Drive error, kembalikan null untuk fallback
    return null;
  }
}
