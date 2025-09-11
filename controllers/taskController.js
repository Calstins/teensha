// controllers/taskController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              fileUrls: submission.fileUrls,
              status: submission.status,
              submittedAt: submission.submittedAt,
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
