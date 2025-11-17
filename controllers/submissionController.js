// controllers/submissionController.js
import { validationResult } from 'express-validator';
import {
  updateTeenProgressHelper,
  updateRaffleEligibilityHelper,
} from '../utils/helpers.js';
import {
  handleValidationErrors,
  validateTextSubmission,
  validateVideoSubmission,
  detectVideoPlatform,
  validateQuizSubmission,
  validateFormSubmission,
  validatePickOneSubmission,
  validateChecklistSubmission,
} from '../middleware/validation.js';
import prisma from '../lib/prisma.js';
import { uploadToCloudinary } from '../utils/fileUpload.js';

// ============================================
// TEEN-FACING ENDPOINTS
// ============================================

export const submitTaskResponse = async (req, res) => {
  try {
    const { taskId, content } = req.body;
    const teenId = req.teen.id;
    const files = req.files || [];

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        challenge: true,
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

    // Check if submission already exists
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        taskId_teenId: {
          taskId,
          teenId,
        },
      },
    });

    // Validate and process submission based on task type
    let processedContent;
    let fileUrls = [];
    let validationError = null;

    switch (task.taskType) {
      case 'TEXT':
        validationError = validateTextSubmission(content);
        processedContent = { text: content };
        break;

      case 'IMAGE':
        if (files.length === 0) {
          validationError = 'At least one image file is required';
        } else {
          // Upload images to Cloudinary
          for (const file of files) {
            const url = await uploadToCloudinary(
              file.buffer,
              file.originalname,
              'image'
            );
            fileUrls.push(url);
          }
          processedContent = {
            description: content || '',
            imageCount: fileUrls.length,
          };
        }
        break;

      case 'VIDEO':
        validationError = validateVideoSubmission(content);
        processedContent = {
          videoUrl: content,
          platform: detectVideoPlatform(content),
        };
        break;

      case 'QUIZ':
        validationError = validateQuizSubmission(content, task.options);
        if (!validationError) {
          processedContent = {
            answers: JSON.parse(content),
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      case 'FORM':
        validationError = validateFormSubmission(content, task.options);
        if (!validationError) {
          processedContent = {
            responses: JSON.parse(content),
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      case 'PICK_ONE':
        validationError = validatePickOneSubmission(content, task.options);
        if (!validationError) {
          processedContent = {
            selectedOption: content,
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      case 'CHECKLIST':
        validationError = validateChecklistSubmission(content, task.options);
        if (!validationError) {
          processedContent = {
            checkedItems: JSON.parse(content),
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      default:
        validationError = 'Invalid task type';
    }

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Create or update submission
    const submission = existingSubmission
      ? await prisma.submission.update({
          where: { id: existingSubmission.id },
          data: {
            content: processedContent,
            fileUrls,
            status: 'APPROVED', // Auto-approve by default
            submittedAt: new Date(),
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
        })
      : await prisma.submission.create({
          data: {
            taskId,
            teenId,
            content: processedContent,
            fileUrls,
            status: 'APPROVED', // Auto-approve by default
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
        });

    // Update teen progress
    await updateTeenProgressHelper(teenId, task.challengeId);

    res.status(existingSubmission ? 200 : 201).json({
      success: true,
      message: existingSubmission
        ? 'Submission updated successfully'
        : 'Submission created successfully',
      data: submission,
    });
  } catch (error) {
    console.error('Submit task response error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getMySubmissions = async (req, res) => {
  try {
    const teenId = req.teen.id;
    const { challengeId, status, taskType } = req.query;

    const where = { teenId };

    if (challengeId) {
      where.task = {
        challengeId,
      };
    }

    if (status) {
      where.status = status;
    }

    if (taskType) {
      where.task = {
        ...where.task,
        taskType,
      };
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            tabName: true,
            taskType: true,
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
    });

    res.json({
      success: true,
      data: {
        submissions,
        total: submissions.length,
      },
    });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ============================================
// ADMIN/STAFF ENDPOINTS
// ============================================

export const getReviewQueue = async (req, res) => {
  try {
    const {
      status = 'PENDING',
      challengeId,
      taskType,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (challengeId || taskType) {
      where.task = {};
      if (challengeId) where.task.challengeId = challengeId;
      if (taskType) where.task.taskType = taskType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              tabName: true,
              taskType: true,
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
          teen: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePhoto: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'asc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
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
    const { submissionId } = req.params;
    const { status, score, reviewNote } = req.body;

    // Validate status
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          select: {
            maxScore: true,
            challengeId: true,
          },
        },
        teen: true,
      },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    // Validate score if provided
    if (score !== undefined) {
      if (score < 0 || score > submission.task.maxScore) {
        return res.status(400).json({
          success: false,
          message: `Score must be between 0 and ${submission.task.maxScore}`,
        });
      }
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        score: score !== undefined ? parseInt(score) : submission.score,
        reviewNote,
        reviewerId: req.user.id,
        reviewedAt: new Date(),
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            tabName: true,
            taskType: true,
            maxScore: true,
          },
        },
        teen: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update teen progress after review
    await updateTeenProgressHelper(
      submission.teen.id,
      submission.task.challengeId
    );

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            tabName: true,
            taskType: true,
            options: true,
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
        teen: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePhoto: true,
            age: true,
            state: true,
            country: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
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

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: {
          select: {
            challengeId: true,
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

    await prisma.submission.delete({
      where: { id: submissionId },
    });

    // Update teen progress after deletion
    await updateTeenProgressHelper(
      submission.teenId,
      submission.task.challengeId
    );

    res.json({
      success: true,
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    console.error('Delete submission error:', error);
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
