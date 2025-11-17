// routes/teenRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import { authenticateTeen } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { upload } from '../utils/multerConfig.js';

import {
  getCurrentChallenge,
  getCommunityStats,
  getLeaderboard,
} from '../controllers/challengeController.js';

import { getTaskDetails } from '../controllers/taskController.js';

import {
  submitTaskResponse,
  getMySubmissions,
} from '../controllers/submissionController.js';

import { purchaseBadge, getMyBadges } from '../controllers/badgeController.js';

const router = express.Router();

// ============================================
// CHALLENGE ROUTES (TEEN-FACING)
// ============================================

router.get('/challenges/current', authenticateTeen, getCurrentChallenge);
router.get('/challenges/stats', authenticateTeen, getCommunityStats);
router.get('/challenges/leaderboard', authenticateTeen, getLeaderboard);

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
// BADGE ROUTES (TEEN-FACING)
// ============================================

router.post(
  '/badges/purchase',
  authenticateTeen,
  [body('badgeId').isMongoId()],
  handleValidationErrors,
  purchaseBadge
);

router.get('/badges/my-badges', authenticateTeen, getMyBadges);

export default router;
