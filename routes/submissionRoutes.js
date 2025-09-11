import express from 'express';
import { validateSubmissionStatus } from '../utils/validation.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticateTeen, authenticateUser } from '../middleware/auth.js';
import {
  submitTaskResponse,
  getMySubmissions,
  getReviewQueue,
  reviewSubmission,
} from '../controllers/submissionController.js';
import { upload } from '../utils/multerConfig.js';

const router = express.Router();

// Submit task response
router.post(
  '/',
  authenticateTeen,
  upload.array('files', 5),
  submitTaskResponse
);

// Get teen's submissions for current challenge
router.get('/my-submissions', authenticateTeen, getMySubmissions);

// Admin/Staff: Get submissions for review
router.get('/review-queue', authenticateUser, getReviewQueue);

// Admin/Staff: Review submission
router.patch(
  '/:submissionId/review',
  authenticateUser,
  [validateSubmissionStatus, handleValidationErrors],
  reviewSubmission
);

export default router;
