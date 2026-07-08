// utils/helpers.js
import prisma from '../lib/prisma.js';

// Calculate progress percentage
export const calculateProgress = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Format date for display
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Generate random string
export const generateRandomString = (length = 10) => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if date is in range
export const isDateInRange = (date, start, end) => {
  const checkDate = new Date(date);
  const startDate = new Date(start);
  const endDate = new Date(end);
  return checkDate >= startDate && checkDate <= endDate;
};

// Get current active challenge
export const getCurrentChallengeUtils = async () => {
  const currentDate = new Date();

  return await prisma.monthlyChallenge.findFirst({
    where: {
      isPublished: true,
      isActive: true,
      goLiveDate: { lte: currentDate },
      closingDate: { gte: currentDate },
    },
    include: {
      tasks: true,
      badge: true,
    },
  });
};

// Update teen progress helper
export const updateTeenProgressHelper = async (teenId, challengeId) => {
  try {
    // Get all tasks for the challenge
    const tasks = await prisma.task.findMany({
      where: { challengeId },
    });

    // Get completed submissions for this teen and challenge
    const completedSubmissions = await prisma.submission.count({
      where: {
        teenId,
        status: 'APPROVED',
        task: {
          challengeId,
        },
      },
    });

    const totalTasks = tasks.length;
    const percentage = calculateProgress(completedSubmissions, totalTasks);
    const isCompleted = percentage === 100;

    // Update or create progress record
    await prisma.teenProgress.upsert({
      where: {
        teenId_challengeId: {
          teenId,
          challengeId,
        },
      },
      update: {
        tasksTotal: totalTasks,
        tasksCompleted: completedSubmissions,
        percentage,
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        teenId,
        challengeId,
        tasksTotal: totalTasks,
        tasksCompleted: completedSubmissions,
        percentage,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // ✅ NON-PAYMENT PROGRESSION PATH:
    // Completing a challenge's tasks earns its badge for free — no purchase
    // required. Payment (see badgeController) only ever sets an independent
    // `isPurchased` flag for teens who *choose* to buy a related product.
    // We only ever grant EARNED here; we never revoke it, so a later edit or
    // deletion of a submission can't claw back a badge a teen already earned.
    if (isCompleted && totalTasks > 0) {
      await grantEarnedBadgeIfCompleted(teenId, challengeId);
    }

    return { totalTasks, completedSubmissions, percentage, isCompleted };
  } catch (error) {
    console.error('Update progress helper error:', error);
    throw error;
  }
};

// Grant a teen's badge as EARNED (free) once they've completed 100% of a
// challenge's tasks. Independent of any purchase. Idempotent and safe to
// call repeatedly — never downgrades an already-EARNED badge.
export const grantEarnedBadgeIfCompleted = async (teenId, challengeId) => {
  try {
    const badge = await prisma.badge.findUnique({
      where: { challengeId },
    });

    if (!badge || !badge.isActive) {
      return null;
    }

    const existing = await prisma.teenBadge.findUnique({
      where: {
        teenId_badgeId: {
          teenId,
          badgeId: badge.id,
        },
      },
    });

    if (existing && existing.status === 'EARNED') {
      return existing;
    }

    const teenBadge = await prisma.teenBadge.upsert({
      where: {
        teenId_badgeId: {
          teenId,
          badgeId: badge.id,
        },
      },
      update: {
        status: 'EARNED',
        earnedAt: new Date(),
      },
      create: {
        teenId,
        badgeId: badge.id,
        status: 'EARNED',
        earnedAt: new Date(),
      },
    });

    return teenBadge;
  } catch (error) {
    console.error('Grant earned badge helper error:', error);
    // Don't let badge-granting failures block progress tracking
    return null;
  }
};

// Update raffle eligibility helper
// Raffle eligibility is intentionally tied to PURCHASES specifically (not to
// free EARNED badges). Earning a badge is always free and never required to
// progress; purchasing 12 badges in a year is what qualifies a teen for the
// annual raffle draw — this is the concrete, optional benefit of purchasing
// that should be surfaced to users wherever a purchase is offered.
export const updateRaffleEligibilityHelper = async (teenId, year) => {
  try {
    const purchasedBadges = await prisma.teenBadge.count({
      where: {
        teenId,
        isPurchased: true,
        badge: {
          challenge: {
            year,
          },
        },
      },
    });

    const isEligible = purchasedBadges === 12;

    await prisma.raffleEntry.upsert({
      where: {
        teenId_year: {
          teenId,
          year,
        },
      },
      update: {
        isEligible,
      },
      create: {
        teenId,
        year,
        isEligible,
      },
    });

    return { purchasedBadges, isEligible };
  } catch (error) {
    console.error('Update raffle eligibility helper error:', error);
    throw error;
  }
};
