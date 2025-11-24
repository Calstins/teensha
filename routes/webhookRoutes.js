// routes/webhookRoutes.js
import express from 'express';
import { handlePaystackWebhook } from '../controllers/paystackWebhookController.js';

const router = express.Router();

// Paystack webhook endpoint (no auth required)
router.post('/paystack', handlePaystackWebhook);

export default router;
