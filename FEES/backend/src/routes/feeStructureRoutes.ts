import { Router } from 'express';
import * as feeStructureController from '../controllers/feeStructureController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// View fee structures
router.get('/', feeStructureController.getFeeStructures);

// Create / update / delete — Admin and Accountant only
router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
  feeStructureController.createFeeStructure
);

router.patch(
  '/:id',
  authorize('ADMIN', 'ACCOUNTANT'),
  feeStructureController.updateFeeStructure
);

router.delete(
  '/:id',
  authorize('ADMIN', 'ACCOUNTANT'),
  feeStructureController.deleteFeeStructure
);

export default router;