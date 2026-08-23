import express from 'express';
import { getParentById, saveParent } from '../controllers/parentController.js';

const router = express.Router();

// GET parent by ID
router.get('/:id', getParentById);

// POST save parent
router.post('/save', saveParent);

export default router;
