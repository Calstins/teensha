import express from 'express';
import { body } from 'express-validator';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import {
  createStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
  createChallenge,
  publishChallenge,
  getAllChallenges,
} from '../controllers/adminController.js';

const router = express.Router();

// Admin: Create staff account
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
  createStaff
);

// Admin: Get all staff accounts
router.get('/staff', authenticateUser, requireAdmin, getAllStaff);

// Admin: Update staff account
router.patch(
  '/staff/:userId',
  authenticateUser,
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('role').optional().isIn(['ADMIN', 'STAFF']),
    body('isActive').optional().isBoolean(),
  ],
  updateStaff
);

// Admin: Delete staff account
router.delete('/staff/:userId', authenticateUser, requireAdmin, deleteStaff);

// Create monthly challenge
router.post(
  '/challenges',
  authenticateUser,
  [
    body('year').isInt({ min: 2020, max: 2030 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('theme').trim().isLength({ min: 3 }),
    body('instructions').trim().isLength({ min: 10 }),
    body('goLiveDate').isISO8601(),
    body('closingDate').isISO8601(),
    body('badge').isObject(),
    body('tasks').isArray().isLength({ min: 1 }),
  ],
  createChallenge
);

// Admin: Publish challenge (approve staff-created challenges)
router.patch(
  '/challenges/:challengeId/publish',
  authenticateUser,
  requireAdmin,
  publishChallenge
);

// Get all challenges (for admin dashboard)
router.get('/challenges', authenticateUser, getAllChallenges);

export default router;
