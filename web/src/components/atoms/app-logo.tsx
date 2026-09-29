import React from "react";
import Image from "next/image";

interface AppLogoProps {
  variant?: "mark" | "horizontal" | "horizontal-dark" | "app-icon";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

export function AppLogo({
  variant = "horizontal",
  size = "md",
  className = "",
  showText = true,
}: AppLogoProps) {
  // Dimension presets
  const sizeMap = {
    sm: { width: variant === "mark" || variant === "app-icon" ? 36 : 140, height: 36 },
    md: { width: variant === "mark" || variant === "app-icon" ? 48 : 190, height: 48 },
    lg: { width: variant === "mark" || variant === "app-icon" ? 64 : 250, height: 64 },
    xl: { width: variant === "mark" || variant === "app-icon" ? 80 : 320, height: 80 },
  };

  const currentSize = sizeMap[size];

  if (variant === "app-icon") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl shadow-md border border-slate-200/50 ${className}`}
        style={{ width: currentSize.width, height: currentSize.height }}
      >
        <img
          src="/icons/logo-app-icon.jpg"
          alt="E-Presensi GTK App Icon"
          className="size-full object-cover"
        />
      </div>
    );
  }

  if (variant === "mark") {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: currentSize.width, height: currentSize.height }}
      >
        <img
          src="/icons/logo-gtk-mark.svg"
          alt="Logo E-Presensi GTK"
          className="size-full object-contain"
        />
      </div>
    );
  }

  if (variant === "horizontal-dark") {
    return (
      <div
        className={`relative inline-flex items-center shrink-0 ${className}`}
        style={{ width: currentSize.width, height: currentSize.height }}
      >
        <img
          src="/icons/logo-gtk-horizontal-dark.svg"
          alt="E-Presensi GTK (Guru & Tenaga Kependidikan)"
          className="size-full object-contain"
        />
      </div>
    );
  }

  // Default: horizontal light theme
  return (
    <div
      className={`relative inline-flex items-center shrink-0 ${className}`}
      style={{ width: currentSize.width, height: currentSize.height }}
    >
      <img
        src="/icons/logo-gtk-horizontal.svg"
        alt="E-Presensi GTK (Guru & Tenaga Kependidikan)"
        className="size-full object-contain"
      />
    </div>
  );
}
