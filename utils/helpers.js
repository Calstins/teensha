// utils/helpers.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    return { totalTasks, completedSubmissions, percentage, isCompleted };
  } catch (error) {
    console.error('Update progress helper error:', error);
    throw error;
  }
};

// Update raffle eligibility helper
export const updateRaffleEligibilityHelper = async (teenId, year) => {
  try {
    const purchasedBadges = await prisma.teenBadge.count({
      where: {
        teenId,
        status: {
          in: ['PURCHASED', 'EARNED'],
        },
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
