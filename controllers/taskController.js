// controllers/taskController.js
import prisma from '../lib/prisma.js';

// CREATE Task
export const createTask = async (req, res) => {
  try {
    const {
      challengeId,
      tabName,
      title,
      description,
      taskType,
      dueDate,
      isRequired,
      completionRule,
      options,
      maxScore,
    } = req.body;

    // Validate challenge exists
    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Validate options based on taskType
    if (['QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'].includes(taskType)) {
      if (!options || (Array.isArray(options) && options.length === 0)) {
        return res.status(400).json({
          success: false,
          message: `Options are required for ${taskType} task type`,
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        challengeId,
        tabName,
        title,
        description,
        taskType,
        dueDate: dueDate ? new Date(dueDate) : null,
        isRequired: isRequired || false,
        completionRule: completionRule || 'Complete this task',
        options: options || null,
        maxScore: maxScore || 100,
        createdById: req.user.id,
      },
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
            year: true,
            month: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// UPDATE Task
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      tabName,
      title,
      description,
      taskType,
      dueDate,
      isRequired,
      completionRule,
      options,
      maxScore,
    } = req.body;

    // Check if task exists
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const updateData = {};
    if (tabName) updateData.tabName = tabName;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (taskType) updateData.taskType = taskType;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (typeof isRequired === 'boolean') updateData.isRequired = isRequired;
    if (completionRule) updateData.completionRule = completionRule;
    if (options !== undefined) updateData.options = options;
    if (maxScore) updateData.maxScore = maxScore;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// DELETE Task
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// GET All Tasks for a Challenge (Admin view)
export const getTasksByChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { challengeId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: [{ tabName: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        tasks,
        total: tasks.length,
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// GET Single Task (Admin view)
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
            year: true,
            month: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
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

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getTaskDetails = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
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

    // ✅ UPDATED: Only check if challenge is published
    // Allow viewing tasks from past challenges
    if (!task.challenge.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Challenge is not available',
      });
    }

    // ✅ NEW: Check if challenge/task is past closing date
    const currentDate = new Date();
    const isPastChallenge = task.challenge.closingDate < currentDate;
    const isChallengeOpen =
      task.challenge.isActive &&
      task.challenge.goLiveDate <= currentDate &&
      task.challenge.closingDate >= currentDate;

    // Get teen's submission for this task
    const submission = await prisma.submission.findUnique({
      where: {
        taskId_teenId: {
          taskId: task.id,
          teenId: req.teen.id,
        },
      },
    });

    res.json({
      success: true,
      data: {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          dueDate: task.dueDate,
          options: task.options,
          tabName: task.tabName,
        },
        challenge: {
          id: task.challenge.id,
          theme: task.challenge.theme,
          isChallengeOpen, // Whether submissions are within normal timeframe
          isPastChallenge, // ✅ NEW: Whether challenge has closed
          closingDate: task.challenge.closingDate,
          allowLateSubmission: true, // ✅ NEW: Always allow submissions
        },
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              fileUrls: submission.fileUrls,
              status: submission.status,
              submittedAt: submission.submittedAt,
              // ✅ NEW: Indicate if submission was late
              submittedLate:
                submission.submittedAt > task.challenge.closingDate,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
