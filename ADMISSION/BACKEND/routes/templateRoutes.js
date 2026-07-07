import express from 'express';
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  updateTemplate,
} from '../controllers/templateController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createTemplate);
router.get('/', getTemplates);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
