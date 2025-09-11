// middleware/errorHandler.js
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(400).json({
          success: false,
          message: 'A record with this data already exists',
          field: err.meta?.target,
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          success: false,
          message: 'Foreign key constraint failed',
        });
      default:
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
        });
    }
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum is 5 files',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong!'
        : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
