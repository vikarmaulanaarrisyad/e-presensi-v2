import React from "react";
import Link from "next/link";
import { MapPin, Navigation, Settings2, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

interface GeofenceCardProps {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  workStartTime?: string;
  lateThreshold?: string;
}

export function GeofenceQuickCard({
  latitude = -6.2615,
  longitude = 106.8106,
  radiusMeters = 50,
  workStartTime = "07:00",
  lateThreshold = "07:15",
}: GeofenceCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Navigation className="size-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Parameter Geofencing & Jam Kerja
            </h3>
            <span className="text-xs text-muted-foreground block -mt-0.5">
              Validasi presensi GPS aktif di server
            </span>
          </div>
        </div>

        <Badge variant="gold" icon={<ShieldCheck className="size-3" />}>
          Haversine Verified
        </Badge>
      </div>

      {/* Grid parameter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3 text-primary" />
            <span>Titik Koordinat</span>
          </span>
          <span className="font-mono font-semibold text-foreground truncate">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-1">
          <span className="text-muted-foreground">Radius Maksimal</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {radiusMeters} Meter
          </span>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="size-3 text-amber-500" />
            <span>Jam Masuk</span>
          </span>
          <span className="font-mono font-semibold text-foreground">
            {workStartTime} WIB
          </span>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col gap-1">
          <span className="text-muted-foreground">Batas Terlambat</span>
          <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
            {lateThreshold} WIB
          </span>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
        <span>Presensi di luar radius {radiusMeters}m akan otomatis ditolak oleh API mobile.</span>
        <Link href="/admin/geofence">
          <Button size="sm" variant="outline" leftIcon={<Settings2 className="size-3.5" />}>
            Sesuaikan Koordinat
          </Button>
        </Link>
      </div>
    </div>
  );
}
