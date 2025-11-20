// utils/emailService.js
// Complete email service for TeenShapers authentication
// Handles verification emails, password reset emails, and welcome emails
// Updated with TeenShapers brand colors and fonts

import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

/**
 * Create and configure email transporter
 * @returns {object} Nodemailer transporter instance
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const generateVerificationToken = (teenId) => {
  return jwt.sign(
    { id: teenId, type: 'email-verification' },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h',
    }
  );
};

export const generatePasswordResetToken = (teenId) => {
  return jwt.sign(
    { id: teenId, type: 'password-reset' },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const getEmailStyles = () => `
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #111827;
    margin: 0;
    padding: 0;
    background-color: #F9FAFB;
  }
  .container {
    max-width: 600px;
    margin: 20px auto;
    background: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #FF6B35 0%, #E6542A 100%);
    color: white;
    padding: 40px 30px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-family: 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
    font-size: 28px;
    font-weight: 800;
  }
  .content {
    padding: 40px 30px;
  }
  .content h2 {
    color: #111827;
    font-family: 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
    font-size: 22px;
    font-weight: 700;
    margin-top: 0;
  }
  .content p {
    color: #4B5563;
    font-size: 16px;
    margin: 15px 0;
  }
  .button {
    display: inline-block;
    padding: 15px 40px;
    background: linear-gradient(135deg, #FF6B35 0%, #E6542A 100%);
    color: white !important;
    text-decoration: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 16px;
    margin: 25px 0;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
  }
  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(255, 107, 53, 0.4);
  }
  .link-text {
    word-break: break-all;
    color: #FF6B35;
    font-size: 14px;
    background: #FFF5F2;
    padding: 12px;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #FFEBE4;
  }
  .warning {
    background: #FFFBEB;
    border-left: 4px solid #F59E0B;
    padding: 15px;
    margin: 20px 0;
    border-radius: 8px;
  }
  .warning p {
    margin: 0;
    color: #92400E;
    font-size: 14px;
  }
  .warning-title {
    font-weight: 700;
    color: #92400E;
    margin: 0 0 10px 0;
  }
  .warning ul {
    margin: 10px 0;
    padding-left: 20px;
    color: #92400E;
  }
  .warning li {
    margin: 5px 0;
  }
  .feature {
    background: #FFF5F2;
    padding: 20px;
    margin: 15px 0;
    border-radius: 12px;
    border-left: 4px solid #FF6B35;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .feature-title {
    color: #FF6B35;
    font-weight: 700;
    font-size: 18px;
    margin: 0 0 8px 0;
    font-family: 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
  }
  .feature p {
    margin: 0;
    color: #4B5563;
    font-size: 15px;
  }
  .stats {
    background: #FFEBE4;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    text-align: center;
    border: 2px solid #FFD6C7;
  }
  .stats p {
    margin: 5px 0;
    color: #4B5563;
    font-size: 14px;
  }
  .footer {
    text-align: center;
    padding: 20px 30px;
    background: #F9FAFB;
    color: #6B7280;
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
`;

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
            ${getEmailStyles()}
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
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">Or copy and paste this link into your browser:</p>
              <div class="link-text">${verificationUrl}</div>
              
              <div class="warning">
                <p><strong>⏰ Important:</strong> This verification link will expire in 24 hours for security purposes.</p>
              </div>
              
              <p>Once verified, you'll be able to:</p>
              <ul style="color: #4B5563; line-height: 1.8;">
                <li>🎯 Participate in monthly challenges</li>
                <li>🏆 Earn badges and rewards</li>
                <li>📊 Track your progress</li>
                <li>👥 Join the community leaderboard</li>
              </ul>
              
              <p style="margin-top: 25px;">If you didn't create an account with TeenShapers, please ignore this email or contact our support team.</p>
            </div>
            <div class="footer">
              <p><strong style="color: #FF6B35;">TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #9CA3AF;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
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

export const sendPasswordResetEmail = async (email, name, resetToken) => {
  const transporter = createTransporter();

  // For mobile app deep linking
  const resetUrl = `teenshapers://reset-password?token=${resetToken}`;
  // Fallback web URL
  const webResetUrl = `${
    process.env.APP_URL || 'https://teensha.vercel.app'
  }/reset-password?token=${resetToken}`;

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
            ${getEmailStyles()}
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
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">If the button doesn't work, copy and paste this link into your browser:</p>
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
              
              <p style="margin-top: 25px; color: #4B5563;">After resetting your password, you'll be able to sign in with your new credentials.</p>
              
              <p style="color: #9CA3AF; font-size: 14px; margin-top: 25px;">If you're having trouble, please contact our support team for assistance.</p>
            </div>
            <div class="footer">
              <p><strong style="color: #FF6B35;">TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #9CA3AF;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
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
            ${getEmailStyles()}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're All Set! 🚀</h1>
            </div>
            <div class="content">
              <h2>Welcome aboard, ${name}!</h2>
              <p>Your email has been verified and your account is now fully active. You're ready to start your journey with TeenShapers!</p>
              
              <p style="font-size: 18px; font-weight: 700; color: #FF6B35; margin: 30px 0 20px 0; font-family: 'Trebuchet MS', 'Lucida Grande', sans-serif;">What's Next?</p>
              
              <div class="feature">
                <div class="feature-title">📱 Complete Your Profile</div>
                <p>Add a profile photo and customize your settings to get the most out of TeenShapers and connect with the community.</p>
              </div>
              
              <div class="feature">
                <div class="feature-title">🎯 Join Your First Challenge</div>
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
              
              <p style="font-weight: 700; color: #FF6B35; margin-top: 25px;">Happy shaping! 🎉</p>
              
              <p style="color: #9CA3AF; font-size: 14px; margin-top: 30px;">P.S. Make sure to enable notifications so you never miss important updates about new challenges and achievements!</p>
            </div>
            <div class="footer">
              <p><strong style="color: #FF6B35;">TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #9CA3AF;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
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
      
      📱 Complete Your Profile
      Add a profile photo and customize your settings.
      
      🎯 Join Your First Challenge
      Check out the current monthly challenge and start earning badges!
      
      🏆 Track Your Progress
      Monitor your achievements and see how you rank on the leaderboard.
      
      👥 Join the Community
      Connect with other teens and share your experiences.
      
      If you have any questions, our support team is always here for you.
      
      Happy shaping! 🎉
      
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

export const sendTestEmail = async (email) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"TeenShapers" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'TeenShapers Email Configuration Test ✅',
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${getEmailStyles()}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Configuration Test ✅</h1>
            </div>
            <div class="content">
              <h2>Configuration Successful!</h2>
              <p>If you're seeing this email, your TeenShapers email service is configured correctly.</p>
              
              <div class="feature">
                <div class="feature-title">📧 Configuration Details</div>
                <p><strong>Service:</strong> ${
                  process.env.EMAIL_SERVICE || 'gmail'
                }</p>
                <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
              </div>
              
              <p style="font-weight: 700; color: #10B981; margin-top: 25px;">✅ You're all set to send verification and password reset emails!</p>
            </div>
            <div class="footer">
              <p><strong style="color: #FF6B35;">TeenShapers</strong></p>
              <p>Shaping the future, one teen at a time</p>
              <p style="margin-top: 15px; color: #9CA3AF;">© ${new Date().getFullYear()} TeenShapers. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
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
