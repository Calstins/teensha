// controllers/submissionController.js - FIXED VERSION
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

    console.log('📝 Raw submission data:', {
      taskId,
      contentType: typeof content,
      contentPreview:
        typeof content === 'string' ? content.substring(0, 100) : content,
      filesCount: files.length,
    });

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

    // ✅ REMOVED: Strict date validation - allow submissions anytime
    // Check only if challenge is published
    if (!task.challenge.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Challenge is not available',
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

    // ✅ CRITICAL FIX: Parse content if it's a JSON string
    let parsedContent;
    try {
      parsedContent =
        typeof content === 'string' ? JSON.parse(content) : content;
      console.log('✅ Parsed content:', parsedContent);
    } catch (parseError) {
      console.error('❌ Content parsing error:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid content format',
        error: parseError.message,
      });
    }

    // Validate and process submission based on task type
    let processedContent;
    let fileUrls = [];
    let validationError = null;

    switch (task.taskType) {
      case 'TEXT':
        validationError = validateTextSubmission(parsedContent);
        processedContent = { text: parsedContent };
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
            description: parsedContent || '',
            imageCount: fileUrls.length,
          };
        }
        break;

      case 'VIDEO':
        validationError = validateVideoSubmission(parsedContent);
        processedContent = {
          videoUrl: parsedContent,
          platform: detectVideoPlatform(parsedContent),
        };
        break;

      case 'QUIZ':
        console.log('🎯 QUIZ validation:', {
          parsedContent,
          taskOptions: task.options,
        });
        validationError = validateQuizSubmission(parsedContent, task.options);
        if (!validationError) {
          // parsedContent is already an object with answers
          processedContent = {
            answers: parsedContent.answers || parsedContent,
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      case 'FORM':
        console.log('📋 FORM validation:', {
          parsedContent,
          taskOptions: task.options,
        });
        validationError = validateFormSubmission(parsedContent, task.options);
        if (!validationError) {
          // parsedContent is already an object with responses
          processedContent = {
            responses: parsedContent.responses || parsedContent,
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      case 'PICK_ONE':
        console.log('☝️ PICK_ONE validation:', {
          parsedContent,
          taskOptions: task.options,
        });
        validationError = validatePickOneSubmission(
          parsedContent,
          task.options
        );
        if (!validationError) {
          // parsedContent is already an object with selectedOption
          processedContent = {
            selectedOption: parsedContent.selectedOption || parsedContent,
            submittedAt: new Date().toISOString(),
          };
        }
        break;

      case 'CHECKLIST':
        console.log('✅ CHECKLIST validation:', {
          parsedContent,
          taskOptions: task.options,
          checkedItems: parsedContent.checkedItems,
          isArray: Array.isArray(parsedContent.checkedItems),
        });

        // ✅ CRITICAL FIX: Validate the already-parsed content object
        validationError = validateChecklistSubmission(
          parsedContent,
          task.options
        );

        if (!validationError) {
          // parsedContent is already an object with checkedItems array
          processedContent = {
            checkedItems: parsedContent.checkedItems,
            submittedAt: new Date().toISOString(),
          };
          console.log('✅ CHECKLIST processed:', processedContent);
        } else {
          console.error('❌ CHECKLIST validation failed:', validationError);
        }
        break;

      default:
        validationError = 'Invalid task type';
    }

    if (validationError) {
      console.error('❌ Validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    console.log('✅ Final processed content:', processedContent);

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

    console.log('✅ Submission saved:', submission.id);

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
    console.error('❌ Submit task response error:', error);
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
      status,
      challengeId,
      taskType,
      month,
      year,
      page = 1,
      limit = 100,
    } = req.query;

    console.log('📊 Review queue filters:', {
      status,
      challengeId,
      taskType,
      month,
      year,
      page,
      limit,
    });

    const where = {};

    if (status) {
      where.status = status;
    }

    if (challengeId || taskType || month || year) {
      where.task = {};

      if (challengeId) {
        where.task.challengeId = challengeId;
      }

      if (taskType) {
        where.task.taskType = taskType;
      }

      if (month || year) {
        where.task.challenge = {};

        if (month) {
          where.task.challenge.month = parseInt(month);
        }

        if (year) {
          where.task.challenge.year = parseInt(year);
        }
      }
    }

    console.log('📋 Prisma where clause:', JSON.stringify(where, null, 2));

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
          submittedAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.submission.count({ where }),
    ]);

    console.log(`✅ Found ${submissions.length} submissions (total: ${total})`);

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
    console.error('❌ Get review queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, score, reviewNote } = req.body;

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
