import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database...");

  // 1. Password default terenkripsi
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 2. Buat Superadmin Kemenag
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@kemenag.go.id" },
    update: {},
    create: {
      name: "Super Administrator Kemenag",
      email: "superadmin@kemenag.go.id",
      passwordHash: defaultPasswordHash,
      role: "SUPERADMIN",
      nip: "198001012005011001",
      phone: "081234567890",
      isActive: true,
    },
  });
  console.log(`✓ Superadmin dibuat: ${superadmin.email}`);

  // 3. Buat Data Madrasah Contoh: MIN 1 Jakarta Selatan
  const madrasah = await prisma.madrasah.upsert({
    where: { nsm: "111131740001" },
    update: {},
    create: {
      name: "MIN 1 Jakarta Selatan",
      nsm: "111131740001",
      npsn: "60721234",
      address: "Jl. Madrasah No. 1, Cilandak, Jakarta Selatan",
      phone: "021-7654321",
      email: "kontak@min1jaksel.sch.id",
      isActive: true,
      settings: {
        create: {
          latitude: -6.2615,
          longitude: 106.8106,
          radiusMeters: 50.0,
          workStartTime: "07:00",
          lateThreshold: "07:15",
          workEndTime: "14:00",
        },
      },
    },
    include: {
      settings: true,
    },
  });
  console.log(`✓ Madrasah dibuat: ${madrasah.name} (Radius Geofence: ${madrasah.settings?.radiusMeters}m)`);

  // 4. Buat Admin Madrasah (Operator)
  const adminMadrasah = await prisma.user.upsert({
    where: { email: "admin@min1jaksel.sch.id" },
    update: {},
    create: {
      name: "Operator Madrasah MIN 1",
      email: "admin@min1jaksel.sch.id",
      passwordHash: defaultPasswordHash,
      role: "ADMIN_MADRASAH",
      madrasahId: madrasah.id,
      nip: "198805202012011003",
      phone: "081298765432",
      isActive: true,
    },
  });
  console.log(`✓ Admin Madrasah dibuat: ${adminMadrasah.email}`);

  // 5. Buat Guru Contoh & Rekam Kehadiran
  const teachersData = [
    {
      name: "Ahmad Fauzi, S.Pd.I",
      email: "fauzi@min1jaksel.sch.id",
      nip: "199203152019031002",
      phone: "081311223344",
      status: "PRESENT" as const,
      checkInTime: new Date(new Date().setHours(6, 52, 0, 0)),
      checkInDistance: 18.5,
      checkInLat: -6.26148,
      checkInLng: 106.81062,
      notes: "Tepat waktu di area kelas 3A",
    },
    {
      name: "Siti Nurhaliza, M.Pd",
      email: "siti@min1jaksel.sch.id",
      nip: "198711042014022001",
      phone: "081299887766",
      status: "PRESENT" as const,
      checkInTime: new Date(new Date().setHours(7, 5, 0, 0)),
      checkInDistance: 24.1,
      checkInLat: -6.26152,
      checkInLng: 106.81055,
      notes: "Hadir tepat waktu sebelum apel pagi",
    },
    {
      name: "Drs. H. Muhammad Ridwan",
      email: "ridwan@min1jaksel.sch.id",
      nip: "197508122002121003",
      phone: "081234123412",
      status: "LATE" as const,
      checkInTime: new Date(new Date().setHours(7, 24, 0, 0)),
      checkInDistance: 32.7,
      checkInLat: -6.26155,
      checkInLng: 106.81045,
      notes: "Terlambat 9 menit karena kendala lalu lintas",
    },
    {
      name: "Fathimatuzzahra, S.Pd",
      email: "zahra@min1jaksel.sch.id",
      nip: "199501252020122004",
      phone: "085678912345",
      status: "PERMIT" as const,
      checkInTime: null,
      checkInDistance: null,
      checkInLat: null,
      checkInLng: null,
      notes: "Izin dinas: Menghadiri Pelatihan Kurikulum Kemenag di Balai Diklat",
    },
    {
      name: "Budi Santoso, S.Kom",
      email: "budi@min1jaksel.sch.id",
      nip: "199009182018011002",
      phone: "087788990011",
      status: "SICK" as const,
      checkInTime: null,
      checkInDistance: null,
      checkInLat: null,
      checkInLng: null,
      notes: "Sakit (Surat Dokter No. 142/KLN/IX/2026)",
    },
  ];

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  for (const t of teachersData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name, nip: t.nip, phone: t.phone },
      create: {
        name: t.name,
        email: t.email,
        passwordHash: defaultPasswordHash,
        role: "TEACHER",
        madrasahId: madrasah.id,
        nip: t.nip,
        phone: t.phone,
        isActive: true,
      },
    });

    await prisma.attendanceLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: todayDate,
        },
      },
      update: {
        status: t.status,
        checkInTime: t.checkInTime,
        checkInDistance: t.checkInDistance,
        checkInLat: t.checkInLat,
        checkInLng: t.checkInLng,
        notes: t.notes,
      },
      create: {
        madrasahId: madrasah.id,
        userId: user.id,
        date: todayDate,
        status: t.status,
        checkInTime: t.checkInTime,
        checkInDistance: t.checkInDistance,
        checkInLat: t.checkInLat,
        checkInLng: t.checkInLng,
        notes: t.notes,
      },
    });
  }

  console.log(`✓ 5 Guru & Log Presensi hari ini berhasil disiapkan untuk ${madrasah.name}`);

  console.log("\n🎉 Seeding selesai dengan sukses!");
  console.log("Kredensial Default Login (Password: Password123!):");
  console.log("1. Superadmin     : superadmin@kemenag.go.id");
  console.log("2. Admin Madrasah : admin@min1jaksel.sch.id");
  console.log("3. Guru (Mobile)  : fauzi@min1jaksel.sch.id / NIP: 199203152019031002");
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
