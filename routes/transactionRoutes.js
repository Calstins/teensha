// routes/transactionRoutes.js
import express from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import {
  getAllTransactions,
  getTransactionById,
  getTransactionAnalytics,
  getRevenueSummary,
  getTeenTransactions,
} from '../controllers/transactionController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get all transactions with filters
router.get('/', getAllTransactions);

// Get revenue summary
router.get('/revenue/summary', getRevenueSummary);

// Get transaction analytics
router.get('/analytics', getTransactionAnalytics);

// Get specific transaction
router.get('/:transactionId', getTransactionById);

// Get transactions for a specific teen
router.get('/teen/:teenId', getTeenTransactions);

export default router;
