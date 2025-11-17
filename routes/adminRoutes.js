// routes/adminRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

// Import controllers
import {
  createStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/adminController.js';

import {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  publishChallenge,
  deleteChallenge,
  toggleChallengeStatus,
} from '../controllers/challengeController.js';

import {
  createTask,
  updateTask,
  deleteTask,
  getTasksByChallenge,
  getTaskById,
} from '../controllers/taskController.js';

import {
  getReviewQueue,
  reviewSubmission,
  getSubmissionById,
  deleteSubmission,
} from '../controllers/submissionController.js';

import {
  createBadge,
  getAllBadges,
  getBadgeById,
  updateBadge,
  deleteBadge,
  getBadgeStats,
} from '../controllers/badgeController.js';

import {
  getAllTeens,
  getTeenById,
  getTeenStats,
  updateTeen,
} from '../controllers/teenController.js';

const router = express.Router();

// ============================================
// STAFF MANAGEMENT ROUTES
// ============================================

router.post(
  '/staff',
  authenticateUser,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 2 }),
    body('role').isIn(['ADMIN', 'STAFF']),
  ],
  handleValidationErrors,
  createStaff
);

router.get('/staff', authenticateUser, requireAdmin, getAllStaff);

router.patch(
  '/staff/:userId',
  authenticateUser,
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('role').optional().isIn(['ADMIN', 'STAFF']),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  updateStaff
);

router.delete('/staff/:userId', authenticateUser, requireAdmin, deleteStaff);

// ============================================
// CHALLENGE MANAGEMENT ROUTES
// ============================================

router.get('/challenges', authenticateUser, getChallenges);

router.get(
  '/challenges/:challengeId',
  authenticateUser,
  [param('challengeId').isMongoId()],
  handleValidationErrors,
  getChallengeById
);

