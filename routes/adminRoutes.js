// routes/adminRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

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
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address (e.g. staff@example.com)'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long'),
    body('role')
      .isIn(['ADMIN', 'STAFF'])
      .withMessage('Role must be either ADMIN or STAFF'),
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
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'STAFF'])
      .withMessage('Role must be either ADMIN or STAFF'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be true or false'),
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
  [param('challengeId').isMongoId().withMessage('Invalid challenge ID format')],
  handleValidationErrors,
  getChallengeById
);

router.post(
  '/challenges',
  authenticateUser,
  [
    body('year')
      .isInt({ min: 2024, max: 2030 })
      .withMessage('Year must be a number between 2024 and 2030'),
    body('month')
      .isInt({ min: 1, max: 12 })
      .withMessage('Month must be a number between 1 (January) and 12 (December)'),
    body('theme')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Theme must be at least 3 characters long'),
    body('instructions')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Instructions must be at least 10 characters — give teens enough detail to understand the challenge'),
    body('goLiveDate')
      .isISO8601()
      .withMessage('Go Live Date must be a valid date (e.g. 2025-01-15 or 2025-01-15T10:00:00Z)'),
    body('closingDate')
      .isISO8601()
      .withMessage('Closing Date must be a valid date (e.g. 2025-01-31 or 2025-01-31T23:59:59Z)'),
    body('badgeData')
      .notEmpty()
      .withMessage('Badge information is required — every challenge must have a badge')
      .isObject()
      .withMessage('Badge data must be a valid object'),
    body('badgeData.name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Badge name must be at least 2 characters long'),
    body('badgeData.description')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Badge description must be at least 5 characters long'),
    body('badgeData.imageUrl')
      .trim()
      .notEmpty()
      .withMessage('Badge image URL is required')
      .isURL()
      .withMessage('Badge image URL must be a valid URL (e.g. https://example.com/badge.png)'),
    body('badgeData.price')
      .isFloat({ min: 0 })
      .withMessage('Badge price must be a number of 0 or greater (use 0 for free badges)'),
  ],
  handleValidationErrors,
  createChallenge
);

router.patch(
  '/challenges/:challengeId',
  authenticateUser,
  [
    param('challengeId').isMongoId().withMessage('Invalid challenge ID format'),
    body('theme')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Theme must be at least 3 characters long'),
    body('instructions')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Instructions must be at least 10 characters long'),
    body('goLiveDate')
      .optional()
      .isISO8601()
      .withMessage('Go Live Date must be a valid date (e.g. 2025-01-15T10:00:00Z)'),
    body('closingDate')
      .optional()
      .isISO8601()
      .withMessage('Closing Date must be a valid date (e.g. 2025-01-31T23:59:59Z)'),
    body('badgeData')
      .optional()
      .isObject()
      .withMessage('Badge data must be a valid object'),
    body('badgeData.name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Badge name must be at least 2 characters long'),
    body('badgeData.description')
      .optional()
      .trim()
      .isLength({ min: 5 })
      .withMessage('Badge description must be at least 5 characters long'),
    body('badgeData.imageUrl')
      .optional()
      .isURL()
      .withMessage('Badge image URL must be a valid URL (e.g. https://example.com/badge.png)'),
    body('badgeData.price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Badge price must be a number of 0 or greater'),
  ],
  handleValidationErrors,
  updateChallenge
);

router.patch(
  '/challenges/:challengeId/publish',
  authenticateUser,
  [param('challengeId').isMongoId().withMessage('Invalid challenge ID format')],
  handleValidationErrors,
  publishChallenge
);

router.patch(
  '/challenges/:challengeId/toggle',
  authenticateUser,
  [
    param('challengeId').isMongoId().withMessage('Invalid challenge ID format'),
    body('field')
      .isIn(['isPublished', 'isActive'])
      .withMessage('Field must be either "isPublished" or "isActive"'),
  ],
  handleValidationErrors,
  toggleChallengeStatus
);

router.delete(
  '/challenges/:challengeId',
  authenticateUser,
  requireAdmin,
  [param('challengeId').isMongoId().withMessage('Invalid challenge ID format')],
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
    body('challengeId')
      .isMongoId()
      .withMessage('A valid Challenge ID is required — please select the challenge this task belongs to'),
    body('tabName')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Tab name is required — this groups tasks into sections (e.g. "Week 1", "Reflection")'),
    body('title')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Task title must be at least 3 characters long'),
    body('description')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Task description must be at least 10 characters — give teens clear instructions on what to do'),
    body('taskType')
      .isIn(['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'])
      .withMessage('Task type must be one of: TEXT, IMAGE, VIDEO, QUIZ, FORM, PICK_ONE, CHECKLIST'),
    body('isRequired')
      .optional()
      .isBoolean()
      .withMessage('isRequired must be true or false'),
    body('completionRule')
      .optional()
      .isString()
      .withMessage('Completion rule must be a text value'),
    body('maxScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Max score must be a whole number between 0 and 100'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date (e.g. 2025-01-31T23:59:59Z)'),
    body('options').optional(),
  ],
  handleValidationErrors,
  createTask
);

