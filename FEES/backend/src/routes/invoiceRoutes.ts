import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, paginationValidator } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET - Get single invoice by ID
router.get('/:invoiceId', invoiceController.getInvoice);

// GET - Get all invoices with pagination
router.get(
  '/',
  validateRequest(paginationValidator),
  invoiceController.getAllInvoices
);

// POST - Create single invoice (ADMIN/ACCOUNTANT only)
router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
  invoiceController.createInvoice
);

// POST - Bulk create invoices (ADMIN/ACCOUNTANT only)
router.post(
  '/bulk',
  authorize('ADMIN', 'ACCOUNTANT'),
  invoiceController.bulkCreateInvoices
);

// GET - Get receipt data for an invoice
router.get('/:invoiceId/receipt', invoiceController.getReceiptData);

export default router;
