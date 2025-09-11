// routes/raffleRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  authenticateTeen,
  authenticateUser,
  requireAdmin,
} from '../middleware/auth.js';
import {
  checkRaffleEligibility,
  getEligibleTeens,
  createRaffleDraw,
  getRaffleHistory,
} from '../controllers/raffleController.js';

const router = express.Router();

// Teen: Check raffle eligibility
router.get('/eligibility/:year', authenticateTeen, checkRaffleEligibility);

// Admin: Get eligible teens for raffle
router.get('/eligible/:year', authenticateUser, requireAdmin, getEligibleTeens);

// Admin: Create raffle draw
router.post(
  '/draw',
  authenticateUser,
  requireAdmin,
  [
    body('year').isInt({ min: 2020, max: 2030 }),
    body('prize').trim().isLength({ min: 3 }),
    body('description').optional().trim(),
  ],
  createRaffleDraw
);

// Get raffle history
router.get('/history', authenticateUser, getRaffleHistory);

export default router;
