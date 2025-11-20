// utils/emailService.js
// Complete email service for TeenShapers authentication
// Handles verification emails, password reset emails, and welcome emails

import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

/**
 * Create and configure email transporter
 * @returns {object} Nodemailer transporter instance
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // e.g., 'gmail', 'outlook', 'yahoo'
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
    },
  });
};

/**
 * Generate email verification token
 * @param {string} teenId - Teen's email address (used as ID for verification)
 * @returns {string} JWT token valid for 24 hours
 */
export const generateVerificationToken = (teenId) => {
  return jwt.sign(
    { id: teenId, type: 'email-verification' },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h',
    }
  );
};

/**
 * Generate password reset token
 * @param {string} teenId - Teen's unique ID
 * @returns {string} JWT token valid for 1 hour
 */
export const generatePasswordResetToken = (teenId) => {
  return jwt.sign(
    { id: teenId, type: 'password-reset' },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );
};

/**
 * Verify JWT token
 * @param {string} token - Token to verify
 * @returns {object} Decoded token data
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Send email verification link to user
 * @param {string} email - Recipient email address
 * @param {string} name - User's name for personalization
 * @param {string} verificationToken - JWT verification token
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
export const sendVerificationEmail = async (email, name, verificationToken) => {
  const transporter = createTransporter();

  const verificationUrl = `${
    process.env.APP_URL || 'https://teensha.vercel.app'
  }/api/auth/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"TeenShapers" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your TeenShapers Account 🎉',
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              font-size: 22px;
              margin-top: 0;
            }
            .content p {
              color: #555;
              font-size: 16px;
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 25px 0;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .link-text {
              word-break: break-all;
              color: #667eea;
              font-size: 14px;
              background: #f0f0f0;
              padding: 12px;
              border-radius: 6px;
              margin: 15px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning p {
              margin: 0;
              color: #856404;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              padding: 20px 30px;
              background: #f9f9f9;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 10px;
              }
              .header, .content, .footer {
                padding: 20px 15px;
              }
              .button {
                display: block;
                width: 100%;
                text-align: center;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TeenShapers! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              <p>Thank you for joining TeenShapers! We're excited to have you on board and can't wait to see you grow and achieve amazing things.</p>
              <p>To complete your registration and unlock all features, please verify your email address by clicking the button below:</p>
              
              <center>
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </center>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">Or copy and paste this link into your browser:</p>
              <div class="link-text">${verificationUrl}</div>
              
              <div class="warning">
                <p><strong>⏰ Important:</strong> This verification link will expire in 24 hours for security purposes.</p>
              </div>
              
              <p>Once verified, you'll be able to:</p>
              <ul style="color: #555; line-height: 1.8;">
                <li>🎯 Participate in monthly challenges</li>
                <li>🏆 Earn badges and rewards</li>
                <li>📊 Track your progress</li>
                <li>👥 Join the community leaderboard</li>
              </ul>
              
              <p style="margin-top: 25px;">If you didn't create an account with TeenShapers, please ignore this email or contact our support team.</p>
            </div>
            <div class="footer">
              <p><strong>TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    // Plain text fallback
    text: `
      Welcome to TeenShapers!
      
      Hi ${name},
      
      Thank you for joining TeenShapers! To complete your registration, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with TeenShapers, please ignore this email.
      
      © ${new Date().getFullYear()} TeenShapers. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset link to user
 * @param {string} email - Recipient email address
 * @param {string} name - User's name for personalization
 * @param {string} resetToken - JWT password reset token
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
export const sendPasswordResetEmail = async (email, name, resetToken) => {
  const transporter = createTransporter();

  // For mobile app deep linking
  const resetUrl = `teenshapers://reset-password?token=${resetToken}`;
  // Fallback web URL
  const webResetUrl = `${
    process.env.APP_URL || 'https://teensha.vercel.app'
  }/api/auth/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"TeenShapers" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your TeenShapers Password 🔐',
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              font-size: 22px;
              margin-top: 0;
            }
            .content p {
              color: #555;
              font-size: 16px;
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 25px 0;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .link-text {
              word-break: break-all;
              color: #667eea;
              font-size: 14px;
              background: #f0f0f0;
              padding: 12px;
              border-radius: 6px;
              margin: 15px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-title {
              font-weight: 700;
              color: #856404;
              margin: 0 0 10px 0;
            }
            .warning ul {
              margin: 10px 0;
              padding-left: 20px;
              color: #856404;
            }
            .warning li {
              margin: 5px 0;
            }
            .footer {
              text-align: center;
              padding: 20px 30px;
              background: #f9f9f9;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 10px;
              }
              .header, .content, .footer {
                padding: 20px 15px;
              }
              .button {
                display: block;
                width: 100%;
                text-align: center;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request 🔐</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset your password for your TeenShapers account. No worries - it happens to everyone!</p>
              <p>Click the button below to reset your password:</p>
              
              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <div class="link-text">${resetUrl}</div>
              
              <div class="warning">
                <p class="warning-title">⚠️ Important Security Information</p>
                <ul>
                  <li><strong>This link will expire in 1 hour</strong> for your security</li>
                  <li>If you didn't request this reset, please ignore this email - your account is safe</li>
                  <li>Never share this link with anyone</li>
                  <li>TeenShapers will never ask for your password via email</li>
                </ul>
              </div>
              
              <p style="margin-top: 25px; color: #555;">After resetting your password, you'll be able to sign in with your new credentials.</p>
              
              <p style="color: #999; font-size: 14px; margin-top: 25px;">If you're having trouble, please contact our support team for assistance.</p>
            </div>
            <div class="footer">
              <p><strong>TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    // Plain text fallback
    text: `
      Password Reset Request
      
      Hi ${name},
      
      We received a request to reset your password for your TeenShapers account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour for your security.
      
      If you didn't request this reset, please ignore this email - your account is safe.
      
      © ${new Date().getFullYear()} TeenShapers. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send welcome email after successful verification
 * @param {string} email - Recipient email address
 * @param {string} name - User's name for personalization
 * @returns {Promise<void>}
 */
