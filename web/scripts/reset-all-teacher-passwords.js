const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Mereset kata sandi semua akun guru dan operator...");

  const defaultPassword = "Password123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Update all TEACHER and ADMIN_MADRASAH users
  const updateResult = await prisma.user.updateMany({
    where: {
      role: { in: ["TEACHER", "ADMIN_MADRASAH"] }
    },
    data: {
      passwordHash,
      isActive: true
    }
  });

  console.log(`✓ Berhasil mereset kata sandi untuk ${updateResult.count} akun pengguna!`);
  console.log(`✓ Kata sandi default disetel menjadi: ${defaultPassword}`);

  // Tampilkan daftar akun yang direset
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      nip: true,
      nuptk: true,
      pegId: true,
      madrasah: { select: { name: true } }
    },
    orderBy: [
      { role: "asc" },
      { name: "asc" }
    ]
  });

  console.log("\n=== DAFTAR AKUN SIAP LOGIN ===");
  users.forEach((u, i) => {
    console.log(`${i + 1}. [${u.role}] ${u.name}`);
    console.log(`   - Email : ${u.email}`);
    console.log(`   - NUPTK : ${u.nuptk || "-"}`);
    console.log(`   - PegID : ${u.pegId || "-"}`);
    console.log(`   - NIP   : ${u.nip || "-"}`);
    console.log(`   - Pass  : ${defaultPassword}`);
    console.log(`   - Lokasi: ${u.madrasah?.name || "Kemenag Pusat"}\n`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
