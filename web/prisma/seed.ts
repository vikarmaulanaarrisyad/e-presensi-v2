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

  // 5. Buat Guru Contoh
  const guru = await prisma.user.upsert({
    where: { email: "fauzi@min1jaksel.sch.id" },
    update: {},
    create: {
      name: "Ahmad Fauzi, S.Pd.I",
      email: "fauzi@min1jaksel.sch.id",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      madrasahId: madrasah.id,
      nip: "199203152019031002",
      phone: "081311223344",
      isActive: true,
    },
  });
  console.log(`✓ Guru dibuat: ${guru.name} (NIP: ${guru.nip})`);

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
