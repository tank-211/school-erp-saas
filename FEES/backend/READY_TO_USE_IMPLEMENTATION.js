/**
 * Financial Dashboard Controller & Service Implementation
 * 
 * This file contains a complete, ready-to-use implementation of a financial dashboard
 * that provides fee collection analytics including:
 * - Monthly collection data (for bar charts)
 * - Payment method distribution (for pie charts)
 * - Recent transactions (for tables)
 * - Summary statistics
 * 
 * Usage:
 * 1. Copy the service methods into your services/feePaymentService.js
 * 2. Copy the controller method into your controllers/feePaymentController.js
 * 3. Add the route to your routes/feePaymentRoutes.js
 * 4. Install @prisma/client: npm install @prisma/client
 */

// ============================================================================
// CONTROLLER IMPLEMENTATION
// ============================================================================
// File: controllers/feePaymentController.js

/**
 * Get comprehensive financial dashboard data
 * 
 * @route GET /api/fee-payments/dashboard
 * @param {string} query.year - Year for analysis (default: current year)
 * @returns {object} Dashboard data with monthly, payment method, and transaction data
 */
export const getFinancialDashboardData = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const dashboardData = await FeePaymentService.getFinancialDashboardData(parseInt(year));
    return sendSuccessResponse(res, 'Financial dashboard data retrieved successfully', dashboardData);
  } catch (error) {
    logger.error(`Get financial dashboard data error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================
// File: services/feePaymentService.js

import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

export class FeePaymentService {
  /**
   * Fetch comprehensive financial dashboard data
   * 
   * This method performs three parallel queries to fetch:
   * 1. Monthly sum of payments grouped by month for the specified year
   * 2. Distribution of payments by payment method
   * 3. 5 most recent transactions with full details
   * 
   * @param {number} year - The year to analyze (default: current year)
   * @returns {Promise<object>} Consolidated dashboard data
   * 
   * Example response:
   * {
   *   "year": 2024,
   *   "monthlyCollection": {
   *     "title": "Monthly Fee Collection",
   *     "data": [
   *       { "month": 1, "monthName": "Jan", "amount": 50000 },
   *       ...
   *     ],
   *     "totalCollected": 720000
   *   },
   *   "paymentMethodDistribution": {
   *     "title": "Payment Method Distribution",
   *     "data": [
   *       { "method": "BANK_TRANSFER", "count": 45, "totalAmount": 450000 },
   *       ...
   *     ],
   *     "total": 95
   *   },
   *   "recentTransactions": {
   *     "title": "Recent Transactions",
   *     "data": [
   *       {
   *         "id": "...",
   *         "studentName": "John Doe",
   *         "invoiceNo": "...",
   *         "class": "Class 12-A",
   *         "amount": 50000,
   *         "method": "BANK_TRANSFER",
   *         "status": "PAID",
   *         "transactionDate": "2024-03-28T10:30:00Z"
   *       },
   *       ...
   *     ],
   *     "count": 5
   *   },
   *   "summary": {
   *     "totalCollected": 900000,
   *     "totalTransactions": 95,
   *     "averageTransactionAmount": 9473.68
   *   }
   * }
   */
  static async getFinancialDashboardData(year = new Date().getFullYear()) {
    try {
      // Define date range for the specified year
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year + 1}-01-01`);

      // ========== QUERY 1: MONTHLY COLLECTION DATA ==========
      // Fetch grouped payment amounts by month using raw SQL for better performance
      const monthlyGroupByResult = await prisma.payment.groupBy({
        by: ['createdAt'],
        _sum: {
          amount: true
        },
        where: {
          createdAt: {
            gte: startOfYear,
            lt: endOfYear
          }
        }
      });

      // Create a map to store monthly totals
      const monthlyMap = new Map();
      monthlyGroupByResult.forEach(item => {
        const month = new Date(item.createdAt).getMonth() + 1; // 1-12
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, 0);
        }
        monthlyMap.set(month, monthlyMap.get(month) + Number(item._sum.amount || 0));
      });

      // Format monthly data for bar chart (ensure all 12 months are present)
      const monthlyCollectionForChart = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        monthName: new Date(year, index).toLocaleString('default', { month: 'short' }),
        amount: monthlyMap.get(index + 1) || 0
      }));

      // ========== QUERY 2: PAYMENT METHOD DISTRIBUTION ==========
      // Fetch payment distribution by method
      const paymentMethodDistribution = await prisma.payment.groupBy({
        by: ['paymentMethod'],
        _count: {
          id: true
        },
        _sum: {
          amount: true
        }
      });

      // Format payment method data for pie chart
      const paymentMethodForChart = paymentMethodDistribution.map(item => ({
        method: item.paymentMethod,
        count: item._count.id,
        totalAmount: Number(item._sum.amount || 0)
      }));

      // ========== QUERY 3: RECENT TRANSACTIONS ==========
      // Fetch 5 most recent transactions with all required details
      const recentPayments = await prisma.payment.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          feePayment: {
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  studentId: true
                }
              },
              feeStructure: {
                include: {
                  class: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Format transactions with required fields
      const formattedTransactions = recentPayments.map(payment => {
        const student = payment.feePayment?.student;
        const classInfo = payment.feePayment?.feeStructure?.class;
        const feePaymentStatus = payment.feePayment?.paymentStatus;

        return {
          id: payment.id,
          studentName: student 
            ? `${student.firstName} ${student.lastName}` 
            : 'N/A',
          studentId: student?.studentId || 'N/A',
          invoiceNo: payment.transactionId || payment.id,
          class: classInfo?.name || 'N/A',
          amount: Number(payment.amount),
          method: payment.paymentMethod,
          status: feePaymentStatus || 'UNKNOWN',
          transactionDate: payment.createdAt,
          transactionId: payment.transactionId
        };
      });

      // ========== COMBINE ALL DATA ==========
      // Calculate summary statistics
      const totalCollected = paymentMethodForChart.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalTransactions = paymentMethodForChart.reduce((sum, item) => sum + item.count, 0);
      const averageTransactionAmount = totalTransactions > 0 ? totalCollected / totalTransactions : 0;

      // Construct final response object
      const dashboardData = {
        year,
        monthlyCollection: {
          title: 'Monthly Fee Collection',
          data: monthlyCollectionForChart,
          totalCollected: monthlyCollectionForChart.reduce((sum, item) => sum + item.amount, 0)
        },
        paymentMethodDistribution: {
          title: 'Payment Method Distribution',
          data: paymentMethodForChart,
          total: totalTransactions
        },
        recentTransactions: {
          title: 'Recent Transactions',
          data: formattedTransactions,
          count: formattedTransactions.length
        },
        summary: {
          totalCollected: Number(totalCollected.toFixed(2)),
          totalTransactions,
          averageTransactionAmount: Number(averageTransactionAmount.toFixed(2))
        }
      };

      logger.info(`Financial dashboard data retrieved for year ${year}`);
      return dashboardData;

    } catch (error) {
      logger.error(`Get financial dashboard data error: ${error.message}`);
      throw error;
    }
  }
}

