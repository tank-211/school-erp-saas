import express from 'express';
import multer from 'multer';
import * as importer from '../controllers/studentImportController.js';
import { authMiddleware, isAdmin, requireSchool } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// The spreadsheet is read in memory and never stored (it holds parents' phone numbers)
const sheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname || '')) return cb(null, true);
    const error = new Error('Upload the template as .xlsx, .xls or .csv');
    error.status = 400;
    return cb(error);
  },
});

// School admins only: isAdmin re-checks the role in the database
router.use(authMiddleware, requireSchool, isAdmin);

router.get('/template', importer.downloadTemplate);
// Reads the sheet; a file over the limit gets its own message (the app-wide one says 5MB)
const readSheet = (req, res, next) =>
  sheetUpload.single('file')(req, res, (error) => {
    if (!error) return next();
    const tooBig = error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : error.status || 400).json({
      success: false,
      message: tooBig ? 'The file is larger than 10 MB. Split it into smaller files.' : error.message,
    });
  });

router.post('/preview', readSheet, importer.previewImport);
router.post('/', readSheet, importer.runImport);
router.get('/batches', importer.getBatches);
router.post('/batches/:id/undo', importer.undoImport);

// After an import: students still needing a class or documents
router.get('/follow-up', importer.getFollowUp);
router.patch('/admissions/:id/class', importer.setClass);
router.post('/admissions/:id/documents', upload.single('file'), importer.addDocument);

export default router;
