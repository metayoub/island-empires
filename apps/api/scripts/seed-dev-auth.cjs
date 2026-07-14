const { PrismaClient } = require('@prisma/client');
const { randomBytes, scrypt: scryptCallback } = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);
const prisma = new PrismaClient();

const DEV_EMAIL = process.env.ADMIN_SEED_EMAIL || process.env.DEV_AUTH_EMAIL || 'dev@island-empires.local';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'password123';
const DEV_DISPLAY_NAME = process.env.DEV_AUTH_DISPLAY_NAME || 'Founder';
const DEV_ADMIN_ROLE = process.env.ADMIN_SEED_ROLE || process.env.DEV_ADMIN_ROLE || 'super_admin';

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('base64url')}`;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a known development password in production.');
  }

  const now = new Date();
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {
      passwordHash,
      displayName: DEV_DISPLAY_NAME,
      accountStatus: 'active',
      isAdmin: true,
      adminRole: DEV_ADMIN_ROLE,
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
    },
    create: {
      email: DEV_EMAIL,
      passwordHash,
      displayName: DEV_DISPLAY_NAME,
      accountStatus: 'active',
      isAdmin: true,
      adminRole: DEV_ADMIN_ROLE,
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
    },
  });
  const activeRole = await prisma.adminRole.findFirst({
    where: { userId: user.id, role: DEV_ADMIN_ROLE, revokedAt: null },
  });
  if (!activeRole) {
    await prisma.adminRole.create({
      data: {
        userId: user.id,
        role: DEV_ADMIN_ROLE,
      },
    });
  }

  console.log(`Seeded local dev admin login for ${user.email}`);
  console.log(`Admin role: ${DEV_ADMIN_ROLE}`);
  console.log(`Password: ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