// ============================================================================
// ROUTE IMPLEMENTATION
// ============================================================================
// File: routes/feePaymentRoutes.js

import express from 'express';
import { getFinancialDashboardData } from '../controllers/feePaymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/fee-payments/dashboard
 * @param {string} query.year - Optional year parameter (defaults to current year)
 * @returns Financial dashboard data
 */
router.get('/dashboard', authenticate, getFinancialDashboardData);

// Export the router
export default router;

// ============================================================================
// QUICK SETUP GUIDE
// ============================================================================

/*
STEP 1: Install Dependencies
$ npm install @prisma/client

STEP 2: Update your Prisma schema (if not already done)
# Your schema.prisma should have Payment, FeePayment, Student, and Class models
# See FINANCIAL_DASHBOARD_IMPLEMENTATION.md for schema details

STEP 3: Generate Prisma Client
$ npx prisma generate

STEP 4: Add the code to your application
1. Copy the SERVICE IMPLEMENTATION to services/feePaymentService.js
   - Add PrismaClient import at the top
   - Add the getFinancialDashboardData method to FeePaymentService class

2. Copy the CONTROLLER IMPLEMENTATION to controllers/feePaymentController.js
   - Add the getFinancialDashboardData controller function

3. Copy the ROUTE IMPLEMENTATION to routes/feePaymentRoutes.js
   - Add the GET /dashboard route

4. Register the route in your main server file (server.js):
   import feePaymentRoutes from './routes/feePaymentRoutes.js';
   app.use('/api/fee-payments', feePaymentRoutes);

STEP 5: Test the endpoint
$ curl http://localhost:5000/api/fee-payments/dashboard?year=2024

Expected Response:
{
  "success": true,
  "message": "Financial dashboard data retrieved successfully",
  "data": {
    "year": 2024,
    "monthlyCollection": { ... },
    "paymentMethodDistribution": { ... },
    "recentTransactions": { ... },
    "summary": { ... }
  }
}

STEP 6: Frontend Integration (React Example)
See FINANCIAL_DASHBOARD_IMPLEMENTATION.md for complete React component example

OPTIONAL: Add caching for better performance
See DASHBOARD_ALTERNATIVE_IMPLEMENTATIONS.md for Redis caching approach
*/

// ============================================================================
// DATABASE QUERY EXAMPLES
// ============================================================================

/*
If you want to query specific data separately:

// Get monthly data for a specific month
const februaryData = await prisma.payment.groupBy({
  by: ['paymentMethod'],
  _sum: { amount: true },
  where: {
    createdAt: {
      gte: new Date('2024-02-01'),
      lt: new Date('2024-03-01')
    }
  }
});

// Get transactions by specific payment method
const bankTransfers = await prisma.payment.findMany({
  where: { paymentMethod: 'BANK_TRANSFER' },
  orderBy: { createdAt: 'desc' },
  take: 20
});

// Get payment status breakdown
const statusBreakdown = await prisma.payment.groupBy({
  by: ['feePayment.paymentStatus'],
  _count: true
});
*/

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/*
Issue: "PrismaClient is not initialized"
Solution: 
- Ensure @prisma/client is installed: npm install @prisma/client
- Check that PrismaClient import is at the top of the service file
- Verify schema.prisma exists and is valid

Issue: "Relations not populated"
Solution:
- Check that include clauses match your Prisma schema
- Verify foreign key relationships in schema.prisma
- Ensure student, class, and feeStructure relations exist

Issue: "Null values in response"
Solution:
- Add null checks in the formatting step
- Use optional chaining (?.) to safely access nested properties
- Check database has actual relationships between records

Issue: "Performance is slow"
Solution:
- Add database indexes on frequently queried columns
- Consider using raw SQL approach for better performance
- Implement caching strategy (see DASHBOARD_ALTERNATIVE_IMPLEMENTATIONS.md)
- Check database connection pooling is configured

Issue: "Year parameter not working"
Solution:
- Verify year parameter is being parsed as integer
- Check date range calculations in the query
- Ensure createdAt field is stored as timestamp in database
*/
