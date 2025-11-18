// utils/validation.js
import { body, param, query, validationResult } from 'express-validator';

// Common validation rules
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Must be a valid email address');

export const validatePassword = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

export const validateName = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters');

export const validateAge = body('age')
  .isInt({ min: 13, max: 19 })
  .withMessage('Age must be between 13 and 19');

export const validateObjectId = (field) =>
  param(field).isMongoId().withMessage(`Invalid ${field} format`);

export const validateYear = (field) =>
  query(field)
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030');

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Task type validation
export const validateTaskType = body('taskType')
  .isIn(['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'])
  .withMessage('Invalid task type');

// Badge status validation
export const validateBadgeStatus = body('status')
  .optional()
  .isIn(['AVAILABLE', 'PURCHASED', 'EARNED'])
  .withMessage('Invalid badge status');

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

export const validateSubmissionStatus = [
  body('status')
    .isIn(['APPROVED', 'REJECTED', 'PENDING'])
    .withMessage('Status must be APPROVED, REJECTED, or PENDING'),
  body('score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Score must be a positive integer'),
  body('reviewNote')
    .optional()
    .isString()
    .withMessage('Review note must be a string'),
];

export const validateChallenge = [
  body('year').isInt({ min: 2024 }).withMessage('Valid year required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
  body('theme').trim().notEmpty().withMessage('Theme is required'),
  body('instructions').trim().notEmpty().withMessage('Instructions required'),
  body('goLiveDate').isISO8601().withMessage('Valid go live date required'),
  body('closingDate').isISO8601().withMessage('Valid closing date required'),
];

export const validateTask = [
  body('challengeId').isMongoId().withMessage('Valid challenge ID required'),
  body('tabName').trim().notEmpty().withMessage('Tab name is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('taskType')
    .isIn(['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'])
    .withMessage('Valid task type required'),
];
