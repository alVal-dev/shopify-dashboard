import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    console.log('Seeding database...');

    // Utilisateur démo — pas de mot de passe, auth via bouton "Explorer la démo"
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@shopify-dashboard.com' },
      update: { role: 'DEMO' },
      create: {
        email: 'demo@shopify-dashboard.com',
        role: 'DEMO',
        password: null,
      },
    });
    console.log(`Demo user: ${demoUser.email} (${demoUser.id})`);

    // Utilisateur standard — mot de passe hashé
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    const johnUser = await prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        email: 'john@example.com',
        role: 'USER',
        password: hashedPassword,
      },
    });
    console.log(`  John user: ${johnUser.email} (${johnUser.id})`);

    console.log('Seed completed successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
