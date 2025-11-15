// routes/adminRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import {
  createStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
  createChallenge,
  updateChallenge, // Note: updateChallenge is imported but not used in this file
  publishChallenge,
  getAllChallenges,
} from '../controllers/adminController.js';

// Import from challengeController for additional endpoints
import {
  getChallengeById,
  deleteChallenge,
} from '../controllers/challengeController.js';

const router = express.Router();

// ============================================
// STAFF MANAGEMENT ROUTES
// ============================================

// Admin: Create staff account
router.post(
  '/staff',
  authenticateUser,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 2 }),
    body('role').isIn(['ADMIN', 'STAFF']),
  ],
  createStaff
);

// Admin: Get all staff accounts
router.get('/staff', authenticateUser, requireAdmin, getAllStaff);

// Admin: Update staff account
router.patch(
  '/staff/:userId',
  authenticateUser,
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('role').optional().isIn(['ADMIN', 'STAFF']),
    body('isActive').optional().isBoolean(),
  ],
  updateStaff
);

// Admin: Delete staff account
router.delete('/staff/:userId', authenticateUser, requireAdmin, deleteStaff);

// ============================================
// CHALLENGE MANAGEMENT ROUTES
// ============================================

// Get all challenges (for admin dashboard)
router.get('/challenges', authenticateUser, getAllChallenges);

// Get single challenge by ID
router.get(
  '/challenges/:challengeId',
  authenticateUser,
  [param('challengeId').isString()],
  getChallengeById
);

// Create monthly challenge
router.post(
  '/challenges',
  authenticateUser,
  [
    body('year').isInt({ min: 2020, max: 2030 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('theme').trim().isLength({ min: 3 }),
    body('instructions').trim().isLength({ min: 10 }),
    body('goLiveDate').isISO8601(),
    body('closingDate').isISO8601(),
    body('badgeData').isObject(),
    body('badgeData.name').trim().isLength({ min: 2 }),
    body('badgeData.description').trim().isLength({ min: 5 }),
    body('badgeData.imageUrl').isURL(),
    body('badgeData.price').isFloat({ min: 0 }),
  ],
  createChallenge
);

router.patch(
  '/challenges/:challengeId',
  authenticateUser,
  [
    param('challengeId').isString(),
    body('theme').optional().trim().isLength({ min: 3 }),
    body('instructions').optional().trim().isLength({ min: 10 }),
    body('goLiveDate').optional().isISO8601(),
    body('closingDate').optional().isISO8601(),
    body('badge').optional().isObject(),
    body('badge.name').optional().trim().isLength({ min: 2 }),
    body('badge.description').optional().trim().isLength({ min: 5 }),
    body('badge.imageUrl').optional().isURL(),
    body('badge.price').optional().isFloat({ min: 0 }),
  ],
  updateChallenge
);

// Admin: Publish challenge
router.patch(
  '/challenges/:challengeId/publish',
  authenticateUser,
  requireAdmin,
  [param('challengeId').isString()],
  publishChallenge
);

// Admin: Delete challenge
router.delete(
  '/challenges/:challengeId',
  authenticateUser,
  requireAdmin,
  [param('challengeId').isString()],
  deleteChallenge
);

// ============================================
// DEBUG/TEST ROUTES
// ============================================

// Test route to check database connection
router.get('/test-staff', authenticateUser, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const count = await prisma.user.count();
    const users = await prisma.user.findMany({ take: 5 });
    res.json({
      success: true,
      count,
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
