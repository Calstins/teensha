// controllers/progressController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getChallengeProgress = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const progress = await prisma.teenProgress.findUnique({
      where: {
        teenId_challengeId: {
          teenId: req.teen.id,
          challengeId,
        },
      },
      include: {
        challenge: {
          select: {
            theme: true,
            year: true,
            month: true,
          },
        },
      },
    });

    if (!progress) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Get challenge progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getYearlyProgress = async (req, res) => {
  try {
    const { year } = req.params;

    const yearlyProgress = await prisma.teenProgress.findMany({
      where: {
        teenId: req.teen.id,
        challenge: {
          year: parseInt(year),
        },
      },
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
            month: true,
            goLiveDate: true,
            closingDate: true,
          },
        },
      },
      orderBy: {
        challenge: {
          month: 'asc',
        },
      },
    });

    // Calculate yearly stats
    const completedChallenges = yearlyProgress.filter(
      (p) => p.percentage === 100
    ).length;
    const totalPercentage = yearlyProgress.reduce(
      (sum, p) => sum + p.percentage,
      0
    );
    const averagePercentage =
      yearlyProgress.length > 0 ? totalPercentage / yearlyProgress.length : 0;

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        progress: yearlyProgress,
        stats: {
          completedChallenges,
          totalChallenges: yearlyProgress.length,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Get yearly progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getProgressAnalytics = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : undefined;

    let challengeWhere = { year: currentYear };
    if (currentMonth) {
      challengeWhere.month = currentMonth;
    }

    // Get challenges for the specified period
    const challenges = await prisma.monthlyChallenge.findMany({
      where: challengeWhere,
      include: {
        progress: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    const analytics = [];

    for (const challenge of challenges) {
      const totalParticipants = challenge.progress.length;
      const completedCount = challenge.progress.filter(
        (p) => p.percentage === 100
      ).length;
      const averageProgress =
        totalParticipants > 0
          ? challenge.progress.reduce((sum, p) => sum + p.percentage, 0) /
            totalParticipants
          : 0;

      // Progress distribution
      const progressDistribution = {
        '0-25': challenge.progress.filter(
          (p) => p.percentage >= 0 && p.percentage < 25
        ).length,
        '25-50': challenge.progress.filter(
          (p) => p.percentage >= 25 && p.percentage < 50
        ).length,
        '50-75': challenge.progress.filter(
          (p) => p.percentage >= 50 && p.percentage < 75
        ).length,
        '75-99': challenge.progress.filter(
          (p) => p.percentage >= 75 && p.percentage < 100
        ).length,
        100: completedCount,
      };

      analytics.push({
        challenge: {
          id: challenge.id,
          theme: challenge.theme,
          month: challenge.month,
          year: challenge.year,
          totalTasks: challenge._count.tasks,
        },
        stats: {
          totalParticipants,
          completedCount,
          completionRate:
            totalParticipants > 0
              ? (completedCount / totalParticipants) * 100
              : 0,
          averageProgress: Math.round(averageProgress * 100) / 100,
          progressDistribution,
        },
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Get progress analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
