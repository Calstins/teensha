import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { sendChallengeNotification } from '../utils/notifications.js';
import { handleValidationErrors } from '../middleware/validation.js';

const prisma = new PrismaClient();

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
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
      badge,
      tasks,
    } = req.body;

    // Check if challenge already exists for this month/year
    const existingChallenge = await prisma.monthlyChallenge.findUnique({
      where: {
        year_month: {
          year: parseInt(year),
          month: parseInt(month),
        },
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

    // Create challenge with badge and tasks in a transaction
    const challenge = await prisma.$transaction(async (tx) => {
      // Create challenge
      const newChallenge = await tx.monthlyChallenge.create({
        data: {
          year: parseInt(year),
          month: parseInt(month),
          theme,
          instructions,
          goLiveDate: goLive,
          closingDate: closing,
          isPublished: req.user.role === 'ADMIN', // Auto-publish for admin, draft for staff
          createdById: req.user.id,
        },
      });

      // Create badge
      await tx.badge.create({
        data: {
          challengeId: newChallenge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          price: parseFloat(badge.price),
        },
      });

      // Create tasks
      for (const task of tasks) {
        await tx.task.create({
          data: {
            challengeId: newChallenge.id,
            tabName: task.tabName,
            title: task.title,
            description: task.description,
            taskType: task.taskType,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            isRequired: task.isRequired || false,
            completionRule: task.completionRule || 'complete this task',
            options: task.options || {},
            maxScore: task.maxScore || 100,
            createdById: req.user.id,
          },
        });
      }

      return newChallenge;
    });

    res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      data: {
        id: challenge.id,
        theme: challenge.theme,
        year: challenge.year,
        month: challenge.month,
        isPublished: challenge.isPublished,
      },
    });
  } catch (error) {
    console.error('Create challenge error:', error);
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
    const { page = 1, limit = 20, year, isPublished, isActive } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (year) {
      where.year = parseInt(year);
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const challenges = await prisma.monthlyChallenge.findMany({
      where,
      include: {
        badge: true,
        createdBy: {
          select: {
            name: true,
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
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.monthlyChallenge.count({ where });

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
    console.error('Get challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
