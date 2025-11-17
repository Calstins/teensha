// index.js
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

dotenv.config();

const app = express();

// Make prisma available to routes
app.locals.prisma = prisma;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      'https://teenshapersadmin.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teen', teenRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/raffle', raffleRoutes);

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
    },
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasDB: !!process.env.DATABASE_URL,
    hasJWT: !!process.env.JWT_SECRET,
    deployment: process.env.VERCEL ? 'Vercel' : 'Local',
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
