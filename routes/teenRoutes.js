import express from 'express';
import {
  validateName,
  validateAge,
  validatePagination,
} from '../utils/validation.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticateTeen, authenticateUser } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  getDashboard,
  getTeensList,
  getTeenDetails,
} from '../controllers/teenController.js';

const router = express.Router();

// Get teen profile
router.get('/profile', authenticateTeen, getProfile);

// Update teen profile
router.patch(
  '/profile',
  authenticateTeen,
  [validateName.optional(), validateAge.optional(), handleValidationErrors],
  updateProfile
);

// Get teen's dashboard summary
router.get('/dashboard', authenticateTeen, getDashboard);

// Admin: Get teen list with filters
router.get('/', authenticateUser, validatePagination, getTeensList);

// Admin: Get detailed teen profile
router.get('/:teenId', authenticateUser, getTeenDetails);

export default router;
