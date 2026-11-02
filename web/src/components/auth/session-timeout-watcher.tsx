"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { customSwal } from "@/lib/swal";

interface SessionTimeoutWatcherProps {
  expiresAt?: number | null;
  redirectUrl: string;
}

export function SessionTimeoutWatcher({
  expiresAt,
  redirectUrl,
}: SessionTimeoutWatcherProps) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!expiresAt || typeof expiresAt !== "number") return;

    const handleTimeout = async () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      try {
        await customSwal.fire({
          icon: "warning",
          title: "Sesi Login Telah Berakhir",
          text: "Masa aktif login (2 jam) telah selesai demi keamanan. Silakan masuk kembali ke akun Anda.",
          confirmButtonText: "Masuk Kembali",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
      } catch {
        // Fallback if dialog fails
      }

      try {
        await signOut({ redirect: false });
      } catch {
        // Ignore signout network error
      }

      window.location.href = redirectUrl;
    };

    const checkExpiration = () => {
      const now = Date.now();
      if (now >= expiresAt) {
        handleTimeout();
      }
    };

    // 1. Initial check immediately on mount
    checkExpiration();

    // 2. Interval check every 15 seconds
    const intervalId = setInterval(checkExpiration, 15000);

    // 3. Exact setTimeout for remaining time if within positive range
    const remainingMs = Math.max(0, expiresAt - Date.now());
    const timeoutId = setTimeout(handleTimeout, remainingMs);

    // 4. Check on tab visibility change (e.g. user unlocks phone or switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkExpiration();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [expiresAt, redirectUrl]);

  return null;
}
