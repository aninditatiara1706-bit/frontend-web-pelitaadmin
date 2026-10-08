import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME?.trim();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 12) {
    throw new Error('Set SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and a SEED_ADMIN_PASSWORD of at least 12 characters before seeding.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { name, email, passwordHash, role: Role.ADMIN },
    update: { name, passwordHash, role: Role.ADMIN },
  });
  console.info(`Seeded admin account for ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

