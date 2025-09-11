import { PrismaClient } from '@prisma/client';
import { getCurrentChallengeUtils } from '../utils/helpers.js';

const prisma = new PrismaClient();

export const getCurrentChallenge = async (req, res) => {
  try {
    const challenge = await getCurrentChallengeUtils();

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
    const teenBadge = await prisma.teenBadge.findUnique({
      where: {
        teenId_badgeId: {
          teenId: req.teen.id,
          badgeId: challenge.badge.id,
        },
      },
    });

    // Get submissions for this challenge
    const submissions = await prisma.submission.findMany({
      where: {
        teenId: req.teen.id,
        task: {
          challengeId: challenge.id,
        },
      },
      include: {
        task: true,
      },
    });

    // Group tasks by tab
    const tasksByTab = challenge.tasks.reduce((acc, task) => {
      if (!acc[task.tabName]) {
        acc[task.tabName] = [];
      }

      const submission = submissions.find((s) => s.taskId === task.id);
      acc[task.tabName].push({
        ...task,
        submission: submission
          ? {
              id: submission.id,
              status: submission.status,
              submittedAt: submission.submittedAt,
            }
          : null,
      });

      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        challenge: {
          id: challenge.id,
          theme: challenge.theme,
          instructions: challenge.instructions,
          goLiveDate: challenge.goLiveDate,
          closingDate: challenge.closingDate,
        },
        tasks: tasksByTab,
        badge: {
          ...challenge.badge,
          status: teenBadge?.status || 'AVAILABLE',
        },
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
    });
  }
};

export const getCommunityStats = async (req, res) => {
  try {
    const currentDate = new Date();

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

    // Get total participants
    const totalParticipants = await prisma.teenProgress.count({
      where: {
        challengeId: challenge.id,
      },
    });

    // Get completion stats
    const completionStats = await prisma.teenProgress.groupBy({
      by: ['tasksCompleted'],
      where: {
        challengeId: challenge.id,
      },
      _count: true,
    });

    // Get teen's ranking
    const teenProgress = await prisma.teenProgress.findUnique({
      where: {
        teenId_challengeId: {
          teenId: req.teen.id,
          challengeId: challenge.id,
        },
      },
    });

    let teenRanking = null;
    if (teenProgress) {
      const betterCount = await prisma.teenProgress.count({
        where: {
          challengeId: challenge.id,
          percentage: {
            gt: teenProgress.percentage,
          },
        },
      });

      const percentile = Math.round(
        (1 - betterCount / totalParticipants) * 100
      );
      teenRanking = {
        percentage: teenProgress.percentage,
        ahead_of_percentage: 100 - percentile,
      };
    }

    // Get popular tasks (most submissions)
    const popularTasks = await prisma.submission.groupBy({
      by: ['taskId'],
      where: {
        task: {
          challengeId: challenge.id,
        },
      },
      _count: true,
      orderBy: {
        _count: 'desc',
      },
      take: 3,
    });

    const taskDetails = await prisma.task.findMany({
      where: {
        id: {
          in: popularTasks.map((pt) => pt.taskId),
        },
      },
      select: {
        id: true,
        title: true,
        tabName: true,
      },
    });

    const popularTasksWithDetails = popularTasks.map((pt) => ({
      ...taskDetails.find((td) => td.id === pt.taskId),
      submissions: pt._count,
    }));

    res.json({
      success: true,
      data: {
        totalParticipants,
        completionStats: completionStats.reduce((acc, stat) => {
          acc[`${stat.tasksCompleted}_tasks`] = stat._count;
          return acc;
        }, {}),
        teenRanking,
        popularTasks: popularTasksWithDetails,
      },
    });
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const currentDate = new Date();

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

    // Get top performers who opted in for public recognition
    const topTeens = await prisma.teenProgress.findMany({
      where: {
        challengeId: challenge.id,
        teen: {
          optInPublic: true,
          isActive: true,
        },
      },
      include: {
        teen: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: [
        { percentage: 'desc' },
        { lastUpdated: 'asc' }, // Earlier completion wins ties
      ],
      take: 20,
    });

    const leaderboard = topTeens.map((progress, index) => ({
      rank: index + 1,
      teen: {
        name: progress.teen.name,
        profilePhoto: progress.teen.profilePhoto,
      },
      percentage: progress.percentage,
      tasksCompleted: progress.tasksCompleted,
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
    });
  }
};