export const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"TeenShapers" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to TeenShapers! You're All Set! 🎉",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              font-size: 24px;
              margin-top: 0;
            }
            .content p {
              color: #555;
              font-size: 16px;
              margin: 15px 0;
            }
            .feature {
              background: white;
              padding: 20px;
              margin: 15px 0;
              border-radius: 8px;
              border-left: 4px solid #667eea;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .feature-title {
              color: #667eea;
              font-weight: 700;
              font-size: 18px;
              margin: 0 0 8px 0;
            }
            .feature p {
              margin: 0;
              color: #666;
              font-size: 15px;
            }
            .stats {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .stats p {
              margin: 5px 0;
              color: #666;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              padding: 20px 30px;
              background: #f9f9f9;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 10px;
              }
              .header, .content, .footer {
                padding: 20px 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're All Set! </h1>
            </div>
            <div class="content">
              <h2>Welcome aboard, ${name}!</h2>
              <p>Your email has been verified and your account is now fully active. You're ready to start your journey with TeenShapers!</p>
              
              <p style="font-size: 18px; font-weight: 600; color: #667eea; margin: 30px 0 20px 0;">What's Next?</p>
              
              <div class="feature">
                <div class="feature-title">📱 Complete Your Profile</div>
                <p>Add a profile photo and customize your settings to get the most out of TeenShapers and connect with the community.</p>
              </div>
              
              <div class="feature">
                <div class="feature-title">Join Your First Challenge</div>
                <p>Check out the current monthly challenge and start earning badges! Each challenge is designed to help you grow and learn.</p>
              </div>
              
              <div class="feature">
                <div class="feature-title">🏆 Track Your Progress</div>
                <p>Monitor your achievements, see how you rank on the leaderboard, and celebrate your wins with the community.</p>
              </div>
              
              <div class="feature">
                <div class="feature-title">👥 Join the Community</div>
                <p>Connect with other teens, share your experiences, and inspire others on their journey to excellence.</p>
              </div>
              
              <div class="stats">
                <p><strong>Did you know?</strong></p>
                <p>TeenShapers has helped thousands of teens achieve their goals and earn recognition for their hard work!</p>
              </div>
              
              <p style="margin-top: 30px;">If you have any questions or need help getting started, our support team is always here for you.</p>
              
              <p style="font-weight: 600; color: #667eea; margin-top: 25px;">Happy shaping! </p>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px;">P.S. Make sure to enable notifications so you never miss important updates about new challenges and achievements!</p>
            </div>
            <div class="footer">
              <p><strong>TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    // Plain text fallback
    text: `
      You're All Set!
      
      Welcome aboard, ${name}!
      
      Your email has been verified and your account is now fully active. You're ready to start your journey with TeenShapers!
      
      What's Next?
      
      Complete Your Profile
      Add a profile photo and customize your settings.
      
      Join Your First Challenge
      Check out the current monthly challenge and start earning badges!
      
    Track Your Progress
      Monitor your achievements and see how you rank on the leaderboard.
      
      👥 Join the Community
      Connect with other teens and share your experiences.
      
      If you have any questions, our support team is always here for you.
      
      Happy shaping! 
      
      © ${new Date().getFullYear()} TeenShapers. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('⚠️ Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
  }
};

/**
 * Send a test email to verify configuration
 * @param {string} email - Test email recipient
 * @returns {Promise<boolean>} True if successful
 */
export const sendTestEmail = async (email) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"TeenShapers" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'TeenShapers Email Configuration Test ✅',
    html: `
      <h2>Email Configuration Successful!</h2>
      <p>If you're seeing this email, your TeenShapers email service is configured correctly.</p>
      <p><strong>Configuration Details:</strong></p>
      <ul>
        <li>Service: ${process.env.EMAIL_SERVICE || 'gmail'}</li>
        <li>From: ${process.env.EMAIL_USER}</li>
        <li>Time: ${new Date().toISOString()}</li>
      </ul>
      <p>You're all set to send verification and password reset emails!</p>
    `,
    text: `
      Email Configuration Successful!
      
      If you're seeing this email, your TeenShapers email service is configured correctly.
      
      Service: ${process.env.EMAIL_SERVICE || 'gmail'}
      From: ${process.env.EMAIL_USER}
      Time: ${new Date().toISOString()}
      
      You're all set to send verification and password reset emails!
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Test email failed:', error);
    return false;
  }
};

// Default export with all functions
export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendTestEmail,
  generateVerificationToken,
  generatePasswordResetToken,
  verifyToken,
};
