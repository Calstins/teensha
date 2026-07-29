// utils/notifications.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM =
  process.env.EMAIL_FROM || 'TeenShapers <onboarding@resend.dev>';

/**
 * Send notification to all active teens when a challenge is published
 * This is a placeholder implementation - you can extend it with:
 * - Email notifications
 * - Push notifications
 * - SMS notifications
 * - In-app notifications
 */

export const sendEmail = async (to, subject, html) => {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) throw error;
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email send error:', error);
  }
};

export const sendChallengeNotification = async (challenge) => {
  try {
    console.log('📢 Sending challenge notifications...');

    // Get all active teens
    const activeTeens = await prisma.teen.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`📧 Found ${activeTeens.length} active teens to notify`);

    // Create notification records (if you have a Notification model)
    // For now, we'll just log it
    const notificationPromises = activeTeens.map(async (teen) => {
      // TODO: Implement your notification logic here
      // Examples:
      // - Send email using Resend (see sendEmail() above)
      // - Send push notification using Firebase Cloud Messaging
      // - Create in-app notification record

      console.log(
        `✉️ Notifying ${teen.name} (${teen.email}) about new challenge: ${challenge.theme}`
      );

      // Example email content:
      const emailData = {
        to: teen.email,
        subject: `🎯 New Challenge Available: ${challenge.theme}`,
        body: `
          Hi ${teen.name},
          
          A new monthly challenge is now available!
          
          Challenge: ${challenge.theme}
          Month: ${new Date(
            challenge.year,
            challenge.month - 1
          ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          
          ${challenge.instructions}
          
          Badge: ${challenge.badge?.name || 'Not available'}
          Price: ₦${challenge.badge?.price || 0}
          
          Go Live Date: ${new Date(challenge.goLiveDate).toLocaleDateString()}
          Closing Date: ${new Date(challenge.closingDate).toLocaleDateString()}
          
          Log in to your TeenShapers account to get started!
          
          Best regards,
          TeenShapers Team
        `,
      };

      // TODO: Actually send the email
      // await sendEmail(emailData);

      return {
        teenId: teen.id,
        status: 'sent',
        notifiedAt: new Date(),
      };
    });

    const results = await Promise.allSettled(notificationPromises);

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `✅ Notifications sent: ${successCount} succeeded, ${failureCount} failed`
    );

    return {
      success: true,
      totalTeens: activeTeens.length,
      notificationsSent: successCount,
      notificationsFailed: failureCount,
    };
  } catch (error) {
    console.error('❌ Error sending challenge notifications:', error);
    throw error;
  }
};

/**
 * Send notification when a challenge is updated
 */
export const sendChallengeUpdateNotification = async (challenge) => {
  try {
    console.log('📢 Sending challenge update notifications...');

    // Get teens who have already started this challenge
    const participants = await prisma.teenProgress.findMany({
      where: {
        challengeId: challenge.id,
      },
      include: {
        teen: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    const activeParticipants = participants.filter((p) => p.teen.isActive);

    console.log(
      `📧 Found ${activeParticipants.length} participants to notify about update`
    );

    // Send notifications
    const notificationPromises = activeParticipants.map(async (participant) => {
      console.log(
        `✉️ Notifying ${participant.teen.name} about challenge update`
      );

      // TODO: Implement notification logic
      return {
        teenId: participant.teen.id,
        status: 'sent',
      };
    });

    await Promise.allSettled(notificationPromises);

    return {
      success: true,
      notificationsSent: activeParticipants.length,
    };
  } catch (error) {
    console.error('❌ Error sending update notifications:', error);
    throw error;
  }
};

/**
 * Send reminder notification before challenge closes
 */
export const sendChallengeReminderNotification = async (
  challenge,
  daysRemaining
) => {
  try {
    console.log(
      `📢 Sending challenge reminder (${daysRemaining} days remaining)...`
    );

    // Get participants who haven't completed the challenge
    const incompleteProgress = await prisma.teenProgress.findMany({
      where: {
        challengeId: challenge.id,
        percentage: {
          lt: 100,
        },
      },
      include: {
        teen: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    const activeParticipants = incompleteProgress.filter(
      (p) => p.teen.isActive
    );

    console.log(`📧 Sending reminder to ${activeParticipants.length} teens`);

    // Send reminders
    const notificationPromises = activeParticipants.map(async (participant) => {
      console.log(
        `✉️ Reminding ${participant.teen.name} - ${participant.percentage}% complete`
      );

      // TODO: Implement notification logic
      return {
        teenId: participant.teen.id,
        status: 'sent',
      };
    });

    await Promise.allSettled(notificationPromises);

    return {
      success: true,
      remindersSent: activeParticipants.length,
    };
  } catch (error) {
    console.error('❌ Error sending reminder notifications:', error);
    throw error;
  }
};

/**
 * Send congratulations notification when teen completes a challenge
 */
export const sendChallengeCompletionNotification = async (
  teenId,
  challenge
) => {
  try {
    const teen = await prisma.teen.findUnique({
      where: { id: teenId },
      select: {
        email: true,
        name: true,
      },
    });

    if (!teen) return;

    console.log(`🎉 Sending completion notification to ${teen.name}`);

    // TODO: Send congratulations email/notification
    const emailData = {
      to: teen.email,
      subject: `🎉 Congratulations! You completed the ${challenge.theme} challenge!`,
      body: `
        Congratulations ${teen.name}!
        
        You've successfully completed the ${challenge.theme} challenge!
        
        Don't forget to purchase your badge to be eligible for the annual raffle draw.
        
        Keep up the great work!
        
        TeenShapers Team
      `,
    };

    // TODO: Actually send the email
    // await sendEmail(emailData);

    return {
      success: true,
    };
  } catch (error) {
    console.error('❌ Error sending completion notification:', error);
    throw error;
  }
};

// Export all notification functions
export default {
  sendChallengeNotification,
  sendChallengeUpdateNotification,
  sendChallengeReminderNotification,
  sendChallengeCompletionNotification,
};
