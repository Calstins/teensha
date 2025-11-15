// middleware/auth.js
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Authentication middleware for teens
export const authenticateTeen = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'teen') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid token type.',
      });
    }

    const teen = await prisma.teen.findUnique({
      where: { id: decoded.id },
    });

    if (!teen || !teen.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive account.',
      });
    }

    req.teen = teen;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

// Authentication middleware for admin/staff
export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid token type.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive account.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

// Admin authorization middleware
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};
