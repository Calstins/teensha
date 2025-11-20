// controllers/authController.js - Enhanced with email verification and password reset
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  generateVerificationToken,
  generatePasswordResetToken,
  verifyToken,
} from '../utils/emailService.js';

// Generate JWT token
const generateToken = (id, type) => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
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
      profilePhotoUrl,
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

    // Generate verification token
    const verificationToken = generateVerificationToken(email);

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
        isEmailVerified: false, // New field
        verificationToken, // Store token temporarily
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error(
        '⚠️ Email sending failed, but registration succeeded:',
        emailError
      );
      // Don't fail registration if email fails
    }

    // Generate auth token (they can use app but with limited features until verified)
    const token = generateToken(teen.id, 'teen');

    console.log('✅ Teen registered successfully:', teen.id);

    res.status(201).json({
      success: true,
      message:
        'Registration successful! Please check your email to verify your account.',
      data: {
        teen: {
          id: teen.id,
          email: teen.email,
          name: teen.name,
          age: teen.age,
          gender: teen.gender,
          profilePhoto: teen.profilePhoto, // ← Return URL
          isEmailVerified: teen.isEmailVerified,
          needsProfileSetup: !profilePhotoUrl, // Flag for profile setup
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
          isEmailVerified: teen.isEmailVerified || false,
          needsProfileSetup: !teen.profilePhoto,
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

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (decoded.type !== 'email-verification') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Find teen by email (token contains email as id for verification)
    const teen = await prisma.teen.findUnique({
      where: { email: decoded.id },
    });

    if (!teen) {
      return res.status(404).json({
        success: false,
        message: 'Teen not found',
      });
    }

    if (teen.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
    }

    // Update teen to verified
    await prisma.teen.update({
      where: { id: teen.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      },
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(teen.email, teen.name);
    } catch (emailError) {
      console.error('⚠️ Welcome email failed:', emailError);
    }

    console.log('✅ Email verified for:', teen.email);

    // Redirect to app with success
    res.redirect(`teenshapers://email-verified?success=true`);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token',
    });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const teen = await prisma.teen.findUnique({
      where: { email },
    });

    if (!teen) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    if (teen.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken(email);

    // Update token
    await prisma.teen.update({
      where: { id: teen.id },
      data: { verificationToken },
    });

    // Send verification email
    await sendVerificationEmail(email, teen.name, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
    });
  }
};

// Request password reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const teen = await prisma.teen.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!teen) {
      return res.json({
        success: true,
        message:
          'If an account exists with this email, a password reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken(teen.id);

    // Store reset token and expiry
    await prisma.teen.update({
      where: { id: teen.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Send password reset email
    await sendPasswordResetEmail(email, teen.name, resetToken);

    console.log('✅ Password reset email sent to:', email);

    res.json({
      success: true,
      message:
        'If an account exists with this email, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Find teen with valid reset token
    const teen = await prisma.teen.findFirst({
      where: {
        id: decoded.id,
        passwordResetToken: token,
        passwordResetExpires: { gte: new Date() },
      },
    });

    if (!teen) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.teen.update({
      where: { id: teen.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    console.log('✅ Password reset successful for:', teen.email);

    res.json({
      success: true,
      message:
        'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to reset password. Token may be invalid or expired.',
    });
  }
};

// Validate reset token (for mobile app to check if token is still valid)
export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Check if token exists and hasn't expired
    const teen = await prisma.teen.findFirst({
      where: {
        id: decoded.id,
        passwordResetToken: token,
        passwordResetExpires: { gte: new Date() },
      },
      select: {
        email: true,
      },
    });

    if (!teen) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: teen.email,
      },
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
