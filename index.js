// index.js - FIXED VERSION WITH UPLOAD ROUTES
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import prisma from './lib/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';
import progressRoutes from './routes/progessRoutes.js';
import raffleRoutes from './routes/raffleRoutes.js';
import teenRoutes from './routes/teenRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js'; // ✅ ADD THIS
import redirectRoutes from './routes/redirectRoutes.js';
import wellKnownRoutes from './routes/wellKnownRoutes.js';

dotenv.config();

const app = express();

// Make prisma available to routes
app.locals.prisma = prisma;

// App-facing URLs, sourced from .env (see .env.example). Falling back to
// the known-good production values keeps local `npm run dev` working even
// without a .env file present.
const APP_URL = (process.env.APP_URL || 'https://teensha.vercel.app').replace(/\/$/, '');
const ADMIN_URL = (process.env.ADMIN_URL || 'https://teenshapersadmin.vercel.app').replace(/\/$/, '');
app.locals.appUrl = APP_URL;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      ADMIN_URL,
      APP_URL,
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  })
);
app.use(morgan('combined'));

// ✅ IMPORTANT: Webhook route MUST come before express.json()
// Paystack needs raw body for signature verification
app.use(
  '/api/webhooks',
  express.raw({ type: 'application/json' }),
  webhookRoutes
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teen', teenRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/raffle', raffleRoutes);
app.use('/api/admin/transactions', transactionRoutes);
app.use('/api/upload', uploadRoutes); // ✅ ADD THIS ROUTE

// Web bridge pages for links opened from email on mobile (not under /api,
// these render HTML, not JSON)
app.use('/', redirectRoutes);
// Universal Links / App Links verification files (iOS + Android)
app.use('/', wellKnownRoutes);
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TeenShapers API is live!',
    status: 'deployed',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      teen: '/api/teen',
      badges: '/api/badges',
      progress: '/api/progress',
      raffle: '/api/raffle',
      webhooks: '/api/webhooks',
      upload: '/api/upload', 
    },
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'Connected',
      paystack: process.env.PAYSTACK_SECRET_KEY
        ? 'Configured'
        : 'Not Configured',
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`\n📋 Available routes:`);
    console.log(`   Auth: http://localhost:${PORT}/api/auth`);
    console.log(`   Admin: http://localhost:${PORT}/api/admin`);
    console.log(`   Teen: http://localhost:${PORT}/api/teen`);
    console.log(`   Upload: http://localhost:${PORT}/api/upload`);
    console.log(`   Webhooks: http://localhost:${PORT}/api/webhooks`);
  });

  const gracefulShutdown = async (signal) => {
    console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('✅ HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('✅ Database connection closed.');
      } catch (error) {
        console.error('❌ Error closing database connection:', error);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
