// routes/taskRoutes.js
import express from 'express';
import { authenticateTeen } from '../middleware/auth.js';
import { getTaskDetails } from '../controllers/taskController.js';

const router = express.Router();

// Get specific task details
router.get('/:taskId', authenticateTeen, getTaskDetails);

export default router;
