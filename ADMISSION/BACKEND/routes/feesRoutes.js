import express from 'express';
import {
  getDashboardStats,
  getTransactions,
  getInvoiceById,
  generateInvoice
} from '../controllers/feesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * Fees Routes
 * Base path: /api/fees
 */

// GET dashboard statistics
router.get('/dashboard-stats', getDashboardStats);

// GET transaction list
router.get('/transactions', getTransactions);

// GET invoice details by ID
router.get('/invoice/:id', getInvoiceById);

// POST generate new invoice
router.post('/generate-invoice', generateInvoice);

export default router;