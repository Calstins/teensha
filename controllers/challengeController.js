// controllers/challengeController.js
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { sendChallengeNotification } from '../utils/notifications.js';
import { sendNotificationToAllTeensMobile } from './notificationController.js';

export const createChallenge = async (req, res) => {
  try {
    handleValidationErrors(req, res, () => {});

    const {
      year,
      month,
      theme,
      instructions,
      goLiveDate,
      closingDate,
      badgeData,
    } = req.body;

    // Check if challenge already exists for this year/month
    const existing = await prisma.monthlyChallenge.findFirst({
      where: {
        year: parseInt(year),
        month: parseInt(month),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A challenge already exists for ${new Date(
          year,
          month - 1
        ).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })}. Only one challenge is allowed per month.`,
      });
    }

    // Validate badge data is provided (required for each challenge)
    if (
      !badgeData ||
      !badgeData.name ||
      !badgeData.imageUrl ||
      !badgeData.price
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Badge information is required when creating a challenge. Each challenge must have exactly one badge.',
      });
    }

    // Create challenge with badge in a transaction
    const challenge = await prisma.monthlyChallenge.create({
      data: {
        year: parseInt(year),
        month: parseInt(month),
        theme,
        instructions,
        goLiveDate: new Date(goLiveDate),
        closingDate: new Date(closingDate),
        createdById: req.user.id,
        badge: {
          create: {
            name: badgeData.name,
            description: badgeData.description,
            imageUrl: badgeData.imageUrl,
            price: parseFloat(badgeData.price),
          },
        },
      },
      include: {
        badge: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Challenge and badge created successfully',
      data: challenge,
    });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getChallenges = async (req, res) => {
  try {
    const { year, month, search, limit = 50 } = req.query;

    const where = {};

    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    // MongoDB text search
    if (search) {
      where.OR = [
        { theme: { contains: search, mode: 'insensitive' } },
        { instructions: { contains: search, mode: 'insensitive' } },
      ];
    }

    const challenges = await prisma.monthlyChallenge.findMany({
      where,
      include: {
        badge: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            progress: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        challenges,
        total: challenges.length,
      },
    });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getChallengeById = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: {
        badge: true,
        tasks: {
          orderBy: [{ tabName: 'asc' }, { createdAt: 'asc' }],
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            progress: true,
          },
        },
      },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error('Get challenge by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const publishChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: {
        badge: true,
      },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Check if challenge has a badge
    if (!challenge.badge) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot publish challenge without a badge. Please create a badge first.',
      });
    }

    const updated = await prisma.monthlyChallenge.update({
      where: { id: challengeId },
      data: {
        isPublished: true,
        isActive: true,
      },
      include: {
        badge: true,
      },
    });

    // Send notification to all active teens
    try {
      await sendChallengeNotification(updated);
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.json({
      success: true,
      message: 'Challenge published successfully and notifications sent',
      data: updated,
    });

    await sendNotificationToAllTeensMobile(
      '🎯 New Challenge Available!',
      `${updated.theme} is now live! Start earning your badge today.`,
      {
        type: 'CHALLENGE_PUBLISHED',
        challengeId: updated.id,
      }
    );

    res.json({
      success: true,
      message: 'Challenge published and notifications sent',
      data: updated,
    });
  } catch (error) {
    console.error('Publish challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: {
        _count: {
          select: {
            progress: true,
          },
        },
      },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Prevent deletion if challenge has participants
    if (challenge._count.progress > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete challenge with ${challenge._count.progress} participant(s). This would affect teen progress data.`,
      });
    }

    // Delete challenge (cascade will handle related records)
    await prisma.monthlyChallenge.delete({
      where: { id: challengeId },
    });

    res.json({
      success: true,
      message: 'Challenge deleted successfully',
    });
  } catch (error) {
    console.error('Delete challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ============================================
// TEEN-FACING ENDPOINTS
// ============================================

export const getCurrentChallenge = async (req, res) => {
  try {
    const currentDate = new Date();

    // Find the current active challenge
    const challenge = await prisma.monthlyChallenge.findFirst({
      where: {
        isPublished: true,
        isActive: true,
        goLiveDate: { lte: currentDate },
        closingDate: { gte: currentDate },
      },
      include: {
        badge: true,
        tasks: {
          orderBy: [{ tabName: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!challenge) {
      return res.json({
        success: true,
        message: 'No active challenge found',
        data: null,
      });
    }

    // Get teen's progress for this challenge
    const progress = await prisma.teenProgress.findUnique({
      where: {
        teenId_challengeId: {
          teenId: req.teen.id,
          challengeId: challenge.id,
        },
      },
    });

    // Get teen's badge status
    let teenBadge = null;
    if (challenge.badge) {
      teenBadge = await prisma.teenBadge.findUnique({
        where: {
          teenId_badgeId: {
            teenId: req.teen.id,
            badgeId: challenge.badge.id,
          },
        },
      });
    }

    // Get submissions for this challenge
    const submissions = await prisma.submission.findMany({
      where: {
        teenId: req.teen.id,
        task: {
          challengeId: challenge.id,
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            tabName: true,
            taskType: true,
          },
        },
      },
    });

    // Group tasks by tab with submission status
    const tasksByTab = {};
    for (const task of challenge.tasks) {
      if (!tasksByTab[task.tabName]) {
        tasksByTab[task.tabName] = [];
      }

      const submission = submissions.find((s) => s.task.id === task.id);
      tasksByTab[task.tabName].push({
        ...task,
        submission: submission
          ? {
              id: submission.id,
              status: submission.status,
              submittedAt: submission.submittedAt,
              score: submission.score,
            }
          : null,
      });
    }

    res.json({
      success: true,
      data: {
        challenge: {
          id: challenge.id,
          theme: challenge.theme,
          instructions: challenge.instructions,
          goLiveDate: challenge.goLiveDate,
          closingDate: challenge.closingDate,
          year: challenge.year,
          month: challenge.month,
        },
        tasks: tasksByTab,
        badge: challenge.badge
          ? {
              ...challenge.badge,
              status: teenBadge?.status || 'AVAILABLE',
              purchasedAt: teenBadge?.purchasedAt || null,
              earnedAt: teenBadge?.earnedAt || null,
            }
          : null,
        progress: progress || {
          tasksTotal: challenge.tasks.length,
          tasksCompleted: 0,
          percentage: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get current challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getCommunityStats = async (req, res) => {
  try {
    const currentDate = new Date();

    // Get current active challenge
    const challenge = await prisma.monthlyChallenge.findFirst({
      where: {
        isPublished: true,
        isActive: true,
        goLiveDate: { lte: currentDate },
        closingDate: { gte: currentDate },
      },
    });

    if (!challenge) {
      return res.json({
        success: true,
        data: {
          totalParticipants: 0,
          completionStats: {},
          teenRanking: null,
          popularTasks: [],
        },
      });
    }

    // Get all progress for this challenge
    const allProgress = await prisma.teenProgress.findMany({
      where: {
        challengeId: challenge.id,
      },
    });

    const totalParticipants = allProgress.length;

    // Group by tasks completed
    const completionStats = {};
    for (const progress of allProgress) {
      const key = `${progress.tasksCompleted}_tasks`;
      completionStats[key] = (completionStats[key] || 0) + 1;
    }

    // Get teen's ranking
    let teenRanking = null;
    const teenProgress = allProgress.find((p) => p.teenId === req.teen.id);

    if (teenProgress && totalParticipants > 0) {
      const betterCount = allProgress.filter(
        (p) => p.percentage > teenProgress.percentage
      ).length;

      const percentile = Math.round(
        (1 - betterCount / totalParticipants) * 100
      );
      teenRanking = {
        percentage: teenProgress.percentage,
        ahead_of_percentage: 100 - percentile,
        rank: betterCount + 1,
        total: totalParticipants,
      };
    }

    // Get popular tasks (most submissions)
    const allSubmissions = await prisma.submission.findMany({
      where: {
        task: {
          challengeId: challenge.id,
        },
      },
      select: {
        taskId: true,
      },
    });

    // Count submissions per task
    const taskCounts = {};
    for (const sub of allSubmissions) {
      taskCounts[sub.taskId] = (taskCounts[sub.taskId] || 0) + 1;
    }

    // Get top 3 tasks
    const topTaskIds = Object.entries(taskCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([taskId]) => taskId);

    const taskDetails = await prisma.task.findMany({
      where: {
        id: { in: topTaskIds },
      },
      select: {
        id: true,
        title: true,
        tabName: true,
        taskType: true,
      },
    });

    const popularTasks = taskDetails.map((task) => ({
      ...task,
      submissions: taskCounts[task.id] || 0,
    }));

    res.json({
      success: true,
      data: {
        totalParticipants,
        completionStats,
        teenRanking,
        popularTasks,
        challenge: {
          id: challenge.id,
          theme: challenge.theme,
          month: challenge.month,
          year: challenge.year,
        },
      },
    });
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const currentDate = new Date();

    // Get current active challenge
    const challenge = await prisma.monthlyChallenge.findFirst({
      where: {
        isPublished: true,
        isActive: true,
        goLiveDate: { lte: currentDate },
        closingDate: { gte: currentDate },
      },
    });

    if (!challenge) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get all progress for teens who opted in for public recognition
    const allProgress = await prisma.teenProgress.findMany({
      where: {
        challengeId: challenge.id,
      },
      include: {
        teen: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            optInPublic: true,
            isActive: true,
          },
        },
      },
    });

    // Filter for opted-in and active teens only
    const publicProgress = allProgress.filter(
      (p) => p.teen.optInPublic && p.teen.isActive
    );

    // Sort by percentage (desc), then by lastUpdated (asc) for ties
    publicProgress.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return (
        new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      );
    });

    // Take top 20
    const topTeens = publicProgress.slice(0, 20);

    const leaderboard = topTeens.map((progress, index) => ({
      rank: index + 1,
      teen: {
        name: progress.teen.name,
        profilePhoto: progress.teen.profilePhoto,
      },
      percentage: progress.percentage,
      tasksCompleted: progress.tasksCompleted,
      tasksTotal: progress.tasksTotal,
      completedAt: progress.completedAt,
    }));

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const updateChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const {
      theme,
      instructions,
      goLiveDate,
      closingDate,
      isPublished,
      isActive,
      badgeData,
    } = req.body;

    // Check if challenge exists
    const existing = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: { badge: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Prepare update data
    const updateData = {
      ...(theme && { theme }),
      ...(instructions && { instructions }),
      ...(goLiveDate && { goLiveDate: new Date(goLiveDate) }),
      ...(closingDate && { closingDate: new Date(closingDate) }),
      ...(typeof isPublished === 'boolean' && { isPublished }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    // Handle badge update/create
    if (badgeData) {
      if (existing.badge) {
        // Update existing badge
        updateData.badge = {
          update: {
            name: badgeData.name,
            description: badgeData.description,
            imageUrl: badgeData.imageUrl,
            price: parseFloat(badgeData.price),
          },
        };
      } else {
        // Create new badge if none exists
        updateData.badge = {
          create: {
            name: badgeData.name,
            description: badgeData.description,
            imageUrl: badgeData.imageUrl,
            price: parseFloat(badgeData.price),
          },
        };
      }
    }

    const challenge = await prisma.monthlyChallenge.update({
      where: { id: challengeId },
      data: updateData,
      include: {
        badge: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Challenge updated successfully',
      data: challenge,
    });
  } catch (error) {
    console.error('Update challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const toggleChallengeStatus = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { field } = req.body; // 'isPublished' or 'isActive'

    if (!['isPublished', 'isActive'].includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field. Use isPublished or isActive',
      });
    }

    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: { badge: true },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // If trying to publish, ensure badge exists
    if (field === 'isPublished' && !challenge.isPublished && !challenge.badge) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish challenge without a badge',
      });
    }

    const updated = await prisma.monthlyChallenge.update({
      where: { id: challengeId },
      data: {
        [field]: !challenge[field],
      },
    });

    res.json({
      success: true,
      message: `Challenge ${field} toggled successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('Toggle challenge status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Add this function (teen-facing version of getChallengeById)
export const getChallengeByIdForTeen = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: {
        badge: true,
        tasks: {
          orderBy: [{ tabName: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Check if challenge is published
    if (!challenge.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Challenge not available',
      });
    }

    // Get teen's progress for this challenge
    const progress = await prisma.teenProgress.findUnique({
      where: {
        teenId_challengeId: {
          teenId: req.teen.id,
          challengeId: challenge.id,
        },
      },
    });

    // Get teen's badge status
    let teenBadge = null;
    if (challenge.badge) {
      teenBadge = await prisma.teenBadge.findUnique({
        where: {
          teenId_badgeId: {
            teenId: req.teen.id,
            badgeId: challenge.badge.id,
          },
        },
      });
    }

    // Get submissions for this challenge
    const submissions = await prisma.submission.findMany({
      where: {
        teenId: req.teen.id,
        task: {
          challengeId: challenge.id,
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            tabName: true,
            taskType: true,
          },
        },
      },
    });

    // Group tasks by tab with submission status
    const tasksByTab = {};
    for (const task of challenge.tasks) {
      if (!tasksByTab[task.tabName]) {
        tasksByTab[task.tabName] = [];
      }

      const submission = submissions.find((s) => s.task.id === task.id);
      tasksByTab[task.tabName].push({
        ...task,
        submission: submission
          ? {
              id: submission.id,
              status: submission.status,
              submittedAt: submission.submittedAt,
              score: submission.score,
            }
          : null,
      });
    }

    res.json({
      success: true,
      data: {
        challenge: {
          id: challenge.id,
          theme: challenge.theme,
          instructions: challenge.instructions,
          goLiveDate: challenge.goLiveDate,
          closingDate: challenge.closingDate,
          year: challenge.year,
          month: challenge.month,
        },
        tasks: tasksByTab,
        badge: challenge.badge
          ? {
              ...challenge.badge,
              status: teenBadge?.status || 'AVAILABLE',
              purchasedAt: teenBadge?.purchasedAt || null,
              earnedAt: teenBadge?.earnedAt || null,
            }
          : null,
        progress: progress || {
          tasksTotal: challenge.tasks.length,
          tasksCompleted: 0,
          percentage: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get challenge by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
