// controllers/paystackWebhookController.js
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { updateRaffleEligibilityHelper } from '../utils/helpers.js';

export const handlePaystackWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid webhook signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = req.body;
    console.log('Paystack webhook event:', event.event);

    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulCharge(event.data);
        break;

      case 'charge.failed':
        await handleFailedCharge(event.data);
        break;

      case 'transfer.success':
        console.log('Transfer successful:', event.data.reference);
        break;

      case 'transfer.failed':
        console.log('Transfer failed:', event.data.reference);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

async function handleSuccessfulCharge(data) {
  try {
    const { reference, metadata, amount, customer, paid_at } = data;
    const { badgeId, challengeId, teenId } = metadata;

    console.log(`Processing successful charge for badge ${badgeId}`);

    // Get badge details
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        challenge: {
          select: {
            year: true,
          },
        },
      },
    });

    if (!badge) {
      console.error('Badge not found:', badgeId);
      return;
    }

    // Create or update transaction record
    await prisma.transaction.upsert({
      where: { reference },
      create: {
        reference,
        teenId,
        badgeId,
        amount: amount / 100, // Convert from kobo to naira
        currency: 'NGN',
        status: 'SUCCESS',
        paymentMethod: data.channel,
        customerEmail: customer.email,
        metadata: JSON.stringify(metadata),
        paidAt: new Date(paid_at),
      },
      update: {
        status: 'SUCCESS',
        paidAt: new Date(paid_at),
      },
    });

    // Update teen badge record
    const teenBadge = await prisma.teenBadge.upsert({
      where: {
        teenId_badgeId: {
          teenId,
          badgeId,
        },
      },
      update: {
        status: 'PURCHASED',
        purchasedAt: new Date(paid_at),
      },
      create: {
        teenId,
        badgeId,
        status: 'PURCHASED',
        purchasedAt: new Date(paid_at),
      },
    });

    // Check if teen completed the challenge
    const progress = await prisma.teenProgress.findUnique({
      where: {
        teenId_challengeId: {
          teenId,
          challengeId,
        },
      },
    });

    if (progress && progress.percentage === 100) {
      await prisma.teenBadge.update({
        where: { id: teenBadge.id },
        data: {
          status: 'EARNED',
          earnedAt: new Date(),
        },
      });
    }

    // Update raffle eligibility
    await updateRaffleEligibilityHelper(teenId, badge.challenge.year);

    console.log(`Badge purchase completed for teen ${teenId}`);
  } catch (error) {
    console.error('Error handling successful charge:', error);
  }
}

async function handleFailedCharge(data) {
  try {
    const { reference, metadata } = data;

    console.log(`Processing failed charge: ${reference}`);

    // Create transaction record with failed status
    await prisma.transaction.create({
      data: {
        reference,
        teenId: metadata.teenId,
        badgeId: metadata.badgeId,
        amount: 0,
        currency: 'NGN',
        status: 'FAILED',
        metadata: JSON.stringify(metadata),
      },
    });

    console.log(`Failed transaction recorded: ${reference}`);
  } catch (error) {
    console.error('Error handling failed charge:', error);
  }
}

export default {
  handlePaystackWebhook,
};
