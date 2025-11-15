// teensha/prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123TeenShappers', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@teenshapers.com' },
    update: {},
    create: {
      email: 'admin@teenshapers.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12);

  const staff = await prisma.user.upsert({
    where: { email: 'staff@teenshapers.com' },
    update: {},
    create: {
      email: 'staff@teenshapers.com',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF',
    },
  });

  // Create sample teen
  const teenPassword = await bcrypt.hash('teen123', 12);

  const teen = await prisma.teen.upsert({
    where: { email: 'teen@example.com' },
    update: {},
    create: {
      email: 'teen@example.com',
      password: teenPassword,
      name: 'Emeka Isah',
      age: 12,
      gender: 'Other',
      state: 'Abuja',
      country: 'Nigeria',
      optInPublic: true,
    },
  });

  console.log('Seed data created:');
  console.log('Admin:', admin.email, '- Password: admin123TeenShappers');
  console.log('Staff:', staff.email, '- Password: staff123');
  console.log('Teen:', teen.email, '- Password: teen123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
