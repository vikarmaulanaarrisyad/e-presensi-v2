"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Camera, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  FlipHorizontal,
  Upload
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

interface MobileCameraModalProps {
  isOpen: boolean;
  type: "CHECK_IN" | "CHECK_OUT";
  teacherName: string;
  teacherNip: string;
  madrasahName: string;
  currentLat: number;
  currentLng: number;
  distanceMeters: number;
  isInsideRadius: boolean;
  onClose: () => void;
  onSubmit: (photoBase64: string, notes?: string) => Promise<void>;
}

export function MobileCameraModal({
  isOpen,
  type,
  teacherName,
  teacherNip,
  madrasahName,
  currentLat,
  currentLng,
  distanceMeters,
  isInsideRadius,
  onClose,
  onSubmit,
}: MobileCameraModalProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop current video stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Start webcam stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Kamera tidak didukung pada browser ini.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsStreaming(true);
        };
      }
    } catch (err: any) {
      console.warn("Kamera tidak dapat diakses:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Izin akses kamera ditolak. Silakan izinkan akses kamera atau gunakan simulasi unggah foto."
          : "Perangkat kamera tidak terdeteksi atau sedang digunakan aplikasi lain."
      );
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, capturedPhoto, startCamera, stopStream]);

  // Flip Camera Front / Back
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Capture Snapshot and Burn Watermark
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    canvas.width = w;
    canvas.height = h;

    // Draw video frame (mirror if front camera)
    ctx.save();
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Burn Official Watermark
    const barHeight = Math.max(80, Math.floor(h * 0.16));
    const gradient = ctx.createLinearGradient(0, h - barHeight - 20, 0, h);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.3, "rgba(5, 96, 58, 0.75)");
    gradient.addColorStop(1, "rgba(5, 96, 58, 0.95)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, h - barHeight - 20, w, barHeight + 20);

    // Watermark Texts
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.floor(w * 0.034)}px system-ui, sans-serif`;
    ctx.fillText(`${teacherName} (${teacherNip})`, 20, h - barHeight + 10);

    ctx.font = `${Math.floor(w * 0.026)}px system-ui, sans-serif`;
    ctx.fillStyle = "#E0E7FF";
    ctx.fillText(madrasahName, 20, h - barHeight + 30);

    const now = new Date();
    const timeStr = now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB";

    ctx.fillStyle = "#FDE047"; // Yellow accent
    ctx.font = `600 ${Math.floor(w * 0.025)}px system-ui, sans-serif`;
    ctx.fillText(
      `⏱️ ${timeStr} • GPS: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)} (${distanceMeters.toFixed(1)}m)`,
      20,
      h - barHeight + 50
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);
    stopStream();
  };

  // Fallback: Upload Photo / Simulation Photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Watermark
        const barHeight = Math.max(80, Math.floor(img.height * 0.16));
        ctx.fillStyle = "rgba(5, 96, 58, 0.85)";
        ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${Math.floor(img.width * 0.035)}px system-ui, sans-serif`;
        ctx.fillText(`${teacherName} • ${teacherNip}`, 20, img.height - barHeight + 30);

        ctx.font = `${Math.floor(img.width * 0.026)}px system-ui, sans-serif`;
        ctx.fillStyle = "#FDE047";
        ctx.fillText(
          `⏱️ ${new Date().toLocaleTimeString("id-ID")} WIB • ${madrasahName} (${distanceMeters.toFixed(1)}m)`,
          20,
          img.height - barHeight + 58
        );

        setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.85));
        stopStream();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Photo
  const handleSendAttendance = async () => {
    if (!capturedPhoto) return;
    setIsSubmitting(true);
    try {
      await onSubmit(capturedPhoto, notes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4">
      {/* Hidden canvas for snapshot watermark rendering */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40">
              <Camera className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {type === "CHECK_IN" ? "Selfie Presensi Masuk" : "Selfie Presensi Pulang"}
              </h3>
              <p className="text-[11px] text-emerald-200">Verifikasi Wajah & Geofence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px]">
          {capturedPhoto ? (
            /* Snapshot Review View */
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedPhoto}
                alt="Selfie Presensi"
                className="w-full h-auto max-h-[380px] object-contain rounded-lg"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Foto Berhasil Diambil
              </div>
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative w-full h-full flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center text-slate-300 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-amber-200 leading-relaxed max-w-xs">{cameraError}</p>
                  <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                    <Button
                      size="sm"
                      onClick={startCamera}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Coba Akses Kamera Lagi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-slate-700 text-slate-200 hover:bg-slate-800 rounded-xl gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      Pilih / Ambil Foto File
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover max-h-[420px] ${
                      facingMode === "user" ? "-scale-x-100" : ""
                    }`}
                  />

                  {/* Face Guide Oval */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-72 border-2 border-dashed border-emerald-400/70 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.25)] flex items-center justify-center">
                      <div className="text-center text-emerald-200/80 text-[11px] bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        Posisikan Wajah di Sini
                      </div>
                    </div>
                  </div>

                  {/* Distance & Geofence Floating Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow ${
                        isInsideRadius
                          ? "bg-emerald-600/90 text-white border border-emerald-400/40"
                          : "bg-rose-600/90 text-white border border-rose-400/40"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{distanceMeters.toFixed(1)}m</span>
                      <span>•</span>
                      <span>{isInsideRadius ? "Dalam Radius" : "Di Luar Radius"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="pointer-events-auto w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 transition-all active:scale-95"
                      title="Balik Kamera Depan/Belakang"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
          {capturedPhoto ? (
            /* Review and Confirm Controls */
            <div className="flex flex-col gap-2.5">
              <input
                type="text"
                placeholder="Catatan kehadiran (opsional, misal: Piket gerbang)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCapturedPhoto(null);
                    startCamera();
                  }}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs py-2.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Foto Ulang
                </Button>

                <Button
                  type="button"
                  onClick={handleSendAttendance}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs py-2.5 shadow-lg shadow-emerald-900/40"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Mengirim...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kirim Presensi Sekarang
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Capture Controls */
            <div className="flex items-center justify-around py-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[10px]">Unggah</span>
              </button>

              {/* Shutter Button (Flutter Style) */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isStreaming && !cameraError}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 bg-transparent hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <div className="w-full h-full rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>

              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <FlipHorizontal className="w-4 h-4" />
                </div>
                <span className="text-[10px]">Balik</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
