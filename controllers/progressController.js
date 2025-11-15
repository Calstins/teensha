// controllers/progressController.js
import prisma from '../lib/prisma.js';

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

    let challengeWhere = {
      year: currentYear,
      isPublished: true, // ✅ Only show published challenges
    };

    if (currentMonth) {
      challengeWhere.month = currentMonth;
    }

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
      orderBy: { month: 'asc' },
    });

    const analytics = challenges.map((challenge) => {
      const totalParticipants = challenge.progress.length;
      const completedCount = challenge.progress.filter(
        (p) => p.percentage === 100
      ).length;

      const averageProgress =
        totalParticipants > 0
          ? challenge.progress.reduce((sum, p) => sum + p.percentage, 0) /
            totalParticipants
          : 0;

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

      return {
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
              ? Math.round((completedCount / totalParticipants) * 100 * 100) /
                100
              : 0,
          averageProgress: Math.round(averageProgress * 100) / 100,
          progressDistribution,
        },
      };
    });

    console.log('✅ Analytics data:', analytics.length, 'challenges');

    res.json({
      success: true,
      data: analytics, // ✅ Always returns array
    });
  } catch (error) {
    console.error('❌ Get progress analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
