// controllers/notificationController.js
import prisma from '../lib/prisma.js';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Register teen's push notification token
 */
export const registerPushToken = async (req, res) => {
  try {
    const { expoPushToken, deviceType } = req.body;
    const teenId = req.teen.id;

    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Expo push token',
      });
    }

    // Store or update push token
    await prisma.pushToken.upsert({
      where: {
        teenId,
      },
      update: {
        token: expoPushToken,
        deviceType,
        updatedAt: new Date(),
      },
      create: {
        teenId,
        token: expoPushToken,
        deviceType,
      },
    });

    res.json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Unregister teen's push notification token
 */
export const unregisterPushToken = async (req, res) => {
  try {
    const teenId = req.teen.id;

    await prisma.pushToken.deleteMany({
      where: { teenId },
    });

    res.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Send push notification to specific teen
 */
export const sendNotificationToTeen = async (
  teenId,
  title,
  body,
  data = {}
) => {
  try {
    const pushToken = await prisma.pushToken.findUnique({
      where: { teenId },
    });

    if (!pushToken || !Expo.isExpoPushToken(pushToken.token)) {
      console.log(`No valid push token for teen ${teenId}`);
      return false;
    }

    const message = {
      to: pushToken.token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    };

    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log('✅ Notification sent:', ticket);

    // Store notification in database
    await prisma.notification.create({
      data: {
        teenId,
        title,
        body,
        data,
        status: 'SENT',
      },
    });

    return true;
  } catch (error) {
    console.error('Send notification error:', error);
    return false;
  }
};

/**
 * Send push notification to all active teens
 */
export const sendNotificationToAllTeensMobile = async (
  title,
  body,
  data = {}
) => {
  try {
    const pushTokens = await prisma.pushToken.findMany({
      where: {
        teen: {
          isActive: true,
        },
      },
    });

    const messages = pushTokens
      .filter((pt) => Expo.isExpoPushToken(pt.token))
      .map((pt) => ({
        to: pt.token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      }));

    // Send in chunks of 100 (Expo's limit)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    // Store notifications in database
    await Promise.all(
      pushTokens.map((pt) =>
        prisma.notification.create({
          data: {
            teenId: pt.teenId,
            title,
            body,
            data,
            status: 'SENT',
          },
        })
      )
    );

    console.log(`✅ Sent ${tickets.length} notifications`);
    return tickets.length;
  } catch (error) {
    console.error('Send bulk notification error:', error);
    return 0;
  }
};

/**
 * Get teen's notification history
 */
export const getNotificationHistory = async (req, res) => {
  try {
    const teenId = req.teen.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { teenId },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({
        where: { teenId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const teenId = req.teen.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        teenId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const teenId = req.teen.id;

    await prisma.notification.updateMany({
      where: {
        teenId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
