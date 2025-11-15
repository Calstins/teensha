// teensha/routes/badgeRoutes.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
  createBadge,
  getAllBadges,
  getBadgeById,
  updateBadge,
  deleteBadge,
  getBadgeStats,
} from '../controllers/badgeController.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const badgeValidation = [
  body('challengeId').notEmpty().withMessage('Challenge ID is required'),
  body('name').trim().notEmpty().withMessage('Badge name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('imageUrl').trim().notEmpty().withMessage('Image URL is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  handleValidationErrors,
];

const updateBadgeValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Badge name cannot be empty'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('imageUrl')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Image URL cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  handleValidationErrors,
];

// Get all badges with filters
router.get('/', authenticateUser, getAllBadges);

// Get badge statistics
router.get('/stats', authenticateUser, getBadgeStats);

// Get single badge
router.get('/:badgeId', authenticateUser, getBadgeById);

// Create new badge
router.post('/', authenticateUser, badgeValidation, createBadge);

// Update badge
router.patch('/:badgeId', authenticateUser, updateBadgeValidation, updateBadge);

// Delete badge
router.delete('/:badgeId', authenticateUser, deleteBadge);

export default router;
