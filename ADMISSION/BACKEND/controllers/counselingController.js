/**
 * controllers/counselingController.js
 * Business logic and request/response handling for Counseling Workspace
 * All database operations delegated to counselingQueries
 * All file operations delegated to applicationService
 */

import * as counselingQueries from '../db/queries/counselingQueries.js';
import prisma from '../src/lib/prisma.js';

/**
 * GET /api/counseling/stats
 * Get dashboard statistics for authenticated counselor
 * Returns: assignedLeads, upcomingVisits, pendingTasks
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;

    const stats = await counselingQueries.getDashboardStats(school_id, counselorId);

    return res.json({
      success: true,
      data: {
        assignedLeads: stats.assignedLeads || 0,
        upcomingVisits: stats.upcomingVisits || 0,
        pendingTasks: stats.pendingTasks || 0,
      },
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/counseling/visits
 * Get all campus visits for the counselor
 * Query params: filterToday=true (optional, returns only today's visits)
 * Returns: Array of visit objects with lead information
 */
export const getVisits = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const filterToday = req.query.filterToday === 'true';

    const visits = await counselingQueries.getVisitsForCounselor(
      school_id,
      counselorId,
      filterToday
    );

    return res.json({
      success: true,
      data: visits || [],
    });
  } catch (error) {
    console.error('Error in getVisits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch visits',
      error: error.message,
    });
  }
};

/**
 * GET /api/counseling/leads/search
 * Search assigned leads by name or lead ID
 * Query params: q=search_term (required, min 1 character)
 * Returns: Array of lead objects with student and parent information
 */
export const searchLeads = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const counselorId = req.user?.id;
    const { q } = req.query;

    if (!school_id || !counselorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing school or user context',
        data: []
      });
    }

    const normalizedQuery = String(q || '').trim();
    const isNumericSearch = /^\d+$/.test(normalizedQuery);

    if (normalizedQuery && !isNumericSearch && normalizedQuery.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query (q) must be at least 2 characters, or a numeric lead ID.',
        data: []
      });
    }

    const leads = await counselingQueries.searchLeads(
      school_id,
      counselorId,
      normalizedQuery
    );

    const serializedLeads = JSON.parse(
      JSON.stringify(
        leads,
        (_, value) =>
          typeof value === 'bigint'
            ? value.toString()
            : value
      )
    );

    return res.json({
      success: true,
      data: serializedLeads || [],
    });
  } catch (error) {
    console.error('Error in searchLeads controller:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while searching leads',
      data: []
    });
  }
};

/**
 * POST /api/counseling/visits
 * Create a new campus visit with auto-fill from lead if provided
 * 
 * Body: {
 *   lead_id,
 *   assigned_to,
 *   visitor_name,
 *   visitor_phone,
 *   student_name,
 *   grade,
 *   number_of_visitors,
 *   visit_date,
 *   start_time,
 *   end_time,
 *   visit_type,
 *   areas_of_interest (array),
 *   special_requirements,
 *   internal_notes
 * }
 * 
 * Logic:
 * - If lead_id exists: fetch lead and auto-fill missing fields
 * - Default number_of_visitors = 1 if not provided
 * - Check double-booking constraint
 * - Parse tour_preferences as JSON
 */
export const createCampusVisit = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    let {
      lead_id,
      visitor_name,
      visitor_phone,
      student_name,
      grade,
      number_of_visitors,
      visit_date,
      start_time,
      end_time,
      visit_type,
      areas_of_interest,
      special_requirements,
      internal_notes,
    } = req.body;

    // Validate required fields
    if (!visit_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: visit_date, start_time, end_time',
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visit_date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visit_date format. Use YYYY-MM-DD',
      });
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM',
      });
    }

    // Validate that the visit date is not in the past
    const visitDateTime = new Date(`${visit_date}T${start_time}`);
    if (visitDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule visits in the past',
      });
    }

    // Auto-fill from lead if lead_id provided
    if (lead_id) {
      const counselor = await prisma.app_user.findFirst({
  where: {
    id: BigInt(counselorId),
    school_id: BigInt(school_id)
  }
});

        const leadResult = await prisma.lead.findFirst({
          where: {
            id: BigInt(lead_id),
            school_id: BigInt(school_id)
          }
        });

        if (
          !leadResult ||
          !counselor ||
          (
            leadResult.assigned_to?.toString() !== counselor.id.toString() &&
            leadResult.assigned_to?.toLowerCase()?.trim() !==
              counselor.name?.toLowerCase()?.trim()
          )
        ) {
          return res.status(404).json({
            success: false,
            message: 'Lead not found or not assigned to this counselor'
          });
        }

      if (!leadResult) {
        return res.status(403).json({
          success: false,
          message: 'Lead not found or not assigned to you',
        });
      }

      const lead = leadResult;

      // Auto-fill missing fields from lead data
      if (!visitor_name) {
        visitor_name = `${lead.first_name} ${lead.last_name}`.trim();
      }
      if (!visitor_phone) {
        visitor_phone = lead.phone;
      }
      if (!student_name) {
        student_name = `${lead.first_name} ${lead.last_name}`.trim();
      }
      if (!grade && lead.desired_class) {
        grade = lead.desired_class;
      }
    }

    // Set defaults
    if (!number_of_visitors) {
      number_of_visitors = 1;
    }

    // Validate number_of_visitors
    if (number_of_visitors < 1) {
      return res.status(400).json({
        success: false,
        message: 'number_of_visitors must be at least 1',
      });
    }

    // Validate phone format if provided
    if (visitor_phone && !/^\d{10}$/.test(visitor_phone.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format',
      });
    }

    // Parse tour preferences
    const tour_preferences = JSON.stringify({
      areas: areas_of_interest || [],
      special_requirements: special_requirements || '',
    });

    // Create visit
    const visit = await counselingQueries.createCampusVisit({
      school_id,
      lead_id: lead_id || null,
      assigned_to: counselorId,
      visitor_name,
      visitor_phone,
      student_name,
      grade: grade || null,
      number_of_visitors,
      visit_date,
      start_time,
      end_time,
      visit_type: visit_type || 'campus_visit',
      internal_notes: internal_notes || null,
      tour_preferences,
    });

    return res.status(201).json({
      success: true,
      message: 'Campus visit created successfully',
      data: visit,
    });
  } catch (error) {
    console.error('Error in createCampusVisit:', error);

    // Handle double-booking error
    if (error.code === 'DOUBLE_BOOKING') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create campus visit',
      error: error.message,
    });
  }
};

