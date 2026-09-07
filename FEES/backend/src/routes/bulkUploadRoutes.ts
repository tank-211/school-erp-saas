import { Router } from 'express';
import * as bulkUploadController from '../controllers/bulkUploadController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, paginationValidator } from '../middleware/validation';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const fileName = (file as any).name || file.originalname || ''
    if (file.mimetype === 'text/csv' || fileName.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST - Upload fee structures CSV (ADMIN/ACCOUNTANT only)
router.post(
  '/fee-structures',
  authorize('ADMIN', 'ACCOUNTANT'),
  upload.single('file'),
  bulkUploadController.uploadFeeStructures
);

// POST - Upload invoices CSV (ADMIN/ACCOUNTANT only)
router.post(
  '/invoices',
  authorize('ADMIN', 'ACCOUNTANT'),
  upload.single('file'),
  bulkUploadController.uploadInvoices
);

// POST - Upload payments CSV (ADMIN/ACCOUNTANT only)
router.post(
  '/payments',
  authorize('ADMIN', 'ACCOUNTANT'),
  upload.single('file'),
  bulkUploadController.uploadPayments
);

// POST - Upload students CSV (ADMIN/ACCOUNTANT only)
router.post(
  '/students',
  authorize('ADMIN', 'ACCOUNTANT'),
  upload.single('file'),
  bulkUploadController.uploadStudents
);

// GET - Get upload logs
router.get(
  '/logs',
  validateRequest(paginationValidator),
  bulkUploadController.getUploadLogs
);

export default router;
