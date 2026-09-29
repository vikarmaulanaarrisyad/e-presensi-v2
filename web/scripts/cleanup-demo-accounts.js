const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Memulai pembersihan akun demo...");

  // 1. Tentukan nama madrasah yang HARUS DIPERTAHANKAN
  // Menggunakan pencarian case-insensitive dan fleksibel
  const keptMadrasahs = await prisma.madrasah.findMany({
    where: {
      OR: [
        { name: { contains: "BUSTANUL HUDA", mode: "insensitive" } },
        { name: { contains: "IKHSANIYAH", mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, nsm: true }
  });

  console.log("✓ Madrasah yang DIPERTAHANKAN:");
  keptMadrasahs.forEach(m => console.log(`  - [${m.id}] ${m.name} (NSM: ${m.nsm})`));

  const keptMadrasahIds = keptMadrasahs.map(m => m.id);

  if (keptMadrasahIds.length === 0) {
    throw new Error("Peringatan: Madrasah target tidak ditemukan! Operasi dibatalkan demi keamanan.");
  }

  // 2. Cari Madrasah yang AKAN DIHAPUS (selain madrasah yang dipertahankan)
  const madrasahsToDelete = await prisma.madrasah.findMany({
    where: {
      id: { notIn: keptMadrasahIds }
    },
    select: { id: true, name: true, nsm: true }
  });

  console.log("\n⚠️ Madrasah Demo yang AKAN DIHAPUS:");
  madrasahsToDelete.forEach(m => console.log(`  - [${m.id}] ${m.name} (NSM: ${m.nsm})`));
  const deleteMadrasahIds = madrasahsToDelete.map(m => m.id);

  // 3. Cari User yang AKAN DIHAPUS:
  // - User yang terdaftar di madrasah yang akan dihapus
  // - ATAU User selain SUPERADMIN yang madrasahId-nya tidak masuk keptMadrasahIds
  const usersToDelete = await prisma.user.findMany({
    where: {
      role: { not: "SUPERADMIN" },
      OR: [
        { madrasahId: { in: deleteMadrasahIds } },
        { madrasahId: { notIn: keptMadrasahIds } },
        { madrasahId: null } // non-superadmin without madrasah
      ]
    },
    select: { id: true, name: true, email: true, role: true, madrasahId: true }
  });

  console.log("\n⚠️ Akun Demo yang AKAN DIHAPUS:");
  usersToDelete.forEach(u => console.log(`  - [${u.role}] ${u.name} <${u.email}>`));
  const deleteUserIds = usersToDelete.map(u => u.id);

  // 4. Lakukan penghapusan secara aman berurutan
  // A. Hapus AttendanceLog yang terkait dengan user/madrasah demo
  const deletedLogs = await prisma.attendanceLog.deleteMany({
    where: {
      OR: [
        { madrasahId: { in: deleteMadrasahIds } },
        { userId: { in: deleteUserIds } }
      ]
    }
  });
  console.log(`\n✓ Menghapus ${deletedLogs.count} log presensi demo.`);

  // B. Hapus Holiday madrasah demo
  const deletedHolidays = await prisma.holiday.deleteMany({
    where: { madrasahId: { in: deleteMadrasahIds } }
  });
  console.log(`✓ Menghapus ${deletedHolidays.count} hari libur demo.`);

  // C. Hapus Position madrasah demo
  const deletedPositions = await prisma.position.deleteMany({
    where: { madrasahId: { in: deleteMadrasahIds } }
  });
  console.log(`✓ Menghapus ${deletedPositions.count} jabatan demo.`);

  // D. Hapus MadrasahSetting madrasah demo
  const deletedSettings = await prisma.madrasahSetting.deleteMany({
    where: { madrasahId: { in: deleteMadrasahIds } }
  });
  console.log(`✓ Menghapus ${deletedSettings.count} setting madrasah demo.`);

  // E. Hapus User demo (kecuali Superadmin)
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: deleteUserIds } }
  });
  console.log(`✓ Menghapus ${deletedUsers.count} user demo.`);

  // F. Hapus Madrasah demo
  const deletedMadrasahs = await prisma.madrasah.deleteMany({
    where: { id: { in: deleteMadrasahIds } }
  });
  console.log(`✓ Menghapus ${deletedMadrasahs.count} madrasah demo.`);

  console.log("\n🎉 Pembersihan selesai!");

  // Verifikasi hasil akhir di database
  console.log("\n=== STATUS DATABASE SETELAH PEMBERSIHAN ===");
  const remainingMadrasahs = await prisma.madrasah.findMany({
    include: { _count: { select: { users: true, attendanceLogs: true } } }
  });
  console.log("Madrasah Aktif:");
  remainingMadrasahs.forEach(m => {
    console.log(`  - ${m.name} | ${m._count.users} Users | ${m._count.attendanceLogs} Logs`);
  });

  const remainingUsers = await prisma.user.findMany({
    select: { name: true, email: true, role: true, madrasah: { select: { name: true } } }
  });
  console.log("\nAkun User Aktif:");
  remainingUsers.forEach(u => {
    console.log(`  - [${u.role}] ${u.name} <${u.email}> (${u.madrasah?.name || "Global / Kemenag"})`);
  });
}

main()
  .catch(err => {
    console.error("❌ Terjadi kesalahan saat pembersihan:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
