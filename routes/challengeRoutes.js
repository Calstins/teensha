import express from 'express';
import { authenticateTeen } from '../middleware/auth.js';
import {
  getCurrentChallenge,
  getCommunityStats,
  getLeaderboard,
} from '../controllers/challengeController.js';

const router = express.Router();

// Get current active challenge for teens
router.get('/current', authenticateTeen, getCurrentChallenge);

// Get community stats (FOMO data)
router.get('/stats', authenticateTeen, getCommunityStats);

// Get top teens leaderboard
router.get('/leaderboard', authenticateTeen, getLeaderboard);

export default router;
