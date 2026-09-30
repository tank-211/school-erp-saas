import express from 'express';
import {
  getDashboardStats,
  getTransactions,
  getInvoiceById,
  generateInvoice,
  getUninvoicedFees
} from '../controllers/feesController.js';
import {
  getAdmissionsWithoutFees,
  assignFeesToAdmissions
} from '../controllers/admissionFeesController.js';
import { authMiddleware, requireSchool, isAdmin } from '../middleware/auth.js';

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
// Fees assigned but not invoiced yet (Generate Invoice dialog)
router.get('/uninvoiced', requireSchool, getUninvoicedFees);
router.post('/generate-invoice', requireSchool, generateInvoice);

// Completed admissions that have no fees yet, and assigning them (admin only)
router.get('/admissions-without-fees', requireSchool, getAdmissionsWithoutFees);
router.post('/assign-admission-fees', requireSchool, isAdmin, assignFeesToAdmissions);

export default router;