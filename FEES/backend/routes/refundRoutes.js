import express from 'express';
import * as refundController from '../controllers/refundController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { createRefundRequestSchema } from '../validators/refundValidator.js';

const router = express.Router();

// Protected routes
router.use(authenticateToken);

router.post('/',
  validateRequest(createRefundRequestSchema),
  refundController.createRefundRequest
);

router.get('/', refundController.getRefundRequests);

router.post('/:id/approve',
  authorizeRole('admin', 'accountant'),
  refundController.approveRefundRequest
);

router.post('/:id/reject',
  authorizeRole('admin', 'accountant'),
  refundController.rejectRefundRequest
);

router.post('/:id/process',
  authorizeRole('admin'),
  refundController.processRefund
);

router.get('/stats',
  authorizeRole('admin', 'accountant'),
  refundController.getRefundStats
);

export default router;
