import { Router } from 'express';
import * as refundController from '../controllers/refundController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, paginationValidator } from '../middleware/validation';
import { requireRefunds } from '../utils/refunds';

const router = Router();

// All routes require authentication, and the refunds table (see utils/refunds)
router.use(authenticate, requireRefunds);

// POST - Create refund request (any authenticated user)
router.post('/', refundController.createRefund);

// GET - Refund statistics (before /:id, which would otherwise catch it) (ADMIN/ACCOUNTANT only)
router.get(
  '/stats',
  authorize('ADMIN', 'ACCOUNTANT'),
  refundController.getRefundStats
);

// GET - Get refund by ID
router.get('/:id', refundController.getRefundById);

// GET - Get refunds
router.get(
  '/',
  validateRequest(paginationValidator),
  refundController.getRefunds
);


// POST - Approve refund (ADMIN/ACCOUNTANT only)
router.post(
  '/:id/approve',
  authorize('ADMIN', 'ACCOUNTANT'),
  refundController.approveRefund
);

// POST - Reject refund (ADMIN/ACCOUNTANT only)
router.post(
  '/:id/reject',
  authorize('ADMIN', 'ACCOUNTANT'),
  refundController.rejectRefund
);

// POST - Process refund (ADMIN only)
router.post(
  '/:id/process',
  authorize('ADMIN'),
  refundController.processRefund
);

export default router;
