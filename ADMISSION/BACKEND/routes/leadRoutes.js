/**
 * routes/leadRoutes.js
 * Lead API Routes
 * Base path: /api/leads
 * 
 * All routes are protected by JWT authentication middleware
 * which ensures req.user.school_id is available
 * 
 * Routes:
 * POST   /api/leads          → createLead
 * GET    /api/leads          → getAllLeads  
 * GET    /api/leads/:id      → getLeadById
 * PUT    /api/leads/:id      → updateLead
 * DELETE /api/leads/:id      → deleteLead
 */

import express from 'express';
import { 
  createLead, 
  getAllLeads, 
  getLeadById, 
  updateLead, 
  deleteLead,
  getUpcomingFollowups
} from '../controllers/leadController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all lead routes
router.use(authMiddleware);

/**
 * POST /api/leads
 * Create a new lead
 * Body: { first_name, last_name, email, phone, desired_class, source, notes, academic_year_id, follow_up_date }
 * Returns: 201 { success: true, data: leadRow, message: "..." }
 */
router.post('/', createLead);

/**
 * GET /api/leads
 * Get all leads for the authenticated school with optional filters
 * Query params: ?follow_up_status=pending&desired_class=Grade5&assigned_to=123
 * Returns: 200 { success: true, data: [leadRow, ...] }
 */
router.get('/', getAllLeads);

/**
 * GET /api/leads/followups/upcoming
 * Get upcoming follow-ups for the Admissions Dashboard widget
 * Query params: ?interval=2&limit=10
 * Returns upcoming follow-ups ordered by priority (overdue → today → upcoming)
 * Response: 200 { success: true, data: [followup, ...], count: number }
 */
router.get('/followups/upcoming', getUpcomingFollowups);

/**
 * GET /api/leads/:id
 * Get a single lead by ID (scoped to school)
 * Returns: 200 { success: true, data: leadRow } or 404 { success: false, message: "..." }
 */
router.get('/:id', getLeadById);

/**
 * PUT /api/leads/:id
 * Update a lead's details
 * Body: { field1: value1, field2: value2, ... } (any lead field except school_id and created_by)
 * Returns: 200 { success: true, data: updatedLeadRow, message: "..." } or 404
 */
router.put('/:id', updateLead);

/**
 * DELETE /api/leads/:id
 * Delete a lead
 * Returns: 204 (no content) or 404 { success: false, message: "..." }
 */
router.delete('/:id', deleteLead);

export default router;
