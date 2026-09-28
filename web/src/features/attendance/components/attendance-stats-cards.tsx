import React from "react";
import { 
  Users, 
  UserCheck, 
  Clock, 
  FileText, 
  AlertTriangle, 
  MapPin, 
  TrendingUp 
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";

interface StatsProps {
  totalTeachers: number;
  presentCount: number;
  lateCount: number;
  permitCount: number;
  sickCount: number;
  absentCount: number;
  attendancePercentage: number;
  radiusMeters?: number;
  latitude?: number;
  longitude?: number;
}

export function AttendanceStatsCards({
  totalTeachers,
  presentCount,
  lateCount,
  permitCount,
  sickCount,
  absentCount,
  attendancePercentage,
  radiusMeters = 50,
  latitude = -6.2615,
  longitude = 106.8106,
}: StatsProps) {
  const statsList = [
    {
      title: "Total Guru",
      value: totalTeachers,
      subtitle: "Terdaftar aktif",
      icon: Users,
      badge: "MI Aktif",
      badgeVariant: "default" as const,
      color: "text-primary",
      bgLight: "bg-primary/10",
      borderColor: "border-primary/20",
    },
    {
      title: "Hadir Tepat Waktu",
      value: presentCount,
      subtitle: "Sebelum jam 07:15 WIB",
      icon: UserCheck,
      badge: `${totalTeachers > 0 ? Math.round((presentCount / totalTeachers) * 100) : 0}%`,
      badgeVariant: "success" as const,
      color: "text-emerald-600 dark:text-emerald-400",
      bgLight: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Terlambat",
      value: lateCount,
      subtitle: "Setelah jam 07:15 WIB",
      icon: Clock,
      badge: "Perlu Evaluasi",
      badgeVariant: "warning" as const,
      color: "text-amber-600 dark:text-amber-400",
      bgLight: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      title: "Izin / Sakit",
      value: permitCount + sickCount,
      subtitle: `${permitCount} Izin, ${sickCount} Sakit`,
      icon: FileText,
      badge: "Ada Keterangan",
      badgeVariant: "gold" as const,
      color: "text-[#B8860B]",
      bgLight: "bg-[#D4AF37]/15",
      borderColor: "border-[#D4AF37]/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsList.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </span>
              <div className={`size-9 rounded-xl ${stat.bgLight} flex items-center justify-center ${stat.color}`}>
                <Icon className="size-4.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                {stat.value}
              </span>
              <Badge variant={stat.badgeVariant}>
                {stat.badge}
              </Badge>
            </div>

            <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>{stat.subtitle}</span>
              <span className="font-semibold text-foreground">Guru</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
