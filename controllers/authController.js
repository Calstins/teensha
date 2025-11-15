// controllers/authController.js - STORES CLOUDINARY URL ONLY
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

// Generate JWT token
const generateToken = (id, type) => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    console.log('Attempting login for:', email);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive account',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user.id, 'user');

    console.log('Login successful for:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
    });
  }
};

export const registerTeen = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      email,
      password,
      name,
      age,
      gender,
      state,
      country,
      parentEmail,
      profilePhotoUrl, // ← Receives Cloudinary URL from frontend
    } = req.body;

    console.log('📝 Registering teen:', email);
    console.log(
      'Profile Photo URL:',
      profilePhotoUrl ? '✅ Provided' : '❌ None'
    );

    // Check if teen already exists
    const existingTeen = await prisma.teen.findUnique({
      where: { email },
    });

    if (existingTeen) {
      return res.status(400).json({
        success: false,
        message: 'Teen with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create teen record with Cloudinary URL
    const teen = await prisma.teen.create({
      data: {
        email,
        password: hashedPassword,
        name,
        age,
        gender,
        state,
        country,
        parentEmail,
        profilePhoto: profilePhotoUrl || null, // ← Store URL directly
      },
    });

    // Generate token
    const token = generateToken(teen.id, 'teen');

    console.log('✅ Teen registered successfully:', teen.id);

    res.status(201).json({
      success: true,
      message: 'Teen registered successfully',
      data: {
        teen: {
          id: teen.id,
          email: teen.email,
          name: teen.name,
          age: teen.age,
          gender: teen.gender,
          profilePhoto: teen.profilePhoto, // ← Return URL
        },
        token,
      },
    });
  } catch (error) {
    console.error('Teen registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const loginTeen = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    console.log('🔐 Teen login attempt:', email);

    const teen = await prisma.teen.findUnique({
      where: { email },
    });

    if (!teen || !teen.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive account',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, teen.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(teen.id, 'teen');

    console.log('✅ Teen login successful:', teen.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        teen: {
          id: teen.id,
          email: teen.email,
          name: teen.name,
          age: teen.age,
          gender: teen.gender,
          profilePhoto: teen.profilePhoto, // ← Return URL
        },
        token,
      },
    });
  } catch (error) {
    console.error('Teen login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
