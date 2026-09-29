"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 2. Check if already installed / standalone mode
    const isAppStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsStandalone(isAppStandalone);
    if (isAppStandalone) {
      return; // Already running as PWA, no prompt needed
    }

    // Check if dismissed previously within 3 days
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 3 * 24 * 60 * 60 * 1000) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // 4. Capture beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      setIsDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  // Show banner only if browser supports install or iOS
  if (!isInstallable && !isIos) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#00288e]/20 dark:border-slate-800 shadow-2xl flex items-center justify-between gap-3">
          {/* Logo App */}
          <div className="size-12 rounded-xl bg-gradient-to-tr from-[#00288e] to-[#1e40af] p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <img
              src="/icons/icon-192x192.png"
              alt="E-Presensi Logo"
              className="size-full rounded-[10px] object-cover"
            />
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-[#0b1c30] dark:text-white truncate">
                E-Presensi Guru
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
              Install ke layar HP untuk absensi cepat
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00288e] hover:bg-[#002071] text-white text-xs font-bold shadow-md shadow-[#00288e]/20 transition-all cursor-pointer active:scale-95"
            >
              <Download className="size-3.5" />
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="size-7 rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Smartphone className="size-5 text-[#00288e]" />
                <h3 className="font-bold text-sm text-foreground">
                  Cara Install di iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="size-7 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <ol className="text-xs text-muted-foreground flex flex-col gap-3">
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#dce9ff] text-[#00288e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Buka website ini menggunakan browser <strong>Safari</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#dce9ff] text-[#00288e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Ketuk tombol <strong>Bagikan (Share)</strong> <Share className="size-3.5 inline text-[#00288e] mx-0.5" /> di menu bawah Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#dce9ff] text-[#00288e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Gulir ke bawah lalu pilih menu <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-[#dce9ff] text-[#00288e] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  Ketuk <strong>Tambah</strong> di pojok kanan atas. Ikon aplikasi akan muncul di layar ponsel Anda!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#002071] transition-all cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
