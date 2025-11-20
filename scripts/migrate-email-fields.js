// scripts/migrate-email-fields.js
// Run this script to add email verification fields to existing Teen records
import prisma from '../lib/prisma.js';

async function migrateExistingTeens() {
  console.log('🔄 Starting migration...');

  try {
    // Get all teens
    const teens = await prisma.teen.findMany({
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    console.log(`📊 Found ${teens.length} teen accounts`);

    // Update teens that don't have email verification fields set
    let updated = 0;
    for (const teen of teens) {
      if (teen.isEmailVerified === undefined || teen.isEmailVerified === null) {
        await prisma.teen.update({
          where: { id: teen.id },
          data: {
            isEmailVerified: false, // Existing accounts need to verify
            verificationToken: null,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        });
        updated++;
      }
    }

    console.log(`✅ Migration complete! Updated ${updated} accounts`);
    console.log(
      `ℹ️  Existing users will need to verify their email on next login`
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateExistingTeens();
