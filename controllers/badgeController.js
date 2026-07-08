// controllers/badgeController.js - UPDATED WITH PAYSTACK
import { validationResult } from 'express-validator';
import { updateRaffleEligibilityHelper } from '../utils/helpers.js';
import { handleValidationErrors } from '../middleware/validation.js';
import prisma from '../lib/prisma.js';
import Paystack from 'paystack-api';

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

// ============================================
// ADMIN BADGE MANAGEMENT
// ============================================

export const createBadge = async (req, res) => {
  try {
    handleValidationErrors(req, res, () => {});

    const { challengeId, name, description, imageUrl, price } = req.body;

    // Check if challenge exists
    const challenge = await prisma.monthlyChallenge.findUnique({
      where: { id: challengeId },
      include: { badge: true },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }

    // Check if badge already exists for this challenge
    if (challenge.badge) {
      return res.status(400).json({
        success: false,
        message: `A badge already exists for this challenge (${challenge.theme}). Each challenge can only have one badge. Please update the existing badge instead.`,
      });
    }

    const badge = await prisma.badge.create({
      data: {
        challengeId,
        name,
        description,
        imageUrl,
        price: parseFloat(price),
        isActive: true,
      },
      include: {
        challenge: {
          select: {
            theme: true,
            year: true,
            month: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Badge created successfully',
      data: badge,
    });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getAllBadges = async (req, res) => {
  try {
    const { year, month, search } = req.query;

    // Build where clause for challenges
    const challengeWhere = {};
    if (year) challengeWhere.year = parseInt(year);
    if (month) challengeWhere.month = parseInt(month);

    // Get all challenges matching criteria
    const challenges = await prisma.monthlyChallenge.findMany({
      where: challengeWhere,
      select: { id: true },
    });

    const challengeIds = challenges.map((c) => c.id);

    // Build badge where clause
    const badgeWhere = {};
    if (challengeIds.length > 0) {
      badgeWhere.challengeId = { in: challengeIds };
    }

    if (search) {
      badgeWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const badges = await prisma.badge.findMany({
      where: badgeWhere,
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
            year: true,
            month: true,
          },
        },
        _count: {
          select: {
            teenBadges: true,
          },
        },
      },
      orderBy: [
        { challenge: { year: 'desc' } },
        { challenge: { month: 'desc' } },
      ],
    });

    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    console.error('Get all badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getBadgeById = async (req, res) => {
  try {
    const { badgeId } = req.params;

    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        challenge: {
          select: {
            id: true,
            theme: true,
            year: true,
            month: true,
          },
        },
        _count: {
          select: {
            teenBadges: true,
          },
        },
      },
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found',
      });
    }

    // Get purchase stats
    const purchaseStats = await prisma.teenBadge.groupBy({
      by: ['status'],
      where: { badgeId },
      _count: true,
    });

    const stats = purchaseStats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        ...badge,
        stats,
      },
    });
  } catch (error) {
    console.error('Get badge by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const { name, description, imageUrl, price, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (isActive !== undefined) updateData.isActive = isActive;

    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: updateData,
      include: {
        challenge: {
          select: {
            theme: true,
            year: true,
            month: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Badge updated successfully',
      data: badge,
    });
  } catch (error) {
    console.error('Update badge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;

    // Check if badge has any purchases
    const purchaseCount = await prisma.teenBadge.count({
      where: { badgeId },
    });

    if (purchaseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete badge that has been purchased by ${purchaseCount} teen(s). This would affect their progress and raffle eligibility.`,
      });
    }

    await prisma.badge.delete({
      where: { id: badgeId },
    });

    res.json({
      success: true,
      message: 'Badge deleted successfully',
    });
  } catch (error) {
    console.error('Delete badge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ============================================
// TEEN BADGE OPERATIONS WITH PAYSTACK
// ============================================

export const initializeBadgePurchase = async (req, res) => {
  try {
    handleValidationErrors(req, res, () => {});

    const { badgeId } = req.body;

    // Get badge details
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        challenge: {
          select: {
            isPublished: true,
            isActive: true,
            goLiveDate: true,
            closingDate: true,
            year: true,
            theme: true,
          },
        },
      },
    });

    if (!badge || !badge.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found or inactive',
      });
    }

    // Check if challenge is active (allow past challenges)
    if (!badge.challenge.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Badge is not available for purchase',
      });
    }

    // Check if teen already has this badge
    const existingBadge = await prisma.teenBadge.findUnique({
      where: {
        teenId_badgeId: {
          teenId: req.teen.id,
          badgeId: badge.id,
        },
      },
    });

    if (existingBadge && existingBadge.isPurchased) {
      return res.status(400).json({
        success: false,
        message: 'Badge already purchased',
      });
    }

    // Get teen details
    const teen = await prisma.teen.findUnique({
      where: { id: req.teen.id },
      select: { email: true, name: true },
    });

    // Initialize Paystack transaction
    const paystackData = {
      amount: Math.round(badge.price * 100), // Convert to kobo
      email: teen.email,
      metadata: {
        badgeId: badge.id,
        challengeId: badge.challengeId,
        teenId: req.teen.id,
        badgeName: badge.name,
        challengeTheme: badge.challenge.theme,
      },
      callback_url: `${process.env.APP_URL}/payment/callback`,
    };

    const transaction = await paystack.transaction.initialize(paystackData);

    if (!transaction.status) {
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
      });
    }

    // Create pending teen badge record
    await prisma.teenBadge.upsert({
      where: {
        teenId_badgeId: {
          teenId: req.teen.id,
          badgeId: badge.id,
        },
      },
      update: {
        status: 'AVAILABLE',
      },
      create: {
        teenId: req.teen.id,
        badgeId: badge.id,
        status: 'AVAILABLE',
      },
    });

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: transaction.data.authorization_url,
        access_code: transaction.data.access_code,
        reference: transaction.data.reference,
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          price: badge.price,
        },
      },
    });
  } catch (error) {
    console.error('Initialize badge purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const verifyBadgePurchase = async (req, res) => {
  try {
    const { reference } = req.params;

    // Verify transaction with Paystack
    const verification = await paystack.transaction.verify(reference);

    if (!verification.status || verification.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    const { metadata } = verification.data;
    const { badgeId, challengeId, teenId } = metadata || {};

    if (!badgeId || !teenId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction metadata is incomplete',
      });
    }

    // Bind the verified transaction to the caller. The metadata is set by us at
    // initialize time, but the reference is a user-supplied URL param — a teen
    // must only be able to finalize a purchase that belongs to their own
    // account, never one whose metadata names a different teen.
    if (teenId !== req.teen.id) {
      return res.status(403).json({
        success: false,
        message: 'This transaction does not belong to your account',
      });
    }

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
      return res.status(404).json({
        success: false,
        message: 'Badge not found',
      });
    }

    // Validate the amount actually paid matches the badge price (in kobo).
    // Guards against price drift between initialize and verify, and against
    // any partial/under-payment being accepted as a full purchase.
    const expectedAmount = Math.round(badge.price * 100);
    if (
      typeof verification.data.amount === 'number' &&
      verification.data.amount < expectedAmount
    ) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount does not match the badge price',
      });
    }

    // ✅ Purchasing is an OPTIONAL add-on, tracked via `isPurchased` — it is
    // intentionally kept separate from `status`/EARNED, which is granted for
    // free purely by completing the challenge's tasks (see
    // grantEarnedBadgeIfCompleted in utils/helpers.js). A purchase must never
    // downgrade an already-EARNED badge, and it must never be required to
    // reach EARNED.
    const existing = await prisma.teenBadge.findUnique({
      where: {
        teenId_badgeId: {
          teenId,
          badgeId,
        },
      },
    });

    const teenBadge = await prisma.teenBadge.upsert({
      where: {
        teenId_badgeId: {
          teenId,
          badgeId,
        },
      },
      update: {
        isPurchased: true,
        purchasedAt: new Date(),
        // Only move an AVAILABLE badge to PURCHASED. Never touch a badge
        // that's already EARNED — purchasing afterwards is just a bonus,
        // not a status change.
        ...(existing && existing.status === 'EARNED'
          ? {}
          : { status: 'PURCHASED' }),
      },
      create: {
        teenId,
        badgeId,
        status: 'PURCHASED',
        isPurchased: true,
        purchasedAt: new Date(),
      },
    });

    // Update raffle eligibility
    await updateRaffleEligibilityHelper(teenId, badge.challenge.year);

    res.json({
      success: true,
      message: 'Badge purchased successfully',
      data: {
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          price: badge.price,
        },
        status: teenBadge.status,
        isPurchased: teenBadge.isPurchased,
        purchasedAt: teenBadge.purchasedAt,
        paymentReference: reference,
      },
    });
  } catch (error) {
    console.error('Verify badge purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getMyBadges = async (req, res) => {
  try {
    const { year } = req.query;

    // Build where clause
    const whereClause = {
      teenId: req.teen.id,
    };

    // If year filter, get challenges for that year first
    if (year) {
      const challenges = await prisma.monthlyChallenge.findMany({
        where: { year: parseInt(year) },
        select: { id: true },
      });
      const challengeIds = challenges.map((c) => c.id);

      const badges = await prisma.badge.findMany({
        where: { challengeId: { in: challengeIds } },
        select: { id: true },
      });
      const badgeIds = badges.map((b) => b.id);

      whereClause.badgeId = { in: badgeIds };
    }

    const teenBadges = await prisma.teenBadge.findMany({
      where: whereClause,
      include: {
        badge: {
          include: {
            challenge: {
              select: {
                year: true,
                month: true,
                theme: true,
              },
            },
          },
        },
      },
    });

    // Sort manually by month
    teenBadges.sort(
      (a, b) => a.badge.challenge.month - b.badge.challenge.month
    );

    res.json({
      success: true,
      data: teenBadges.map((tb) => ({
        id: tb.id,
        badge: {
          id: tb.badge.id,
          name: tb.badge.name,
          description: tb.badge.description,
          imageUrl: tb.badge.imageUrl,
          price: tb.badge.price,
        },
        challenge: tb.badge.challenge,
        status: tb.status,
        isPurchased: tb.isPurchased,
        purchasedAt: tb.purchasedAt,
        earnedAt: tb.earnedAt,
      })),
    });
  } catch (error) {
    console.error('Get teen badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getBadgeStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    // Build where clause for challenges
    const challengeWhere = {};
    if (year) challengeWhere.year = parseInt(year);
    if (month) challengeWhere.month = parseInt(month);

    let whereClause = {};

    // If filtering by year/month, get those challenges first
    if (year || month) {
      const challenges = await prisma.monthlyChallenge.findMany({
        where: challengeWhere,
        select: { id: true },
      });
      const challengeIds = challenges.map((c) => c.id);

      const badges = await prisma.badge.findMany({
        where: { challengeId: { in: challengeIds } },
        select: { id: true },
      });
      const badgeIds = badges.map((b) => b.id);

      whereClause.badgeId = { in: badgeIds };
    }

    // Get status breakdown
    const stats = await prisma.teenBadge.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
    });

    // ✅ Revenue must be based on actual purchases (isPurchased), not on
    // `status`. Since badges are earned for free by completing a challenge's
    // tasks, `status: 'EARNED'` no longer implies any payment was made.
    const purchasedBadges = await prisma.teenBadge.findMany({
      where: {
        ...whereClause,
        isPurchased: true,
      },
      include: {
        badge: {
          select: {
            price: true,
          },
        },
      },
    });

    // Calculate total revenue
    const totalRevenue = purchasedBadges.reduce(
      (sum, tb) => sum + (tb.badge.price || 0),
      0
    );

    res.json({
      success: true,
      data: {
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count;
          return acc;
        }, {}),
        totalPurchased: purchasedBadges.length,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error('Get badge stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
