// routes/authRoutes.js
import express from 'express';
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
} from '../controllers/authController.js';
const router = express.Router();

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

// Admin/Staff Login
router.post(
  '/user/login',
  [validateEmail, validatePassword, handleValidationErrors],
  loginUser
);

export default router;
