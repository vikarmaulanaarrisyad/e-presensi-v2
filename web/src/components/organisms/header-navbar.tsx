"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, 
  MapPin, 
  RefreshCw, 
  Download, 
  School, 
  Menu
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

interface HeaderNavbarProps {
  madrasahName?: string;
  nsm?: string;
  radiusMeters?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function HeaderNavbar({
  madrasahName = "MIN 1 Jakarta Selatan",
  nsm = "111131740001",
  radiusMeters = 50,
  onRefresh,
  isRefreshing = false,
}: HeaderNavbarProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " WIB"
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-border/80 bg-background/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Title & Status */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base sm:text-lg text-foreground tracking-tight">
              {madrasahName}
            </h1>
            <Badge variant="default" className="hidden sm:inline-flex text-[10px]">
              NSM: {nsm}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-primary" />
              <span>{currentDate} &bull; {currentTime}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        <Badge variant="gold" icon={<MapPin className="size-3" />} className="hidden md:inline-flex">
          Geofence: {radiusMeters} Meter
        </Badge>

        {onRefresh && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="size-3.5" />}
          >
            Segarkan
          </Button>
        )}

        <Button
          size="sm"
          variant="default"
          onClick={() => alert("Mengunduh rekap presensi format Excel...")}
          leftIcon={<Download className="size-3.5" />}
        >
          Ekspor Excel
        </Button>
      </div>
    </header>
  );
}
