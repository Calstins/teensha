// controllers/teenController.js
import prisma from '../lib/prisma.js';

export const getAllTeens = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, state, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // State filter
    if (state) {
      where.state = state;
    }

    // Active status filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [teens, total] = await Promise.all([
      prisma.teen.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          gender: true,
          state: true,
          country: true,
          profilePhoto: true,
          isActive: true,
          optInPublic: true,
          createdAt: true,
          _count: {
            select: {
              submissions: true,
              badges: true,
              progress: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.teen.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        teens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get all teens error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getTeenById = async (req, res) => {
  try {
    const { teenId } = req.params;

    const teen = await prisma.teen.findUnique({
      where: { id: teenId },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        gender: true,
        state: true,
        country: true,
        profilePhoto: true,
        parentEmail: true,
        isActive: true,
        optInPublic: true,
        createdAt: true,
        _count: {
          select: {
            submissions: true,
            badges: true,
            progress: true,
          },
        },
      },
    });

    if (!teen) {
      return res.status(404).json({
        success: false,
        message: 'Teen not found',
      });
    }

    // Get recent activity
    const recentSubmissions = await prisma.submission.findMany({
      where: { teenId },
      include: {
        task: {
          select: {
            title: true,
            taskType: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 5,
    });

    // Get badges
    const badges = await prisma.teenBadge.findMany({
      where: { teenId },
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
    });

    // Get progress
    const progress = await prisma.teenProgress.findMany({
      where: { teenId },
      include: {
        challenge: {
          select: {
            theme: true,
            year: true,
            month: true,
          },
        },
      },
      orderBy: {
        lastUpdated: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        ...teen,
        recentSubmissions,
        badges,
        progress,
      },
    });
  } catch (error) {
    console.error('Get teen by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateTeen = async (req, res) => {
  try {
    const { teenId } = req.params;
    const { isActive, optInPublic } = req.body;

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (optInPublic !== undefined) updateData.optInPublic = optInPublic;

    const teen = await prisma.teen.update({
      where: { id: teenId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        optInPublic: true,
      },
    });

    res.json({
      success: true,
      message: 'Teen updated successfully',
      data: teen,
    });
  } catch (error) {
    console.error('Update teen error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getTeenStats = async (req, res) => {
  try {
    const totalTeens = await prisma.teen.count();
    const activeTeens = await prisma.teen.count({
      where: { isActive: true },
    });

    res.json({
      success: true,
      data: {
        total: totalTeens,
        active: activeTeens,
        inactive: totalTeens - activeTeens,
      },
    });
  } catch (error) {
    console.error('Get teen stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ============================================
// TEEN-FACING ENDPOINTS
// ============================================

export const getProfile = async (req, res) => {
  try {
    const teen = await prisma.teen.findUnique({
      where: { id: req.teen.id },
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        gender: true,
        state: true,
        country: true,
        profilePhoto: true,
        parentEmail: true,
        isActive: true,
        optInPublic: true,
        createdAt: true,
      },
    });

    if (!teen) {
      return res.status(404).json({
        success: false,
        message: 'Teen profile not found',
      });
    }

    res.json({
      success: true,
      data: teen,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      state,
      country,
      profilePhoto,
      parentEmail,
      optInPublic,
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (age) updateData.age = parseInt(age);
    if (gender) updateData.gender = gender;
    if (state) updateData.state = state;
    if (country) updateData.country = country;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    if (parentEmail !== undefined) updateData.parentEmail = parentEmail;
    if (optInPublic !== undefined) updateData.optInPublic = optInPublic;

    const updatedTeen = await prisma.teen.update({
      where: { id: req.teen.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        gender: true,
        state: true,
        country: true,
        profilePhoto: true,
        parentEmail: true,
        optInPublic: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedTeen,
    });
  } catch (error) {
    console.error('Update profile error:', error);
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

    // Get teen's stats
    const [totalSubmissions, totalBadges, yearlyProgress] = await Promise.all([
      prisma.submission.count({
        where: { teenId: req.teen.id },
      }),
      prisma.teenBadge.count({
        where: {
          teenId: req.teen.id,
          status: { in: ['PURCHASED', 'EARNED'] },
        },
      }),
      prisma.teenProgress.findMany({
        where: {
          teenId: req.teen.id,
          challenge: { year: currentYear },
        },
      }),
    ]);

    // Calculate yearly stats
    const completedChallenges = yearlyProgress.filter(
      (p) => p.percentage === 100
    ).length;
    const averageProgress =
      yearlyProgress.length > 0
        ? yearlyProgress.reduce((sum, p) => sum + p.percentage, 0) /
          yearlyProgress.length
        : 0;

    // Get current challenge progress
    let currentProgress = null;
    if (currentChallenge) {
      currentProgress = await prisma.teenProgress.findUnique({
        where: {
          teenId_challengeId: {
            teenId: req.teen.id,
            challengeId: currentChallenge.id,
          },
        },
      });

      // Get current badge status
      if (currentChallenge.badge) {
        const teenBadge = await prisma.teenBadge.findUnique({
          where: {
            teenId_badgeId: {
              teenId: req.teen.id,
              badgeId: currentChallenge.badge.id,
            },
          },
        });
        currentChallenge.badge.teenStatus = teenBadge?.status || 'AVAILABLE';
      }
    }

    // Get recent submissions
    const recentSubmissions = await prisma.submission.findMany({
      where: { teenId: req.teen.id },
      include: {
        task: {
          select: {
            title: true,
            taskType: true,
            challenge: {
              select: {
                theme: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 5,
    });

    // Get upcoming challenges
    const upcomingChallenges = await prisma.monthlyChallenge.findMany({
      where: {
        isPublished: true,
        goLiveDate: { gt: currentDate },
      },
      include: {
        badge: true,
      },
      orderBy: {
        goLiveDate: 'asc',
      },
      take: 3,
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalSubmissions,
          totalBadges,
          completedChallenges,
          averageProgress: Math.round(averageProgress * 100) / 100,
        },
        currentChallenge: currentChallenge
          ? {
              ...currentChallenge,
              progress: currentProgress || {
                tasksTotal: 0,
                tasksCompleted: 0,
                percentage: 0,
              },
            }
          : null,
        recentSubmissions,
        upcomingChallenges,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Aliases for route compatibility
export const getTeensList = getAllTeens;
export const getTeenDetails = getTeenById;