router.get(
  '/tasks/challenge/:challengeId',
  authenticateUser,
  [param('challengeId').isMongoId().withMessage('Invalid challenge ID format')],
  handleValidationErrors,
  getTasksByChallenge
);

router.get(
  '/tasks/:taskId',
  authenticateUser,
  [param('taskId').isMongoId().withMessage('Invalid task ID format')],
  handleValidationErrors,
  getTaskById
);

router.put(
  '/tasks/:taskId',
  authenticateUser,
  [
    param('taskId').isMongoId().withMessage('Invalid task ID format'),
    body('tabName')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Tab name cannot be empty'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Task title must be at least 3 characters long'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Task description must be at least 10 characters long'),
    body('taskType')
      .optional()
      .isIn(['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'])
      .withMessage('Task type must be one of: TEXT, IMAGE, VIDEO, QUIZ, FORM, PICK_ONE, CHECKLIST'),
    body('isRequired')
      .optional()
      .isBoolean()
      .withMessage('isRequired must be true or false'),
    body('completionRule')
      .optional()
      .isString()
      .withMessage('Completion rule must be a text value'),
    body('maxScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Max score must be a whole number between 0 and 100'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date (e.g. 2025-01-31T23:59:59Z)'),
    body('options').optional(),
  ],
  handleValidationErrors,
  updateTask
);

router.delete(
  '/tasks/:taskId',
  authenticateUser,
  [param('taskId').isMongoId().withMessage('Invalid task ID format')],
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
  [param('submissionId').isMongoId().withMessage('Invalid submission ID format')],
  handleValidationErrors,
  getSubmissionById
);

router.patch(
  '/submissions/:submissionId/review',
  authenticateUser,
  [
    param('submissionId').isMongoId().withMessage('Invalid submission ID format'),
    body('status')
      .isIn(['APPROVED', 'REJECTED', 'PENDING'])
      .withMessage('Status must be APPROVED, REJECTED, or PENDING'),
    body('score')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Score must be a whole number between 0 and 100'),
    body('reviewNote')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Review note must not exceed 500 characters'),
  ],
  handleValidationErrors,
  reviewSubmission
);

router.delete(
  '/submissions/:submissionId',
  authenticateUser,
  requireAdmin,
  [param('submissionId').isMongoId().withMessage('Invalid submission ID format')],
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
  [param('badgeId').isMongoId().withMessage('Invalid badge ID format')],
  handleValidationErrors,
  getBadgeById
);

router.post(
  '/badges',
  authenticateUser,
  [
    body('challengeId')
      .isMongoId()
      .withMessage('A valid Challenge ID is required — select the challenge this badge belongs to'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Badge name is required'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Badge description is required'),
    body('imageUrl')
      .trim()
      .notEmpty()
      .withMessage('Badge image URL is required')
      .isURL()
      .withMessage('Badge image must be a valid URL (e.g. https://example.com/badge.png)'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a number of 0 or greater (use 0 for free badges)'),
  ],
  handleValidationErrors,
  createBadge
);

router.patch(
  '/badges/:badgeId',
  authenticateUser,
  [
    param('badgeId').isMongoId().withMessage('Invalid badge ID format'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Badge name cannot be empty'),
    body('description')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Badge description cannot be empty'),
    body('imageUrl')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Badge image URL cannot be empty')
      .isURL()
      .withMessage('Badge image must be a valid URL'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a number of 0 or greater'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be true or false'),
  ],
  handleValidationErrors,
  updateBadge
);

router.delete(
  '/badges/:badgeId',
  authenticateUser,
  requireAdmin,
  [param('badgeId').isMongoId().withMessage('Invalid badge ID format')],
  handleValidationErrors,
  deleteBadge
);

// ============================================
// TEEN MANAGEMENT ROUTES
// ============================================

router.get('/teens', authenticateUser, getAllTeens);

router.get('/teens/stats', authenticateUser, getTeenStats);

router.get(
  '/teens/:teenId',
  authenticateUser,
  [param('teenId').isMongoId().withMessage('Invalid teen ID format')],
  handleValidationErrors,
  getTeenById
);

router.patch(
  '/teens/:teenId',
  authenticateUser,
  requireAdmin,
  [
    param('teenId').isMongoId().withMessage('Invalid teen ID format'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be true or false'),
    body('optInPublic')
      .optional()
      .isBoolean()
      .withMessage('optInPublic must be true or false'),
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
