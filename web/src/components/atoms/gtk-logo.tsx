import React from "react";

interface GtkLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: "icon" | "full" | "horizontal";
  showText?: boolean;
}

/**
 * Modern Vector SVG Logo for E-Presensi GTK
 * (Guru dan Tenaga Kependidikan)
 */
export function GtkLogo({
  size = 48,
  variant = "icon",
  showText = false,
  className = "",
  ...props
}: GtkLogoProps) {
  if (variant === "horizontal" || (showText && variant === "icon")) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <GtkEmblemSvgDef />
        </svg>
        <div className="flex flex-col text-left leading-none select-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-[#00288E] dark:text-blue-400">
              E-PRESENSI
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-black tracking-wider uppercase rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              GTK
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 tracking-wider uppercase">
            Guru & Tenaga Kependidikan
          </span>
        </div>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={`inline-flex flex-col items-center text-center gap-2 select-none ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <GtkEmblemSvgDef />
        </svg>
        <div className="flex flex-col items-center leading-none">
          <span className="font-extrabold text-lg tracking-tight text-[#00288E] dark:text-blue-400">
            E-PRESENSI GTK
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 tracking-wider uppercase">
            Guru & Tenaga Kependidikan
          </span>
        </div>
      </div>
    );
  }

  // Default: Pure Icon Emblem
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <GtkEmblemSvgDef />
    </svg>
  );
}

function GtkEmblemSvgDef() {
  return (
    <>
      <defs>
        {/* Outer Circular Gradient: Deep Navy to Vibrant Emerald */}
        <linearGradient id="gtkRingGrad" x1="10" y1="110" x2="110" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00288E" />
          <stop offset="45%" stopColor="#0B5C9E" />
          <stop offset="80%" stopColor="#00875A" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Checkmark Accent Gradient */}
        <linearGradient id="gtkCheckGrad" x1="45" y1="75" x2="95" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00875A" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Scholar Body Gradient */}
        <linearGradient id="gtkScholarGrad" x1="40" y1="50" x2="70" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00288E" />
          <stop offset="100%" stopColor="#0B427B" />
        </linearGradient>
      </defs>

      {/* 1. Outer Geometric Ring */}
      <circle
        cx="60"
        cy="60"
        r="50"
        stroke="url(#gtkRingGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* 2. Modern Connectivity / Wifi Wave Arcs */}
      <path
        d="M48 24C52 21 68 21 72 24"
        stroke="#10B981"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M52 30C55 28 65 28 68 30"
        stroke="#00875A"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* 3. Mortarboard Graduation Cap */}
      {/* Cap Diamond */}
      <polygon
        points="60,34 88,43 60,52 32,43"
        fill="#00288E"
      />
      {/* Cap Skull Base */}
      <path
        d="M42 47V56C42 61 50 64 60 64C70 64 78 61 78 56V47"
        fill="#00288E"
      />
      {/* Cap Tassel Ribbon */}
      <path
        d="M37 45V59C37 61 35 63 35 65C35 67 39 67 39 65C39 63 37 61 37 59"
        fill="#E5C158"
      />

      {/* 4. Scholar / Teacher Face & Bust Silhouette */}
      <path
        d="M48 66C52 66 58 66 60 67C65 67 69 70 70 75C71 80 68 83 67 85C66 87 68 90 73 93C78 96 79 101 79 104H41C41 98 44 94 48 91C51 88 52 86 52 84C49 84 46 81 46 76C46 71 47 67 48 66Z"
        fill="url(#gtkScholarGrad)"
      />

      {/* 5. Sleek Verified Checkmark Ring Overlay */}
      <circle
        cx="82"
        cy="76"
        r="18"
        fill="white"
        className="dark:fill-slate-900"
      />
      <circle
        cx="82"
        cy="76"
        r="18"
        stroke="url(#gtkCheckGrad)"
        strokeWidth="3.5"
        fill="none"
      />
      {/* Checkmark Polyline */}
      <path
        d="M74 76L79.5 81.5L90 71"
        stroke="url(#gtkCheckGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}
