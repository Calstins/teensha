// controllers/submissionController.js
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import { uploadToCloudinary } from '../utils/fileUpload.js';
import {
  updateTeenProgressHelper,
  updateRaffleEligibilityHelper,
} from '../utils/helpers.js';
import { handleValidationErrors } from '../middleware/validation.js';

export const submitTaskResponse = async (req, res) => {
  try {
    handleValidationErrors(req, res, () => {});

    const { taskId, content } = req.body;
    const files = req.files || [];

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        challenge: {
          select: {
            isPublished: true,
            isActive: true,
            goLiveDate: true,
            closingDate: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if challenge is active
    const currentDate = new Date();
    if (
      !task.challenge.isPublished ||
      !task.challenge.isActive ||
      task.challenge.goLiveDate > currentDate ||
      task.challenge.closingDate < currentDate
    ) {
      return res.status(403).json({
        success: false,
        message: 'Challenge is not currently active',
      });
    }

    // Upload files using utility
    const fileUrls = [];
    for (const file of files) {
      try {
        const resourceType = file.mimetype.startsWith('video/')
          ? 'video'
          : 'image';
        const url = await uploadToCloudinary(
          file.buffer,
          file.originalname,
          resourceType
        );
        fileUrls.push(url);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'File upload failed',
        });
      }
    }

    // Parse content
    let parsedContent = {};
    try {
      if (typeof content === 'string') {
        parsedContent = JSON.parse(content);
      } else {
        parsedContent = content || {};
      }
    } catch (parseError) {
      parsedContent = { text: content };
    }

    // Create or update submission
    const submission = await prisma.submission.upsert({
      where: {
        taskId_teenId: {
          taskId: task.id,
          teenId: req.teen.id,
        },
      },
      update: {
        content: parsedContent,
        fileUrls,
        submittedAt: new Date(),
        status: 'APPROVED',
      },
      create: {
        taskId: task.id,
        teenId: req.teen.id,
        content: parsedContent,
        fileUrls,
        status: 'APPROVED',
      },
    });

    // Update teen's progress using helper
    await updateTeenProgressHelper(req.teen.id, task.challengeId);

    res.json({
      success: true,
      message: 'Submission created successfully',
      data: {
        submission: {
          id: submission.id,
          content: submission.content,
          fileUrls: submission.fileUrls,
          status: submission.status,
          submittedAt: submission.submittedAt,
        },
      },
    });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getMySubmissions = async (req, res) => {
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
      orderBy: {
        submittedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: submissions.map((sub) => ({
        id: sub.id,
        task: sub.task,
        content: sub.content,
        fileUrls: sub.fileUrls,
        status: sub.status,
        submittedAt: sub.submittedAt,
      })),
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getReviewQueue = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      challengeId,
      search,
      taskType,
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    // Status filter
    if (status) where.status = status;

    // Challenge filter
    if (challengeId) {
      where.task = { challengeId };
    }

    // Task type filter
    if (taskType) {
      where.task = {
        ...where.task,
        taskType,
      };
    }

    // Search filter - search across teen name, task title, and challenge theme
    if (search) {
      where.OR = [
        // Search by teen name
        {
          teen: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        // Search by teen email
        {
          teen: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        // Search by task title
        {
          task: {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        // Search by challenge theme
        {
          task: {
            challenge: {
              theme: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        teen: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePhoto: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            taskType: true,
            tabName: true,
            description: true,
            maxScore: true,
            challenge: {
              select: {
                id: true,
                theme: true,
                year: true,
                month: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    });

    const total = await prisma.submission.count({ where });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get review queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { submissionId } = req.params;
    const { score, reviewNote, status } = req.body;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          include: {
            challenge: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...(score !== undefined && { score }),
        ...(reviewNote && { reviewNote }),
        ...(status && { status }),
        reviewerId: req.user.id,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: updatedSubmission,
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Helper function to update teen progress
async function updateTeenProgress(teenId, challengeId) {
  try {
    // Get all tasks for the challenge
    const tasks = await prisma.task.findMany({
      where: { challengeId },
    });

    // Get completed submissions for this teen and challenge
    const completedSubmissions = await prisma.submission.count({
      where: {
        teenId,
        status: 'APPROVED',
        task: {
          challengeId,
        },
      },
    });

    const totalTasks = tasks.length;
    const percentage =
      totalTasks > 0 ? (completedSubmissions / totalTasks) * 100 : 0;
    const isCompleted = percentage === 100;

    // Update or create progress record
    await prisma.teenProgress.upsert({
      where: {
        teenId_challengeId: {
          teenId,
          challengeId,
        },
      },
      update: {
        tasksTotal: totalTasks,
        tasksCompleted: completedSubmissions,
        percentage,
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        teenId,
        challengeId,
        tasksTotal: totalTasks,
        tasksCompleted: completedSubmissions,
        percentage,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Update raffle eligibility if teen completed all tasks and has all badges for the year
    if (isCompleted) {
      const challenge = await prisma.monthlyChallenge.findUnique({
        where: { id: challengeId },
        select: { year: true },
      });

      await updateRaffleEligibility(teenId, challenge.year);
    }
  } catch (error) {
    console.error('Update progress error:', error);
  }
}

// Helper function to update raffle eligibility
async function updateRaffleEligibility(teenId, year) {
  try {
    // Check if teen has purchased all 12 badges for the year
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
