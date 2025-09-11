// utils/validation.js
import { body, param, query } from 'express-validator';

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

// Submission status validation
export const validateSubmissionStatus = body('status')
  .optional()
  .isIn(['PENDING', 'APPROVED', 'REJECTED'])
  .withMessage('Invalid submission status');
