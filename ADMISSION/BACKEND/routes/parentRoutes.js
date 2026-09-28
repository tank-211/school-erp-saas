import express from 'express';
import { getParentById, saveParent } from '../controllers/parentController.js';
import { authMiddleware, requireSchool } from '../middleware/auth.js';

const router = express.Router();

// Parents are school-owned data: login required, scoped to the token's school.
router.use(authMiddleware, requireSchool);

router.get('/:id', getParentById);

router.post('/save', saveParent);

export default router;
