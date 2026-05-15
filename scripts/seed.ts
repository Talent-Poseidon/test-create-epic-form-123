const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('adminpassword', 10);

  // Original Admin (preserve existing logic)
  const originalAdmin = await prisma.user.upsert({
    where: { email: 'admin@monster.com' },
    update: {
      password: adminPassword,
      role: 'admin',
      is_approved: true,
    },
    create: {
      email: 'admin@monster.com',
      name: 'Admin Monster',
      password: adminPassword,
      role: 'admin',
      is_approved: true,
    },
  });

  // Test Admin (for E2E tests)
  const testAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password,
      role: 'admin',
      is_approved: true,
    },
    create: {
      email: 'admin@example.com',
      name: 'Test Admin',
      password,
      role: 'admin',
      is_approved: true,
    },
  });

  // Test User (for E2E tests)
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      password,
      role: 'user',
      is_approved: true,
    },
    create: {
      email: 'user@example.com',
      name: 'Test User',
      password,
      role: 'user',
      is_approved: true,
    },
  });

  // Seed Kamus items for E2E tests
  const seedKamusKom = await prisma.kamusItem.upsert({
    where: { code: 'SEED-K-001' },
    update: {},
    create: {
      id: 'seed-kamus-1',
      code: 'SEED-K-001',
      name: 'Komunikasi Efektif',
      type: 'kompetensi',
      description: 'Kemampuan menyampaikan ide secara jelas',
      behavioralIndicators: 'Berbicara terstruktur; Mendengarkan aktif',
    },
  });

  const seedKamusPot = await prisma.kamusItem.upsert({
    where: { code: 'SEED-P-001' },
    update: {},
    create: {
      id: 'seed-kamus-2',
      code: 'SEED-P-001',
      name: 'Logika',
      type: 'potensi',
      description: 'Kemampuan berpikir logis',
      behavioralIndicators: 'Memecahkan masalah; Menarik kesimpulan',
    },
  });

  const seedKamusUsed = await prisma.kamusItem.upsert({
    where: { code: 'SEED-USED-001' },
    update: {},
    create: {
      id: 'seed-kamus-used',
      code: 'SEED-USED-001',
      name: 'Kepemimpinan',
      type: 'kompetensi',
      description: 'Kemampuan memimpin tim',
      behavioralIndicators: 'Memberi arahan; Memotivasi tim',
    },
  });

  // Seed StandarJabatan that uses one Kamus item — for delete-protection test
  const seedStandar = await prisma.standarJabatan.upsert({
    where: { name: 'Seed Manager Standar' },
    update: {},
    create: {
      id: 'seed-standar-1',
      name: 'Seed Manager Standar',
      level: 'Manager',
      description: 'Standar jabatan untuk manager',
    },
  });

  await prisma.standarJabatanItem.upsert({
    where: {
      standarJabatanId_kamusItemId: {
        standarJabatanId: seedStandar.id,
        kamusItemId: seedKamusUsed.id,
      },
    },
    update: {},
    create: {
      standarJabatanId: seedStandar.id,
      kamusItemId: seedKamusUsed.id,
      expectedLevel: 4,
    },
  });

  console.log({
    originalAdmin,
    testAdmin,
    testUser,
    seedKamusKom,
    seedKamusPot,
    seedKamusUsed,
    seedStandar,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
