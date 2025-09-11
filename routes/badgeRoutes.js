/// routes/badgeRoutes.js
import express from 'express';
import { body } from 'express-validator';
import { authenticateTeen, authenticateUser } from '../middleware/auth.js';
import {
  purchaseBadge,
  getMyBadges,
  getBadgeStats,
} from '../controllers/badgeController.js';

const router = express.Router();

// Purchase badge
router.post(
  '/purchase',
  authenticateTeen,
  [body('badgeId').notEmpty()],
  purchaseBadge
);

// Get teen's badges
router.get('/my-badges', authenticateTeen, getMyBadges);

// Admin: Get badge statistics
router.get('/stats', authenticateUser, getBadgeStats);

export default router;