router.post(
  '/challenges',
  authenticateUser,
  [
    body('year').isInt({ min: 2024, max: 2030 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('theme').trim().isLength({ min: 3 }),
    body('instructions').trim().isLength({ min: 10 }),
    body('goLiveDate').isISO8601(),
    body('closingDate').isISO8601(),
    body('badgeData').optional().isObject(),
    body('badgeData.name').optional().trim().isLength({ min: 2 }),
    body('badgeData.description').optional().trim().isLength({ min: 5 }),
    body('badgeData.imageUrl').optional().isURL(),
    body('badgeData.price').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  createChallenge
);

router.patch(
  '/challenges/:challengeId',
  authenticateUser,
  [
    param('challengeId').isMongoId(),
    body('theme').optional().trim().isLength({ min: 3 }),
    body('instructions').optional().trim().isLength({ min: 10 }),
    body('goLiveDate').optional().isISO8601(),
    body('closingDate').optional().isISO8601(),
    body('badgeData').optional().isObject(),
    body('badgeData.name').optional().trim().isLength({ min: 2 }),
    body('badgeData.description').optional().trim().isLength({ min: 5 }),
    body('badgeData.imageUrl').optional().isURL(),
    body('badgeData.price').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  updateChallenge
);

router.patch(
  '/challenges/:challengeId/publish',
  authenticateUser,
  [param('challengeId').isMongoId()],
  handleValidationErrors,
  publishChallenge
);

router.patch(
  '/challenges/:challengeId/toggle',
  authenticateUser,
  [
    param('challengeId').isMongoId(),
    body('field').isIn(['isPublished', 'isActive']),
  ],
  handleValidationErrors,
  toggleChallengeStatus
);

router.delete(
  '/challenges/:challengeId',
  authenticateUser,
  requireAdmin,
  [param('challengeId').isMongoId()],
  handleValidationErrors,
  deleteChallenge
);

// ============================================
// TASK MANAGEMENT ROUTES
// ============================================

router.post(
  '/tasks',
  authenticateUser,
  [
    body('challengeId').isMongoId(),
    body('tabName').trim().isLength({ min: 1 }),
    body('title').trim().isLength({ min: 3 }),
    body('description').trim().isLength({ min: 10 }),
    body('taskType').isIn([
      'TEXT',
      'IMAGE',
      'VIDEO',
      'QUIZ',
      'FORM',
      'PICK_ONE',
      'CHECKLIST',
    ]),
    body('isRequired').optional().isBoolean(),
    body('completionRule').optional().isString(),
    body('maxScore').optional().isInt({ min: 0, max: 100 }),
    body('dueDate').optional().isISO8601(),
    body('options').optional(),
  ],
  handleValidationErrors,
  createTask
);

router.get(
  '/tasks/challenge/:challengeId',
  authenticateUser,
  [param('challengeId').isMongoId()],
  handleValidationErrors,
  getTasksByChallenge
);

router.get(
  '/tasks/:taskId',
  authenticateUser,
  [param('taskId').isMongoId()],
  handleValidationErrors,
  getTaskById
);

router.put(
  '/tasks/:taskId',
  authenticateUser,
  [
    param('taskId').isMongoId(),
    body('tabName').optional().trim().isLength({ min: 1 }),
    body('title').optional().trim().isLength({ min: 3 }),
    body('description').optional().trim().isLength({ min: 10 }),
    body('taskType')
      .optional()
      .isIn([
        'TEXT',
        'IMAGE',
        'VIDEO',
        'QUIZ',
        'FORM',
        'PICK_ONE',
        'CHECKLIST',
      ]),
    body('isRequired').optional().isBoolean(),
    body('completionRule').optional().isString(),
    body('maxScore').optional().isInt({ min: 0, max: 100 }),
    body('dueDate').optional().isISO8601(),
    body('options').optional(),
  ],
  handleValidationErrors,
  updateTask
);

router.delete(
  '/tasks/:taskId',
  authenticateUser,
  [param('taskId').isMongoId()],
  handleValidationErrors,
  deleteTask
);

// ============================================
// SUBMISSION MANAGEMENT ROUTES
// ============================================

router.get('/submissions/review-queue', authenticateUser, getReviewQueue);

router.get(
  '/submissions/:submissionId',
  authenticateUser,
  [param('submissionId').isMongoId()],
  handleValidationErrors,
  getSubmissionById
);

router.patch(
  '/submissions/:submissionId/review',
  authenticateUser,
  [
    param('submissionId').isMongoId(),
    body('status').isIn(['APPROVED', 'REJECTED', 'PENDING']),
    body('score').optional().isInt({ min: 0, max: 100 }),
    body('reviewNote').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  reviewSubmission
);

router.delete(
  '/submissions/:submissionId',
  authenticateUser,
  requireAdmin,
  [param('submissionId').isMongoId()],
  handleValidationErrors,
  deleteSubmission
);

// ============================================
// BADGE MANAGEMENT ROUTES
// ============================================

router.get('/badges', authenticateUser, getAllBadges);

router.get('/badges/stats', authenticateUser, getBadgeStats);

router.get(
  '/badges/:badgeId',
  authenticateUser,
  [param('badgeId').isMongoId()],
  handleValidationErrors,
  getBadgeById
);

router.post(
  '/badges',
  authenticateUser,
  [
    body('challengeId').isMongoId().withMessage('Valid challenge ID required'),
    body('name').trim().notEmpty().withMessage('Badge name is required'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required'),
    body('imageUrl').trim().notEmpty().withMessage('Image URL is required'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
  ],
  handleValidationErrors,
  createBadge
);

router.patch(
  '/badges/:badgeId',
  authenticateUser,
  [
    param('badgeId').isMongoId(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('imageUrl').optional().trim().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  updateBadge
);

router.delete(
  '/badges/:badgeId',
  authenticateUser,
  requireAdmin,
  [param('badgeId').isMongoId()],
  handleValidationErrors,
  deleteBadge
);

// ============================================
// TEEN MANAGEMENT ROUTES
// ============================================

// Get all teens
router.get('/teens', authenticateUser, getAllTeens);

// Get teen statistics
router.get('/teens/stats', authenticateUser, getTeenStats);

// Get single teen by ID
router.get(
  '/teens/:teenId',
  authenticateUser,
  [param('teenId').isMongoId()],
  handleValidationErrors,
  getTeenById
);

// Update teen (admin can activate/deactivate)
router.patch(
  '/teens/:teenId',
  authenticateUser,
  requireAdmin,
  [
    param('teenId').isMongoId(),
    body('isActive').optional().isBoolean(),
    body('optInPublic').optional().isBoolean(),
  ],
  handleValidationErrors,
  updateTeen
);

// ============================================
// DEBUG ROUTES
// ============================================

router.get('/test-staff', authenticateUser, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const count = await prisma.user.count();
    const users = await prisma.user.findMany({ take: 5 });
    res.json({
      success: true,
      count,
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
