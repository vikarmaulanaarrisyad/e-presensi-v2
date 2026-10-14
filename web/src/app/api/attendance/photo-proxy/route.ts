import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleOAuth2Client } from "@/lib/google-drive";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/**
 * Proxy route for attendance selfie photos
 * Bypasses Google Drive / Google CDN hotlinking blocks (Error 429 Too Many Requests / 403 Forbidden)
 * and enables direct in-browser viewing and file downloading
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");
    const isDownload = searchParams.get("download") === "true";

    if (!targetUrl) {
      return new NextResponse("Parameter URL tidak ditemukan.", { status: 400 });
    }

    // 1. Handle Data URL (Base64)
    if (targetUrl.startsWith("data:image/")) {
      const matches = targetUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return new NextResponse("Format base64 tidak valid.", { status: 400 });
      }

      const mimeType = `image/${matches[1]}`;
      const imageBuffer = Buffer.from(matches[2], "base64");

      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(imageBuffer.length),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          ...(isDownload && {
            "Content-Disposition": `attachment; filename="presensi-${Date.now()}.${matches[1]}"`,
          }),
        },
      });
    }

    // 2. Extract Google Drive fileId if present
    let fileId: string | null = null;
    const lh3Match = targetUrl.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    const driveMatch = targetUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
    if (lh3Match) fileId = lh3Match[1];
    else if (driveMatch) fileId = driveMatch[1];

    // 3. Try fetching directly without Referer (Google CDN allows no-referrer requests)
    try {
      const cdnUrl = fileId
        ? `https://lh3.googleusercontent.com/d/${fileId}`
        : targetUrl;

      const fetchRes = await fetch(cdnUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          // Explicitly NO Referer header to bypass hotlink block
        },
        cache: "force-cache",
      });

      if (fetchRes.ok) {
        const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
        // Check that response is actually an image and not an HTML error page
        if (contentType.startsWith("image/")) {
          const arrayBuffer = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(buffer.length),
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              ...(isDownload && {
                "Content-Disposition": `attachment; filename="presensi-${Date.now()}.jpg"`,
              }),
            },
          });
        }
      }
    } catch (cdnErr) {
      console.warn("Direct CDN fetch failed, trying Drive API fallback:", cdnErr);
    }

    // 4. Fallback: If fileId is present, try Google Drive API with connected Madrasah OAuth token
    if (fileId) {
      try {
        const madrasah = await prisma.madrasah.findFirst({
          where: {
            googleDriveEnabled: true,
            googleDriveRefreshToken: { not: null },
          },
          select: {
            googleDriveRefreshToken: true,
          },
        });

        if (madrasah?.googleDriveRefreshToken) {
          const oauth2Client = getGoogleOAuth2Client();
          oauth2Client.setCredentials({
            refresh_token: madrasah.googleDriveRefreshToken,
          });

          const drive = google.drive({ version: "v3", auth: oauth2Client });
          const fileRes = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
          );

          if (fileRes.data) {
            const buffer = Buffer.from(fileRes.data as ArrayBuffer);
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                "Content-Type": "image/jpeg",
                "Content-Length": String(buffer.length),
                "Cache-Control": "public, max-age=86400",
                ...(isDownload && {
                  "Content-Disposition": `attachment; filename="presensi-${Date.now()}.jpg"`,
                }),
              },
            });
          }
        }
      } catch (driveApiErr) {
        console.warn("Drive API fallback failed:", driveApiErr);
      }
    }

    // 5. Fallback 2: uc?export=download
    if (fileId) {
      try {
        const ucUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const ucRes = await fetch(ucUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const contentType = ucRes.headers.get("content-type") || "";
        if (ucRes.ok && contentType.startsWith("image/")) {
          const arrayBuffer = await ucRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(buffer.length),
              "Cache-Control": "public, max-age=86400",
            },
          });
        }
      } catch {}
    }

    return new NextResponse("Foto tidak dapat dimuat dari Google Drive.", { status: 404 });
  } catch (error: any) {
    console.error("Error in photo-proxy route:", error);
    return new NextResponse("Internal Server Error saat memuat foto.", { status: 500 });
  }
}