/**
 * GET /api/campus-visits/:id
 * Get a single campus visit by ID
 * Returns: Visit object with lead information
 */
export const getCampusVisit = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const { id } = req.params;

    const visit = await counselingQueries.getCampusVisitById(id, school_id, counselorId);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Campus visit not found',
      });
    }

    return res.json({
      success: true,
      data: visit,
    });
  } catch (error) {
    console.error('Error in getCampusVisit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch campus visit',
      error: error.message,
    });
  }
};

/**
 * PUT /api/counseling/visits/:id
 * Update a campus visit
 * Body: { visitor_name, visitor_phone, student_name, grade, number_of_visitors,
 *         visit_date, start_time, end_time, assigned_to, status, internal_notes, tour_preferences }
 * (Only provided fields will be updated)
 * Returns: Updated visit object
 */
export const updateCampusVisit = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Verify visit exists and belongs to this counselor
    const visit = await counselingQueries.getCampusVisitById(id, school_id, counselorId);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Campus visit not found',
      });
    }

    // Validate date and times if provided
    if (updates.visit_date && !/^\d{4}-\d{2}-\d{2}$/.test(updates.visit_date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visit_date format. Use YYYY-MM-DD',
      });
    }

    if (updates.start_time && !/^\d{2}:\d{2}$/.test(updates.start_time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start_time format. Use HH:MM',
      });
    }

    if (updates.end_time && !/^\d{2}:\d{2}$/.test(updates.end_time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end_time format. Use HH:MM',
      });
    }

    // Validate number_of_visitors if provided
    if (updates.number_of_visitors && updates.number_of_visitors < 1) {
      return res.status(400).json({
        success: false,
        message: 'number_of_visitors must be at least 1',
      });
    }

    const updatedVisit = await counselingQueries.updateCampusVisit(
      id,
      school_id,
      counselorId,
      updates
    );

    return res.json({
      success: true,
      message: 'Campus visit updated successfully',
      data: updatedVisit,
    });
  } catch (error) {
    console.error('Error in updateCampusVisit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update campus visit',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/counseling/visits/:id
 * Delete a campus visit (soft delete via status = 'cancelled')
 * Returns: { success: true, message }
 */
export const deleteCampusVisit = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const { id } = req.params;

    // Verify visit exists and belongs to this counselor
    const visit = await counselingQueries.getCampusVisitById(id, school_id, counselorId);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Campus visit not found',
      });
    }

    await counselingQueries.deleteCampusVisit(id, school_id, counselorId);

    return res.json({
      success: true,
      message: 'Campus visit cancelled successfully',
    });
  } catch (error) {
    console.error('Error in deleteCampusVisit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete campus visit',
      error: error.message,
    });
  }
};

/**
 * GET /api/counseling/slots?date=YYYY-MM-DD
 * Get time slot availability for a specific date
 * Groups visits by start_time and counts total visits at each slot
 * 
 * Query params: date=YYYY-MM-DD (required)
 * 
 * Returns: Array of { start_time, total_visits }
 */
export const getTimeSlotAvailability = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { date } = req.query;

    // Validate date parameter
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter (date) is required. Format: YYYY-MM-DD',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const slots = await counselingQueries.getTimeSlotAvailability(school_id, date);

    return res.json({
      success: true,
      data: slots || [],
    });
  } catch (error) {
    console.error('Error in getTimeSlotAvailability:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch time slot availability',
      error: error.message,
    });
  }
};

/**
 * GET /api/counseling/visits/future
 * Get future visits (visit_date >= CURRENT_DATE and status = 'scheduled')
 */
export const getFutureVisits = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const visits = await counselingQueries.getFutureVisits(school_id, counselorId);
    return res.json({ success: true, data: visits });
  } catch (error) {
    console.error('Error in getFutureVisits:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch future visits', error: error.message });
  }
};

/**
 * GET /api/counseling/visits/missed
 * Get missed visits (visit_date < CURRENT_DATE and status = 'scheduled')
 */
export const getMissedVisits = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const visits = await counselingQueries.getMissedVisits(school_id, counselorId);
    return res.json({ success: true, data: visits });
  } catch (error) {
    console.error('Error in getMissedVisits:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch missed visits', error: error.message });
  }
};

/**
 * PATCH /api/counseling/visits/:id/status
 * Update a visit's status to 'visited' or 'cancelled'
 * Body: { status: 'visited' | 'cancelled' }
 */
export const updateVisitStatus = async (req, res) => {
  try {
    const { school_id } = req.user;
    const counselorId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['visited', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be "visited" or "cancelled"' });
    }

    const updatedVisit = await counselingQueries.updateVisitStatus(id, school_id, counselorId, status);
    return res.json({ success: true, message: 'Visit status updated successfully', data: updatedVisit });
  } catch (error) {
    console.error('Error in updateVisitStatus:', error);
    return res.status(500).json({ success: false, message: 'Failed to update visit status', error: error.message });
  }
};
