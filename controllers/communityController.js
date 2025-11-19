// controllers/communityController.js
import prisma from '../lib/prisma.js';

/**
 * Get recent community activity feed with FOMO-inducing updates
 */
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const currentDate = new Date();

    // Get current active challenge
    const currentChallenge = await prisma.monthlyChallenge.findFirst({
      where: {
        isPublished: true,
        isActive: true,
        goLiveDate: { lte: currentDate },
        closingDate: { gte: currentDate },
      },
    });

    if (!currentChallenge) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const activities = [];

    // 1. Get recent challenge completions (last 7 days)
    const recentCompletions = await prisma.teenProgress.findMany({
      where: {
        challengeId: currentChallenge.id,
        percentage: 100,
        completedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        teen: {
          select: {
            name: true,
            profilePhoto: true,
            optInPublic: true,
            isActive: true,
          },
        },
        challenge: {
          select: {
            theme: true,
            month: true,
            year: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 10,
    });

    for (const completion of recentCompletions) {
      if (completion.teen.optInPublic && completion.teen.isActive) {
        activities.push({
          id: `completion-${completion.id}`,
          type: 'CHALLENGE_COMPLETED',
          teen: {
            name: completion.teen.name,
            profilePhoto: completion.teen.profilePhoto,
          },
          challenge: {
            theme: completion.challenge.theme,
            month: completion.challenge.month,
            year: completion.challenge.year,
          },
          timestamp: completion.completedAt,
          message: `completed the ${completion.challenge.theme} challenge! 🎉`,
        });
      }
    }

    // 2. Get recent badge earnings (last 7 days)
    const recentBadges = await prisma.teenBadge.findMany({
      where: {
        status: 'EARNED',
        earnedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        badge: {
          challenge: {
            id: currentChallenge.id,
          },
        },
      },
      include: {
        teen: {
          select: {
            name: true,
            profilePhoto: true,
            optInPublic: true,
            isActive: true,
          },
        },
        badge: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        earnedAt: 'desc',
      },
      take: 10,
    });

    for (const teenBadge of recentBadges) {
      if (teenBadge.teen.optInPublic && teenBadge.teen.isActive) {
        activities.push({
          id: `badge-${teenBadge.id}`,
          type: 'BADGE_EARNED',
          teen: {
            name: teenBadge.teen.name,
            profilePhoto: teenBadge.teen.profilePhoto,
          },
          badge: {
            name: teenBadge.badge.name,
            imageUrl: teenBadge.badge.imageUrl,
          },
          timestamp: teenBadge.earnedAt,
          message: `earned the ${teenBadge.badge.name} badge! 🏆`,
        });
      }
    }

    // 3. Get recent task submissions (last 24 hours)
    const recentSubmissions = await prisma.submission.findMany({
      where: {
        status: 'APPROVED',
        submittedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        task: {
          challengeId: currentChallenge.id,
        },
      },
      include: {
        teen: {
          select: {
            name: true,
            profilePhoto: true,
            optInPublic: true,
            isActive: true,
          },
        },
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 15,
    });

    for (const submission of recentSubmissions) {
      if (submission.teen.optInPublic && submission.teen.isActive) {
        activities.push({
          id: `submission-${submission.id}`,
          type: 'TASK_SUBMITTED',
          teen: {
            name: submission.teen.name,
            profilePhoto: submission.teen.profilePhoto,
          },
          task: {
            title: submission.task.title,
          },
          timestamp: submission.submittedAt,
          message: `submitted "${submission.task.title}" ✅`,
        });
      }
    }

    // 4. Get high performers (90%+ completion in last 3 days)
    const highPerformers = await prisma.teenProgress.findMany({
      where: {
        challengeId: currentChallenge.id,
        percentage: { gte: 90 },
        lastUpdated: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        teen: {
          select: {
            name: true,
            profilePhoto: true,
            optInPublic: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        percentage: 'desc',
      },
      take: 5,
    });

    for (const performer of highPerformers) {
      if (performer.teen.optInPublic && performer.teen.isActive) {
        activities.push({
          id: `performer-${performer.id}`,
          type: 'HIGH_PERFORMER',
          teen: {
            name: performer.teen.name,
            profilePhoto: performer.teen.profilePhoto,
          },
          timestamp: performer.lastUpdated,
          message: `is crushing it with ${Math.round(
            performer.percentage
          )}% completion! 🔥`,
        });
      }
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedActivities,
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get top performers for a given period
 */
export const getTopPerformers = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : undefined;

    let challengeWhere = {
      year: currentYear,
      isPublished: true,
    };

    if (currentMonth) {
      challengeWhere.month = currentMonth;
    }

    // Get challenges for the period
    const challenges = await prisma.monthlyChallenge.findMany({
      where: challengeWhere,
      select: { id: true },
    });

    const challengeIds = challenges.map((c) => c.id);

    if (challengeIds.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get all progress for these challenges
    const allProgress = await prisma.teenProgress.findMany({
      where: {
        challengeId: { in: challengeIds },
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

    // Filter for public, active teens
    const publicProgress = allProgress.filter(
      (p) => p.teen.optInPublic && p.teen.isActive
    );

    // Group by teen and calculate stats
    const teenStats = {};
    for (const progress of publicProgress) {
      const teenId = progress.teen.id;
      if (!teenStats[teenId]) {
        teenStats[teenId] = {
          teen: {
            name: progress.teen.name,
            profilePhoto: progress.teen.profilePhoto,
          },
          completedChallenges: 0,
          totalProgress: 0,
          count: 0,
        };
      }

      if (progress.percentage === 100) {
        teenStats[teenId].completedChallenges++;
      }
      teenStats[teenId].totalProgress += progress.percentage;
      teenStats[teenId].count++;
    }

    // Get badge counts for these teens
    const teenIds = Object.keys(teenStats);
    const badgeCounts = await prisma.teenBadge.groupBy({
      by: ['teenId'],
      where: {
        teenId: { in: teenIds },
        status: 'EARNED',
        badge: {
          challenge: {
            year: currentYear,
            ...(currentMonth && { month: currentMonth }),
          },
        },
      },
      _count: true,
    });

    const badgeCountMap = {};
    for (const bc of badgeCounts) {
      badgeCountMap[bc.teenId] = bc._count;
    }

    // Calculate final stats
    const performers = Object.entries(teenStats).map(([teenId, stats]) => ({
      teen: stats.teen,
      completedChallenges: stats.completedChallenges,
      earnedBadges: badgeCountMap[teenId] || 0,
      averageProgress:
        Math.round((stats.totalProgress / stats.count) * 100) / 100,
    }));

    // Sort by completed challenges, then badges, then average progress
    performers.sort((a, b) => {
      if (b.completedChallenges !== a.completedChallenges) {
        return b.completedChallenges - a.completedChallenges;
      }
      if (b.earnedBadges !== a.earnedBadges) {
        return b.earnedBadges - a.earnedBadges;
      }
      return b.averageProgress - a.averageProgress;
    });

    // Return top 10
    const topPerformers = performers.slice(0, 10);

    res.json({
      success: true,
      data: topPerformers,
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
