/**
 * Helper to ensure attendance photo URLs load reliably in all browsers
 * Bypasses Google Drive / Google CDN 429 Too Many Requests hotlink protection
 */
export function getOptimizedPhotoUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/attendance/photo-proxy")) return url;

  // If it's a Google Drive or Google UserContent URL, proxy it through our Next.js API route
  if (url.includes("googleusercontent.com") || url.includes("drive.google.com")) {
    return `/api/attendance/photo-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Returns direct download URL for photo
 */
export function getPhotoDownloadUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  if (url.startsWith("/api/attendance/photo-proxy")) {
    return url.includes("download=true") ? url : `${url}&download=true`;
  }

  return `/api/attendance/photo-proxy?url=${encodeURIComponent(url)}&download=true`;
}
