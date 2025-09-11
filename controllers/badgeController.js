import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { updateRaffleEligibilityHelper } from '../utils/helpers.js';
import { handleValidationErrors } from '../middleware/validation.js';

const prisma = new PrismaClient();

export const purchaseBadge = async (req, res) => {
  try {
    handleValidationErrors(req, res, () => {});

    const { badgeId } = req.body;

    // Get badge details
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        challenge: {
          select: {
            isPublished: true,
            isActive: true,
            goLiveDate: true,
            closingDate: true,
            year: true,
          },
        },
      },
    });

    if (!badge || !badge.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found or inactive',
      });
    }

    // Check if challenge is active
    const currentDate = new Date();
    if (
      !badge.challenge.isPublished ||
      !badge.challenge.isActive ||
      badge.challenge.goLiveDate > currentDate ||
      badge.challenge.closingDate < currentDate
    ) {
      return res.status(403).json({
        success: false,
        message: 'Badge is not available for purchase',
      });
    }

    // Check if teen already has this badge
    const existingBadge = await prisma.teenBadge.findUnique({
      where: {
        teenId_badgeId: {
          teenId: req.teen.id,
          badgeId: badge.id,
        },
      },
    });

    if (existingBadge && existingBadge.status === 'PURCHASED') {
      return res.status(400).json({
        success: false,
        message: 'Badge already purchased',
      });
    }

    // Create or update teen badge record
    const teenBadge = await prisma.teenBadge.upsert({
      where: {
        teenId_badgeId: {
          teenId: req.teen.id,
          badgeId: badge.id,
        },
      },
      update: {
        status: 'PURCHASED',
        purchasedAt: new Date(),
      },
      create: {
        teenId: req.teen.id,
        badgeId: badge.id,
        status: 'PURCHASED',
        purchasedAt: new Date(),
      },
    });

    // Check if teen completed the challenge and update badge status
    const progress = await prisma.teenProgress.findUnique({
      where: {
        teenId_challengeId: {
          teenId: req.teen.id,
          challengeId: badge.challengeId,
        },
      },
    });

    if (progress && progress.percentage === 100) {
      await prisma.teenBadge.update({
        where: { id: teenBadge.id },
        data: {
          status: 'EARNED',
          earnedAt: new Date(),
        },
      });
    }

    // Update raffle eligibility using helper
    await updateRaffleEligibilityHelper(req.teen.id, badge.challenge.year);

    res.json({
      success: true,
      message: 'Badge purchased successfully',
      data: {
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          price: badge.price,
        },
        status: progress?.percentage === 100 ? 'EARNED' : 'PURCHASED',
        purchasedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Purchase badge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getMyBadges = async (req, res) => {
  try {
    const { year } = req.query;

    const whereClause = {
      teenId: req.teen.id,
    };

    if (year) {
      whereClause.badge = {
        challenge: {
          year: parseInt(year),
        },
      };
    }

    const teenBadges = await prisma.teenBadge.findMany({
      where: whereClause,
      include: {
        badge: {
          include: {
            challenge: {
              select: {
                year: true,
                month: true,
                theme: true,
              },
            },
          },
        },
      },
      orderBy: {
        badge: {
          challenge: {
            month: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: teenBadges.map((tb) => ({
        id: tb.id,
        badge: {
          id: tb.badge.id,
          name: tb.badge.name,
          description: tb.badge.description,
          imageUrl: tb.badge.imageUrl,
          price: tb.badge.price,
        },
        challenge: tb.badge.challenge,
        status: tb.status,
        purchasedAt: tb.purchasedAt,
        earnedAt: tb.earnedAt,
      })),
    });
  } catch (error) {
    console.error('Get teen badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getBadgeStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    const whereClause = {};
    if (year || month) {
      whereClause.badge = {
        challenge: {},
      };
      if (year) whereClause.badge.challenge.year = parseInt(year);
      if (month) whereClause.badge.challenge.month = parseInt(month);
    }

    const stats = await prisma.teenBadge.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
    });

    const totalRevenue = await prisma.teenBadge.aggregate({
      where: {
        ...whereClause,
        status: {
          in: ['PURCHASED', 'EARNED'],
        },
      },
      _sum: {
        badge: {
          price: true,
        },
      },
    });

    res.json({
      success: true,
      data: {
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count;
          return acc;
        }, {}),
        totalRevenue: totalRevenue._sum || 0,
      },
    });
  } catch (error) {
    console.error('Get badge stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Helper function (same as in submissions controller)
async function updateRaffleEligibility(teenId, year) {
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
  } catch (error) {
    console.error('Update raffle eligibility error:', error);
  }
}
