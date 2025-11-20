// routes/authRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  validateEmail,
  validatePassword,
  validateName,
  validateAge,
} from '../utils/validation.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  registerTeen,
  loginTeen,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  validateResetToken,
} from '../controllers/authController.js';

const router = express.Router();

// ============================================
// TEEN AUTHENTICATION ROUTES
// ============================================

// Teen Registration
router.post(
  '/teen/register',
  [
    validateEmail,
    validatePassword,
    validateName,
    validateAge,
    handleValidationErrors,
  ],
  registerTeen
);

// Teen Login
router.post(
  '/teen/login',
  [validateEmail, validatePassword, handleValidationErrors],
  loginTeen
);

// Email Verification
router.get('/verify-email', verifyEmail);

// Resend Verification Email
router.post(
  '/resend-verification',
  [validateEmail, handleValidationErrors],
  resendVerification
);

// Forgot Password Request
router.post(
  '/forgot-password',
  [validateEmail, handleValidationErrors],
  forgotPassword
);

// Reset Password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    handleValidationErrors,
  ],
  resetPassword
);

// Validate Reset Token (for mobile app)
router.get('/validate-reset-token', validateResetToken);

// ============================================
// ADMIN/STAFF AUTHENTICATION ROUTES
// ============================================

// Admin/Staff Login
router.post(
  '/user/login',
  [validateEmail, validatePassword, handleValidationErrors],
  loginUser
);

export default router;
