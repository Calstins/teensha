// controllers/teenController.js
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getProfile = async (req, res) => {
  try {
    const teen = await prisma.teen.findUnique({
      where: { id: req.teen.id },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        state: true,
        country: true,
        profilePhoto: true,
        optInPublic: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: teen,
    });
  } catch (error) {
    console.error('Get teen profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const allowedUpdates = [
      'name',
      'age',
      'gender',
      'state',
      'country',
      'optInPublic',
    ];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedTeen = await prisma.teen.update({
      where: { id: req.teen.id },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        state: true,
        country: true,
        profilePhoto: true,
        optInPublic: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedTeen,
    });
  } catch (error) {
    console.error('Update teen profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Get current active challenge
    const currentChallenge = await prisma.monthlyChallenge.findFirst({
      where: {
        isPublished: true,
        isActive: true,
        goLiveDate: { lte: currentDate },
        closingDate: { gte: currentDate },
      },
      include: {
        badge: true,
      },
    });

    // Get teen's progress for current challenge
    let currentProgress = null;
    let badgeStatus = 'AVAILABLE';

    if (currentChallenge) {
      currentProgress = await prisma.teenProgress.findUnique({
        where: {
          teenId_challengeId: {
            teenId: req.teen.id,
            challengeId: currentChallenge.id,
          },
        },
      });

      const teenBadge = await prisma.teenBadge.findUnique({
        where: {
          teenId_badgeId: {
            teenId: req.teen.id,
            badgeId: currentChallenge.badge.id,
          },
        },
      });

      badgeStatus = teenBadge?.status || 'AVAILABLE';
    }

    // Get teen's yearly stats
    const yearlyProgress = await prisma.teenProgress.findMany({
      where: {
        teenId: req.teen.id,
        challenge: {
          year: currentYear,
        },
      },
      include: {
        challenge: {
          select: {
            month: true,
            theme: true,
          },
        },
      },
    });

    // Get badges for current year
    const yearlyBadges = await prisma.teenBadge.findMany({
      where: {
        teenId: req.teen.id,
        badge: {
          challenge: {
            year: currentYear,
          },
        },
      },
      include: {
        badge: {
          include: {
            challenge: {
              select: {
                month: true,
                theme: true,
              },
            },
          },
        },
      },
    });

    // Calculate stats
    const completedChallenges = yearlyProgress.filter(
      (p) => p.percentage === 100
    ).length;
    const purchasedBadges = yearlyBadges.filter((b) =>
      ['PURCHASED', 'EARNED'].includes(b.status)
    ).length;
    const earnedBadges = yearlyBadges.filter(
      (b) => b.status === 'EARNED'
    ).length;

    // Check raffle eligibility
    const raffleEntry = await prisma.raffleEntry.findUnique({
      where: {
        teenId_year: {
          teenId: req.teen.id,
          year: currentYear,
        },
      },
    });

    res.json({
      success: true,
      data: {
        currentChallenge: currentChallenge
          ? {
              id: currentChallenge.id,
              theme: currentChallenge.theme,
              progress: currentProgress || {
                tasksTotal: 0,
                tasksCompleted: 0,
                percentage: 0,
              },
              badge: {
                ...currentChallenge.badge,
                status: badgeStatus,
              },
            }
          : null,
        yearlyStats: {
          year: currentYear,
          completedChallenges,
          purchasedBadges,
          earnedBadges,
          totalChallenges: 12,
          isRaffleEligible: raffleEntry?.isEligible || false,
        },
        recentProgress: yearlyProgress
          .sort((a, b) => b.challenge.month - a.challenge.month)
          .slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Get teen dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getTeensList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      optInPublic,
      minAge,
      maxAge,
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (optInPublic !== undefined) {
      where.optInPublic = optInPublic === 'true';
    }

    if (minAge) {
      where.age = { ...where.age, gte: parseInt(minAge) };
    }

    if (maxAge) {
      where.age = { ...where.age, lte: parseInt(maxAge) };
    }

    const teens = await prisma.teen.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        state: true,
        country: true,
        isActive: true,
        optInPublic: true,
        createdAt: true,
        _count: {
          select: {
            submissions: true,
            badges: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.teen.count({ where });

    res.json({
      success: true,
      data: {
        teens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get teens error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getTeenDetails = async (req, res) => {
  try {
    const { teenId } = req.params;

    const teen = await prisma.teen.findUnique({
      where: { id: teenId },
      include: {
        submissions: {
          include: {
            task: {
              include: {
                challenge: {
                  select: {
                    theme: true,
                    year: true,
                    month: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
        badges: {
          include: {
            badge: {
              include: {
                challenge: {
                  select: {
                    theme: true,
                    year: true,
                    month: true,
                  },
                },
              },
            },
          },
        },
        progress: {
          include: {
            challenge: {
              select: {
                theme: true,
                year: true,
                month: true,
              },
            },
          },
        },
        raffleEntries: true,
      },
    });

    if (!teen) {
      return res.status(404).json({
        success: false,
        message: 'Teen not found',
      });
    }

    res.json({
      success: true,
      data: teen,
    });
  } catch (error) {
    console.error('Get teen details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
