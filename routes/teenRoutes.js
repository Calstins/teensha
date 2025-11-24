// routes/teenRoutes.js - UPDATED WITH PAYSTACK
import express from 'express';
import { body, param } from 'express-validator';
import { authenticateTeen } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { upload } from '../utils/multerConfig.js';

import {
  getCurrentChallenge,
  getCommunityStats,
  getLeaderboard,
  getChallengeByIdForTeen,
} from '../controllers/challengeController.js';

import {
  registerPushToken,
  unregisterPushToken,
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController.js';

import {
  getRecentActivity,
  getTopPerformers,
} from '../controllers/communityController.js';

import { getTaskDetails } from '../controllers/taskController.js';

import {
  submitTaskResponse,
  getMySubmissions,
} from '../controllers/submissionController.js';

import {
  initializeBadgePurchase,
  verifyBadgePurchase,
  getMyBadges,
} from '../controllers/badgeController.js';

import {
  getProfile,
  updateProfile,
  getDashboard,
} from '../controllers/teenController.js';

const router = express.Router();

// ============================================
// TEEN PROFILE ROUTES
// ============================================
router.get('/profile', authenticateTeen, getProfile);

router.put(
  '/profile',
  authenticateTeen,
  [
    body('name').optional().isString().isLength({ min: 1 }),
    body('email').optional().isEmail(),
    body('age').optional().isInt({ min: 13 }),
  ],
  handleValidationErrors,
  updateProfile
);

router.patch(
  '/profile',
  authenticateTeen,
  [
    body('name').optional().isString().isLength({ min: 1 }),
    body('email').optional().isEmail(),
    body('age').optional().isInt({ min: 13 }),
    body('profilePhoto').optional().isString(),
  ],
  handleValidationErrors,
  updateProfile
);

router.patch(
  '/:teenId',
  authenticateTeen,
  [
    param('teenId').isString(),
    body('profilePhoto').optional().isString(),
    body('name').optional().isString(),
    body('age').optional().isInt({ min: 13 }),
  ],
  handleValidationErrors,
  updateProfile
);

router.get('/dashboard', authenticateTeen, getDashboard);

// ============================================
// CHALLENGE ROUTES (TEEN-FACING)
// ============================================
router.get('/challenges/current', authenticateTeen, getCurrentChallenge);
router.get('/challenges/stats', authenticateTeen, getCommunityStats);
router.get('/challenges/leaderboard', authenticateTeen, getLeaderboard);

router.get(
  '/challenges/:challengeId',
  authenticateTeen,
  [param('challengeId').isMongoId()],
  handleValidationErrors,
  getChallengeByIdForTeen
);

// ============================================
// COMMUNITY ROUTES
// ============================================
router.get('/community/activity', authenticateTeen, getRecentActivity);
router.get('/community/top-performers', authenticateTeen, getTopPerformers);

// ============================================
// TASK ROUTES (TEEN-FACING)
// ============================================
router.get(
  '/tasks/:taskId',
  authenticateTeen,
  [param('taskId').isMongoId()],
  handleValidationErrors,
  getTaskDetails
);

// ============================================
// SUBMISSION ROUTES (TEEN-FACING)
// ============================================
router.post(
  '/submissions',
  authenticateTeen,
  upload.array('files', 5),
  submitTaskResponse
);

router.get('/submissions/my-submissions', authenticateTeen, getMySubmissions);

// ============================================
// NOTIFICATION ROUTES (TEEN-FACING)
// ============================================
router.post('/notifications/register', authenticateTeen, registerPushToken);
router.post('/notifications/unregister', authenticateTeen, unregisterPushToken);
router.get('/notifications/history', authenticateTeen, getNotificationHistory);
router.patch(
  '/notifications/:notificationId/read',
  authenticateTeen,
  [param('notificationId').isMongoId()],
  handleValidationErrors,
  markNotificationAsRead
);
router.patch(
  '/notifications/read-all',
  authenticateTeen,
  markAllNotificationsAsRead
);

// ============================================
// BADGE ROUTES (TEEN-FACING) - UPDATED WITH PAYSTACK
// ============================================
router.post(
  '/badges/purchase/initialize',
  authenticateTeen,
  [body('badgeId').isMongoId()],
  handleValidationErrors,
  initializeBadgePurchase
);

router.get(
  '/badges/purchase/verify/:reference',
  authenticateTeen,
  [param('reference').isString()],
  handleValidationErrors,
  verifyBadgePurchase
);

router.get('/badges/my-badges', authenticateTeen, getMyBadges);

export default router;
