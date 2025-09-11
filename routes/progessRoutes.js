// routes/progressRoutes.js
import express from 'express';
import { authenticateTeen, authenticateUser } from '../middleware/auth.js';
import {
  getChallengeProgress,
  getYearlyProgress,
  getProgressAnalytics,
} from '../controllers/progressController.js';

const router = express.Router();

// Get teen's progress for a specific challenge
router.get('/challenge/:challengeId', authenticateTeen, getChallengeProgress);

// Get teen's yearly progress
router.get('/year/:year', authenticateTeen, getYearlyProgress);

// Admin: Get progress analytics
router.get('/analytics/overview', authenticateUser, getProgressAnalytics);

export default router;
