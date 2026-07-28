// controllers/transactionController.js
import prisma from '../lib/prisma.js';

// Get all transactions with filters
export const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      teenId,
      badgeId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      paymentMethod,
      search,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};

    if (status) where.status = status;
    if (teenId) where.teenId = teenId;
    if (badgeId) where.badgeId = badgeId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }

    // Search filter (teen name or email)
    if (search) {
      where.teen = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          teen: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePhoto: true,
            },
          },
          badge: {
            include: {
              challenge: {
                select: {
                  theme: true,
                  year: true,
                  month: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        teen: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePhoto: true,
            age: true,
            state: true,
            country: true,
          },
        },
        badge: {
          include: {
            challenge: {
              select: {
                id: true,
                theme: true,
                year: true,
                month: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get transaction analytics
export const getTransactionAnalytics = async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (year && month) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(
        parseInt(year),
        parseInt(month),
        0,
        23,
        59,
        59
      );
      dateFilter.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    // Total revenue
    const revenueData = await prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
      _count: true,
      _avg: {
        amount: true,
      },
    });

    // Transaction status breakdown
    const statusBreakdown = await prisma.transaction.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: true,
      _sum: {
        amount: true,
      },
    });

    // Payment method breakdown
    const paymentMethodBreakdown = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        status: 'SUCCESS',
        ...dateFilter,
      },
      _count: true,
      _sum: {
        amount: true,
      },
    });

    // Monthly revenue (last 12 months)
    // NOTE: this datasource is MongoDB (see prisma/schema.prisma), which has
    // no SQL engine — `prisma.$queryRaw` with raw PostgreSQL (DATE_TRUNC,
    // "::int" casts, a literal `FROM transactions` table) previously sat
    // here and would throw on every call, since Prisma's MongoDB connector
    // doesn't support SQL raw queries at all. That failure happened inside
    // this function's try block, so it took down the whole analytics
    // response (Top Spenders, Payment Methods, Avg. Transaction all show
    // "No data" on the admin Transactions page as a result). Fixed by
    // fetching the raw rows and grouping by month in JS instead — small,
    // portable, and correct on any Prisma datasource.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const recentSuccessTransactions = await prisma.transaction.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    const monthlyRevenueMap = new Map();
    for (const tx of recentSuccessTransactions) {
      const d = new Date(tx.createdAt);
      const monthKey = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const existing = monthlyRevenueMap.get(monthKey) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += tx.amount || 0;
      monthlyRevenueMap.set(monthKey, existing);
    }
    const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
      .map(([month, stats]) => ({ month, count: stats.count, revenue: stats.revenue }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Top spending teens
    const topSpenders = await prisma.transaction.groupBy({
      by: ['teenId'],
      where: {
        status: 'SUCCESS',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    });

    // Get teen details for top spenders
    const teenIds = topSpenders.map((t) => t.teenId);
    const teens = await prisma.teen.findMany({
      where: {
        id: { in: teenIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        state: true,
        country: true,
      },
    });

    const topSpendersWithDetails = topSpenders.map((spender) => ({
      teen: teens.find((t) => t.id === spender.teenId),
      totalSpent: spender._sum.amount,
      transactionCount: spender._count,
    }));

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        status: 'SUCCESS',
        ...dateFilter,
      },
      include: {
        teen: {
          select: {
            name: true,
            email: true,
          },
        },
        badge: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: revenueData._sum.amount || 0,
          totalTransactions: revenueData._count || 0,
          averageTransaction: revenueData._avg.amount || 0,
        },
        statusBreakdown: statusBreakdown.map((item) => ({
          status: item.status,
          count: item._count,
          amount: item._sum.amount || 0,
        })),
        paymentMethodBreakdown: paymentMethodBreakdown.map((item) => ({
          method: item.paymentMethod,
          count: item._count,
          amount: item._sum.amount || 0,
        })),
        monthlyRevenue,
        topSpenders: topSpendersWithDetails,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Get transaction analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get revenue summary
export const getRevenueSummary = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // This month revenue
    const thisMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const thisMonthRevenue = await prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Last month revenue
    const lastMonthStart = new Date(currentYear, currentMonth - 2, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59);

    const lastMonthRevenue = await prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate growth
    const growth =
      lastMonthRevenue._sum.amount > 0
        ? ((thisMonthRevenue._sum.amount - lastMonthRevenue._sum.amount) /
            lastMonthRevenue._sum.amount) *
          100
        : 0;

    // This year revenue
    const thisYearStart = new Date(currentYear, 0, 1);
    const thisYearRevenue = await prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: thisYearStart,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // All time revenue
    const allTimeRevenue = await prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        thisMonth: {
          revenue: thisMonthRevenue._sum.amount || 0,
          transactions: thisMonthRevenue._count || 0,
          growth: growth.toFixed(2),
        },
        lastMonth: {
          revenue: lastMonthRevenue._sum.amount || 0,
        },
        thisYear: {
          revenue: thisYearRevenue._sum.amount || 0,
          transactions: thisYearRevenue._count || 0,
        },
        allTime: {
          revenue: allTimeRevenue._sum.amount || 0,
          transactions: allTimeRevenue._count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get revenue summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get teen's transaction history
export const getTeenTransactions = async (req, res) => {
  try {
    const { teenId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { teenId },
        include: {
          badge: {
            include: {
              challenge: {
                select: {
                  theme: true,
                  year: true,
                  month: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where: { teenId } }),
    ]);

    // Get spending summary for this teen
    const summary = await prisma.transaction.aggregate({
      where: {
        teenId,
        status: 'SUCCESS',
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalSpent: summary._sum.amount || 0,
          totalTransactions: summary._count || 0,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get teen transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export default {
  getAllTransactions,
  getTransactionById,
  getTransactionAnalytics,
  getRevenueSummary,
  getTeenTransactions,
};
