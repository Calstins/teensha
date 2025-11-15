//teensha/controllers/adminController.js
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { validationResult } from 'express-validator';
import { sendChallengeNotification } from '../utils/notifications.js';
import { handleValidationErrors } from '../middleware/validation.js';

export const createStaff = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password, name, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getAllStaff = async (req, res) => {
  try {
    console.log('📋 Getting all staff - Query params:', req.query);

    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));

    const staff = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdChallenges: true,
            createdTasks: true,
            reviewedSubmissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.user.count({ where });

    console.log('✅ Found staff:', staff.length, 'Total:', total);
    console.log('📝 Staff data:', JSON.stringify(staff, null, 2));

    res.json({
      success: true,
      data: {
        staff,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('❌ Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message, // Add this for debugging
    });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const allowedUpdates = ['name', 'role', 'isActive'];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    // Don't allow admin to deactivate themselves
    if (userId === req.user.id && updates.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Staff account updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow admin to delete themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: 'Staff account deleted successfully',
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const createChallenge = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      year,
      month,
      theme,
      instructions,
      goLiveDate,
      closingDate,
      badgeData, // ✅ Changed from 'badge'
    } = req.body;

    // Check if challenge already exists
    const existingChallenge = await prisma.monthlyChallenge.findFirst({
      where: {
        year: parseInt(year),
        month: parseInt(month),
      },
    });

    if (existingChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Challenge already exists for this month/year',
      });
    }

    // Validate dates
    const goLive = new Date(goLiveDate);
    const closing = new Date(closingDate);

    if (goLive >= closing) {
      return res.status(400).json({
        success: false,
        message: 'Go-live date must be before closing date',
      });
    }

    // Create challenge with badge
    const challenge = await prisma.monthlyChallenge.create({
      data: {
        year: parseInt(year),
        month: parseInt(month),
        theme,
        instructions,
        goLiveDate: goLive,
        closingDate: closing,
        isPublished: false, // Always start as draft
        createdById: req.user.id,
        badge: badgeData
          ? {
              create: {
                name: badgeData.name,
                description: badgeData.description,
                imageUrl: badgeData.imageUrl,
                price: parseFloat(badgeData.price),
              },
            }
          : undefined,
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
      message: 'Challenge created successfully',
      data: challenge,
    });
  } catch (error) {
    console.error('❌ Create challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const updateChallenge = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { challengeId } = req.params;
    const { theme, instructions, goLiveDate, closingDate, badge } = req.body;

    // Check if challenge exists
    const existingChallenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: { badge: true },
    });

    if (!existingChallenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Validate dates if provided
    if (goLiveDate && closingDate) {
      const goLive = new Date(goLiveDate);
      const closing = new Date(closingDate);

      if (goLive >= closing) {
        return res.status(400).json({
          success: false,
          message: 'Go-live date must be before closing date',
        });
      }
    }

    // Prepare update data
    const updateData = {};

    if (theme) updateData.theme = theme;
    if (instructions) updateData.instructions = instructions;
    if (goLiveDate) updateData.goLiveDate = new Date(goLiveDate);
    if (closingDate) updateData.closingDate = new Date(closingDate);

    // Update badge if provided
    if (badge && existingChallenge.badge) {
      await prisma.badge.update({
        where: { id: existingChallenge.badge.id },
        data: {
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          price: parseFloat(badge.price),
        },
      });
    }

    // Update challenge
    const updatedChallenge = await prisma.monthlyChallenge.update({
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
            progress: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Challenge updated successfully',
      data: updatedChallenge,
    });
  } catch (error) {
    console.error('❌ Update challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const publishChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    if (challenge.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Challenge is already published',
      });
    }

    const updatedChallenge = await prisma.monthlyChallenge.update({
      where: { id: challengeId },
      data: { isPublished: true },
    });

    // Send launch notification to all active teens
    const activeTeens = await prisma.teen.findMany({
      where: { isActive: true },
      select: { email: true },
    });

    if (activeTeens.length > 0) {
      await sendChallengeNotification(activeTeens, updatedChallenge, 'launch');
    }

    res.json({
      success: true,
      message: 'Challenge published successfully',
      data: updatedChallenge,
    });
  } catch (error) {
    console.error('Publish challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getAllChallenges = async (req, res) => {
  try {
    console.log('📋 Getting all challenges - Query params:', req.query);

    const {
      page = 1,
      limit = 50,
      year,
      month,
      search,
      isPublished,
      isActive,
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (year) {
      where.year = parseInt(year);
    }

    if (month) {
      where.month = parseInt(month);
    }

    if (search) {
      where.OR = [
        { theme: { contains: search, mode: 'insensitive' } },
        { instructions: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));

    const [challenges, total] = await Promise.all([
      prisma.monthlyChallenge.findMany({
        where,
        include: {
          badge: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.monthlyChallenge.count({ where }),
    ]);

    console.log('✅ Found challenges:', challenges.length, 'Total:', total);

    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('❌ Get challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
