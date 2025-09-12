// index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import prisma from './lib/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';
import teenRoutes from './routes/teenRoutes.js';
import progressRoutes from './routes/progessRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import raffleRoutes from './routes/raffleRoutes.js';

dotenv.config();

const app = express();

// Make prisma available to routes
app.locals.prisma = prisma;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: ['https://teenshapersadmin.vercel.app', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/teens', teenRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/raffle', raffleRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TeenShapers API is live on Vercel!',
    status: 'deployed',
    timestamp: new Date().toISOString(),
    documentation: 'Visit /api/test for more details',
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

// ADD THIS SECTION - Start the server
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
  // Only start server in development (not on Vercel)
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown for development
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

// Export for Vercel
export default app;
