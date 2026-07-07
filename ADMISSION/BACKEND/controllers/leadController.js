
import * as leadQueries from '../db/queries/leadQueries.js';
import prisma from '../src/lib/prisma.js';

const serializeBigInt = (data) => {
  return JSON.parse(
    JSON.stringify(
      data,
      (_, value) =>
        typeof value === 'bigint'
          ? Number(value)
          : value
    )
  );
};
/**
 * createLead(req, res, next)
 * POST /api/leads
 * Validates phone is present, inserts new lead, returns 201 with created lead
 */
export const createLead = async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    // Validation: Phone is required
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required." 
      });
    }

    // Determine academic_year_id: prefer request, otherwise use active academic year for the school
    let academic_year_id = req.body.academic_year_id;
    if (!academic_year_id) {
      const yearRes = await prisma.academic_year.findFirst({
        where: {
          school_id: BigInt(req.user.school_id),
          is_active: true
        },
        orderBy: {
          id: 'desc'
        }
      });
      academic_year_id = yearRes?.id;

      // fallback: any academic year for the school
      if (!academic_year_id) {
        const fallback = await prisma.academic_year.findFirst({
          where: {
            school_id: BigInt(req.user.school_id)
          },
          orderBy: {
            id: 'desc'
          }
        });
        academic_year_id = fallback?.id;
      }
    }

    if (!academic_year_id) {
      return res.status(400).json({ success: false, message: 'No academic year configured for this school.' });
    }

    // Build lead data - school_id and created_by come from auth, never from body
    const data = {
      ...req.body,
      school_id: req.user.school_id,
      academic_year_id,
      created_by: req.user.id,
      follow_up_status: req.body.follow_up_status || 'pending'
    };

    const newLead = await leadQueries.createLead(data);

    res.status(201).json({ 
      success: true, 
      data: serializeBigInt(newLead),
      message: "Lead created successfully."
    });
  } catch (error) {
    console.error('Lead Controller Error (createLead):', error);
    next(error);
  }
};

/**
 * getAllLeads(req, res, next)
 * GET /api/leads?follow_up_status=pending&desired_class=Grade5&assigned_to=123
 * Returns array of leads with optional filters, scoped to current school
 */
export const getAllLeads = async (req, res, next) => {
  try {
    const school_id = req.user.school_id;
    const { follow_up_status, desired_class, assigned_to, search, limit } = req.query;

    const leads = await leadQueries.getAllLeads(school_id, {
      follow_up_status,
      desired_class,
      assigned_to,
      search,
      limit: limit ? parseInt(limit, 10) : undefined
    });

    res.status(200).json({ 
      success: true, 
      data: serializeBigInt(leads)
    });
  } catch (error) {
    console.error('Lead Controller Error (getAllLeads):', error);
    next(error);
  }
};

/**
 * getLeadById(req, res, next)
 * GET /api/leads/:id
 * Returns 404 if lead not found, otherwise returns single lead
 */
export const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    const lead = await leadQueries.getLeadById(id, school_id);

    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        message: "Lead not found." 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: serializeBigInt(lead) 
    });
  } catch (error) {
    console.error('Lead Controller Error (getLeadById):', error);
    next(error);
  }
};

/**
 * updateLead(req, res, next)
 * PUT /api/leads/:id
 * Returns 404 if lead not found, otherwise returns updated lead
 */
export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    const updatedLead = await leadQueries.updateLead(id, school_id, req.body);

    if (!updatedLead) {
      return res.status(404).json({ 
        success: false, 
        message: "Lead not found." 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: updatedLead,
      message: "Lead updated successfully."
    });
  } catch (error) {
    console.error('Lead Controller Error (updateLead):', error);
    next(error);
  }
};

/**
 * deleteLead(req, res, next)
 * DELETE /api/leads/:id
 * Returns 204 on success, 404 if not found
 */
export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const school_id = req.user.school_id;

    const success = await leadQueries.deleteLead(id, school_id);

    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: "Lead not found." 
      });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Lead Controller Error (deleteLead):', error);
    next(error);
  }
};

/**
 * getUpcomingFollowups(req, res, next)
 * GET /api/leads/followups/upcoming
 * Returns upcoming follow-ups for dashboard widget
 * Query params: ?interval=2&limit=10
 * 
 * Response format:
 * [
 *   {
 *     id,
 *     first_name,
 *     last_name,
 *     phone,
 *     email,
 *     follow_up_status ('pending', 'contacted', 'interested'),
 *     last_contacted_at,
 *     next_follow_up_date (calculated),
 *     assigned_to,
 *     desired_class,
 *     priority ('overdue', 'today', 'upcoming')
 *   }
 * ]
 */
export const getUpcomingFollowups = async (req, res, next) => {
  try {
    const school_id = req.user.school_id;
    const interval = req.query.interval ? parseInt(req.query.interval) : 2;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    // Validate query parameters
    if (isNaN(interval) || interval < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid interval parameter. Must be a non-negative number."
      });
    }

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive number."
      });
    }

    const followups = await leadQueries.getUpcomingFollowups(school_id, interval, limit);

    res.status(200).json({
      success: true,
      data: followups,
      count: followups.length
    });
  } catch (error) {
    console.error('Lead Controller Error (getUpcomingFollowups):', error);
    next(error);
  }
};
