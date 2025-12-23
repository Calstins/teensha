// scripts/cleanup-database.js
// WARNING: This script deletes ALL data except Users (Admin/Staff accounts)
// Use with extreme caution!
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

async function cleanupDatabase() {
  console.log('\n🚨 DATABASE CLEANUP SCRIPT 🚨\n');
  console.log(
    'This script will DELETE ALL DATA except User accounts (Admin/Staff)'
  );
  console.log('\nThe following will be deleted:');
  console.log('  ❌ All Teens');
  console.log('  ❌ All Monthly Challenges');
  console.log('  ❌ All Tasks');
  console.log('  ❌ All Submissions');
  console.log('  ❌ All Badges');
  console.log('  ❌ All Transactions');
  console.log('  ❌ All Teen Badges');
  console.log('  ❌ All Teen Progress');
  console.log('  ❌ All Raffle Entries');
  console.log('  ❌ All Raffle Draws');
  console.log('  ❌ All Push Tokens');
  console.log('  ❌ All Notifications');
  console.log('\n✅ The following will be KEPT:');
  console.log('  ✓ All Users (Admin/Staff accounts)');

  // First confirmation
  const confirm1 = await askQuestion(
    '\nAre you ABSOLUTELY SURE you want to continue? (type "yes" to confirm): '
  );

  if (confirm1.toLowerCase() !== 'yes') {
    console.log('\n✅ Cleanup cancelled. No data was deleted.');
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  // Second confirmation
  const confirm2 = await askQuestion(
    '\n⚠️  FINAL WARNING: This action CANNOT be undone!\nType "DELETE ALL DATA" to proceed: '
  );

  if (confirm2 !== 'DELETE ALL DATA') {
    console.log('\n✅ Cleanup cancelled. No data was deleted.');
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('\n🔄 Starting cleanup process...\n');

  try {
    // Get counts before deletion for reporting
    const counts = {
      notifications: await prisma.notification.count(),
      pushTokens: await prisma.pushToken.count(),
      raffleDraw: await prisma.raffleDraw.count(),
      raffleEntries: await prisma.raffleEntry.count(),
      teenProgress: await prisma.teenProgress.count(),
      teenBadges: await prisma.teenBadge.count(),
      transactions: await prisma.transaction.count(),
      submissions: await prisma.submission.count(),
      badges: await prisma.badge.count(),
      tasks: await prisma.task.count(),
      challenges: await prisma.monthlyChallenge.count(),
      teens: await prisma.teen.count(),
      users: await prisma.user.count(),
    };

    console.log('📊 Current database counts:');
    console.log(`   Teens: ${counts.teens}`);
    console.log(`   Challenges: ${counts.challenges}`);
    console.log(`   Tasks: ${counts.tasks}`);
    console.log(`   Submissions: ${counts.submissions}`);
    console.log(`   Badges: ${counts.badges}`);
    console.log(`   Transactions: ${counts.transactions}`);
    console.log(`   Teen Badges: ${counts.teenBadges}`);
    console.log(`   Teen Progress: ${counts.teenProgress}`);
    console.log(`   Raffle Entries: ${counts.raffleEntries}`);
    console.log(`   Raffle Draws: ${counts.raffleDraw}`);
    console.log(`   Push Tokens: ${counts.pushTokens}`);
    console.log(`   Notifications: ${counts.notifications}`);
    console.log(`   Users (will be kept): ${counts.users}\n`);

    // Delete in proper order to respect foreign key constraints
    // Start with child tables first, then parent tables

    console.log('🗑️  Deleting Notifications...');
    await prisma.notification.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Push Tokens...');
    await prisma.pushToken.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Raffle Draws...');
    await prisma.raffleDraw.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Raffle Entries...');
    await prisma.raffleEntry.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Teen Progress...');
    await prisma.teenProgress.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Teen Badges...');
    await prisma.teenBadge.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Transactions...');
    await prisma.transaction.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Submissions...');
    await prisma.submission.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Badges...');
    await prisma.badge.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Tasks...');
    await prisma.task.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Monthly Challenges...');
    await prisma.monthlyChallenge.deleteMany({});
    console.log('   ✅ Deleted');

    console.log('🗑️  Deleting Teens...');
    await prisma.teen.deleteMany({});
    console.log('   ✅ Deleted');

    // Verify Users remain
    const remainingUsers = await prisma.user.count();

    console.log('\n✅ Cleanup completed successfully!\n');
    console.log('📊 Final Summary:');
    console.log(`   ✅ ${counts.teens} Teens deleted`);
    console.log(`   ✅ ${counts.challenges} Challenges deleted`);
    console.log(`   ✅ ${counts.tasks} Tasks deleted`);
    console.log(`   ✅ ${counts.submissions} Submissions deleted`);
    console.log(`   ✅ ${counts.badges} Badges deleted`);
    console.log(`   ✅ ${counts.transactions} Transactions deleted`);
    console.log(`   ✅ ${counts.teenBadges} Teen Badges deleted`);
    console.log(`   ✅ ${counts.teenProgress} Teen Progress records deleted`);
    console.log(`   ✅ ${counts.raffleEntries} Raffle Entries deleted`);
    console.log(`   ✅ ${counts.raffleDraw} Raffle Draws deleted`);
    console.log(`   ✅ ${counts.pushTokens} Push Tokens deleted`);
    console.log(`   ✅ ${counts.notifications} Notifications deleted`);
    console.log(
      `\n   ✓ ${remainingUsers} Users preserved (Admin/Staff accounts)\n`
    );

    console.log('🎉 Database cleanup completed! Only User accounts remain.\n');
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error(
      '⚠️  Some data may have been deleted before the error occurred.'
    );
    console.error(
      '   Please check your database and run the script again if needed.\n'
    );
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Cleanup interrupted by user.');
  rl.close();
  await prisma.$disconnect();
  process.exit(0);
});

// Run the cleanup
cleanupDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
