// controllers/raffleController.js
import prisma from '../lib/prisma.js';
import { validationResult } from 'express-validator';

export const checkRaffleEligibility = async (req, res) => {
  try {
    const { year } = req.params;

    const raffleEntry = await prisma.raffleEntry.findUnique({
      where: {
        teenId_year: {
          teenId: req.teen.id,
          year: parseInt(year),
        },
      },
    });

    // Get purchased badges count for the year
    const purchasedBadgesCount = await prisma.teenBadge.count({
      where: {
        teenId: req.teen.id,
        status: {
          in: ['PURCHASED', 'EARNED'],
        },
        badge: {
          challenge: {
            year: parseInt(year),
          },
        },
      },
    });

    const isEligible = purchasedBadgesCount === 12;

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        isEligible,
        purchasedBadges: purchasedBadgesCount,
        requiredBadges: 12,
        raffleEntry: raffleEntry || null,
      },
    });
  } catch (error) {
    console.error('Check raffle eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getEligibleTeens = async (req, res) => {
  try {
    const { year } = req.params;

    const eligibleEntries = await prisma.raffleEntry.findMany({
      where: {
        year: parseInt(year),
        isEligible: true,
      },
      include: {
        teen: {
          select: {
            id: true,
            name: true,
            email: true,
            age: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get raffle draw info if exists
    const raffleDraw = await prisma.raffleDraw.findUnique({
      where: {
        year: parseInt(year),
      },
    });

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        eligibleCount: eligibleEntries.length,
        eligibleTeens: eligibleEntries,
        raffleDraw,
      },
    });
  } catch (error) {
    console.error('Get eligible teens error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const createRaffleDraw = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { year, prize, description } = req.body;

    // Check if raffle already exists for this year
    const existingRaffle = await prisma.raffleDraw.findUnique({
      where: { year: parseInt(year) },
    });

    if (existingRaffle) {
      return res.status(400).json({
        success: false,
        message: 'Raffle already exists for this year',
      });
    }

    // Get eligible teens
    const eligibleEntries = await prisma.raffleEntry.findMany({
      where: {
        year: parseInt(year),
        isEligible: true,
      },
    });

    if (eligibleEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible teens found for this year',
      });
    }

    // Select random winner
    const randomIndex = Math.floor(Math.random() * eligibleEntries.length);
    const winner = eligibleEntries[randomIndex];

    // Create raffle draw
    const raffleDraw = await prisma.raffleDraw.create({
      data: {
        year: parseInt(year),
        prize,
        description,
        winnerId: winner.teenId,
        drawnAt: new Date(),
      },
    });

    // Get winner details
    const winnerDetails = await prisma.teen.findUnique({
      where: { id: winner.teenId },
      select: {
        name: true,
        email: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Raffle draw completed successfully',
      data: {
        raffleDraw,
        winner: winnerDetails,
        totalEligible: eligibleEntries.length,
      },
    });
  } catch (error) {
    console.error('Create raffle draw error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getRaffleHistory = async (req, res) => {
  try {
    const raffleHistory = await prisma.raffleDraw.findMany({
      orderBy: {
        year: 'desc',
      },
    });

    // For each raffle, get the eligible count
    const historyWithCounts = await Promise.all(
      raffleHistory.map(async (raffle) => {
        const eligibleCount = await prisma.raffleEntry.count({
          where: {
            year: raffle.year,
            isEligible: true,
          },
        });

        return {
          ...raffle,
          eligibleCount,
        };
      })
    );

    res.json({
      success: true,
      data: historyWithCounts,
    });
  } catch (error) {
    console.error('Get raffle history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
