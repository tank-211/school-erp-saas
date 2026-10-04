/**
 * db/queries/counselingQueries.js
 * SQL execution functions for Counseling Workspace management
 * Uses parameterized queries to prevent SQL injection
 * All functions operate at the database level with no business logic
 */

import prisma from '../../src/lib/prisma.js';

// campus_visit.start_time / end_time are TIME columns: Prisma needs a Date
// (the date part is ignored), not the "HH:MM" text the forms send.
export const toTimeValue = (hhmm) =>
  hhmm instanceof Date ? hhmm : new Date(`1970-01-01T${String(hhmm).slice(0, 5)}:00.000Z`);

// counselorId null = every visit of the school (admins); otherwise the counselor's own
const ownedBy = (counselorId) =>
  counselorId === null ? {} : { assigned_to: BigInt(counselorId) };

// Cancelled and no-show rows still occupy unique_counselor_slot in the database
const FREED = ['cancelled', 'no_show'];

const doubleBooking = () => {
  const error = new Error('That counselor already has a visit at this time');
  error.code = 'DOUBLE_BOOKING';
  return error;
};

// Two requests for the same slot at once: the database constraint decides
const asDoubleBooking = (error) => (error?.code === 'P2002' ? doubleBooking() : error);

/**
 * getDashboardStats(schoolId, counselorId)
 * Get dashboard statistics: assigned leads count, upcoming visits, pending tasks
 * Uses Promise.all() for parallel execution
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor user ID
 * @returns {Promise<Object>} { assignedLeads: 0, upcomingVisits: 0, pendingTasks: 0 }
 */
export const getDashboardStats = async (schoolId, counselorId, visitOwnerId = counselorId) => {
  const [assignedLeads, upcomingVisits, pendingTasks] =
    await Promise.all([
      // Leads assigned to this counselor (lead.assigned_to holds the user id as text)
      prisma.lead.count({
        where: {
          school_id: BigInt(schoolId),
          assigned_to: String(counselorId)
        }
      }),

      prisma.campus_visit.count({
        where: {
          school_id: BigInt(schoolId),
          ...ownedBy(visitOwnerId),
          visit_date: {
            gte: new Date()
          }
        }
      }),

      prisma.task.count({
        where: {
          school_id: BigInt(schoolId),
          assigned_to: BigInt(counselorId),
          is_done: false
        }
      })
    ]);

  return {
    assignedLeads,
    upcomingVisits,
    pendingTasks
  };
};

/**
 * getVisitsForCounselor(schoolId, counselorId, filterToday = false)
 * Fetch all campus visits for the counselor
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor user ID
 * @param {Boolean} filterToday - If true, only return today's visits
 * @returns {Promise<Array>} Array of visit records with lead and student info
 */
export const getVisitsForCounselor = async (
  schoolId,
  counselorId,
  filterToday = false
) => {
  const where = {
    school_id: BigInt(schoolId),
    ...ownedBy(counselorId)
  };

  if (filterToday) {
    const today = new Date();
    today.setHours(0,0,0,0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    where.visit_date = {
      gte: today,
      lt: tomorrow
    };
  }

  return await prisma.campus_visit.findMany({
    where,
    include: {
      lead: true
    },
    orderBy: [
      { visit_date: 'asc' },
      { start_time: 'asc' }
    ]
  });
};

/**
 * searchLeads(schoolId, counselorId, query)
 * Search leads by name or lead number (lead ID)
 * Returns lead_id, student_name, parent_name, phone
 * CRITICAL: Prevent crash from undefined query
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor user ID (for assigned leads)
 * @param {String} query - Search term (name or lead ID)
 * @returns {Promise<Array>} Array of matching leads
 */
export const searchLeads = async (
  schoolId,
  counselorId,
  query
) => {
  const searchText = query?.trim() || '';

  const leads = await prisma.lead.findMany({
    where: {
      school_id: BigInt(schoolId),

      // No search text: the counselor's own leads (lead.assigned_to holds the user id)
      ...(!searchText && { assigned_to: String(counselorId) }),

      ...(searchText && {
        OR: [
          {
            first_name: {
              contains: searchText,
              mode: 'insensitive'
            }
          },
          {
            last_name: {
              contains: searchText,
              mode: 'insensitive'
            }
          },
          {
            phone: {
              contains: searchText,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: searchText,
              mode: 'insensitive'
            }
          }
        ]
      })
    },

    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone: true,
      email: true,
      desired_class: true,
      follow_up_status: true,
      created_at: true
    },

    orderBy: {
      created_at: 'desc'
    },

    take: 20
  });

  // Next scheduled follow-up per lead, from the activity log
  const today = new Date(new Date().toISOString().slice(0, 10));
  const upcoming = leads.length
    ? await prisma.lead_activity.findMany({
        where: { lead_id: { in: leads.map((l) => l.id) }, next_follow_up_date: { gte: today } },
        orderBy: { next_follow_up_date: 'asc' },
        select: { lead_id: true, activity_type: true, next_follow_up_date: true },
      })
    : [];
  const nextByLead = new Map();
  for (const a of upcoming) {
    if (!nextByLead.has(String(a.lead_id))) nextByLead.set(String(a.lead_id), a);
  }

  return leads.map((lead) => {
    const next = nextByLead.get(String(lead.id));
    return {
      ...lead,
      next_follow_up_date: next?.next_follow_up_date || null,
      next_action: next?.activity_type || null,
    };
  });
};

/**
 * createCampusVisit(data)
 * Create a new campus visit with unique_counselor_slot constraint check
 * Constraint: One counselor can't have multiple visits at the same time
 * Validates all required fields before insert
 * @param {Object} data - Visit data { school_id, lead_id, assigned_to, visitor_name, visitor_phone,
 *                        student_name, grade, number_of_visitors, visit_date, start_time, end_time,
 *                        visit_type, internal_notes, tour_preferences }
 * @returns {Promise<Object>} The newly created visit record
 */
export const createCampusVisit = async (data) => {
  const fields = {
    lead_id: data.lead_id ? BigInt(data.lead_id) : null,

    visitor_name: data.visitor_name,
    visitor_phone: data.visitor_phone,

    student_name: data.student_name || null,
    grade: data.grade || null,

    number_of_visitors: data.number_of_visitors || 1,

    end_time: toTimeValue(data.end_time),

    visit_type: data.visit_type || null,

    status: 'scheduled',

    internal_notes: data.internal_notes || null,

    tour_preferences: data.tour_preferences || null
  };

  const slot = {
    school_id: BigInt(data.school_id),
    assigned_to: BigInt(data.assigned_to),
    visit_date: new Date(data.visit_date),
    start_time: toTimeValue(data.start_time)
  };

  const existingVisit = await prisma.campus_visit.findFirst({ where: slot });

  if (existingVisit && !FREED.includes(existingVisit.status)) {
    throw doubleBooking();
  }

  try {
    if (existingVisit) {
      // The slot's row belongs to a cancelled visit: it becomes the new booking
      const now = new Date();
      return await prisma.campus_visit.update({
        where: { id: existingVisit.id },
        data: {
          ...fields,
          created_by: data.created_by ? BigInt(data.created_by) : null,
          created_at: now,
          updated_at: now
        }
      });
    }

    return await prisma.campus_visit.create({
      data: {
        ...slot,
        ...fields,
        created_by: data.created_by ? BigInt(data.created_by) : null
      }
    });
  } catch (error) {
    throw asDoubleBooking(error);
  }
};
/**
 * getCampusVisitById(id, schoolId, counselorId)
 * Get a single campus visit by ID
 * @param {Number} id - Visit ID
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor ID (for authorization)
 * @returns {Promise<Object|undefined>} Visit record or undefined if not found
 */
export const getCampusVisitById = async (
  id,
  schoolId,
  counselorId
) => {
  return await prisma.campus_visit.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(schoolId),
      ...ownedBy(counselorId)
    },
    include: {
      lead: true
    }
  });
};

/**
 * updateCampusVisit(id, schoolId, counselorId, updates)
 * Update a campus visit
 * Prevents update with no fields and validates allowed fields
 * @param {Number} id - Visit ID
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor ID (assigned_to)
 * @param {Object} updates - Fields to update { visitor_name, visitor_phone, student_name, grade,
 *                           number_of_visitors, visit_date, start_time, end_time, assigned_to,
 *                           visit_type, status, internal_notes, tour_preferences }
 * @returns {Promise<Object>} Updated visit record
 */
export const updateCampusVisit = async (
  id,
  schoolId,
  counselorId,
  updates
) => {
  const visit = await prisma.campus_visit.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(schoolId),
      ...ownedBy(counselorId)
    }
  });

  if (!visit) {
    throw new Error('Visit not found');
  }

  // The slot this visit will occupy after the change
  const slot = {
    school_id: BigInt(schoolId),
    assigned_to: updates.assigned_to !== undefined ? BigInt(updates.assigned_to) : visit.assigned_to,
    visit_date: updates.visit_date !== undefined ? new Date(updates.visit_date) : visit.visit_date,
    start_time: updates.start_time !== undefined ? toTimeValue(updates.start_time) : visit.start_time
  };
  const clash = await prisma.campus_visit.findFirst({
    where: { ...slot, NOT: { id: visit.id } }
  });

  if (clash && !FREED.includes(clash.status)) {
    throw doubleBooking();
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (clash) {
        // A cancelled visit still holds the slot: remove it so this one can move in
        await tx.campus_visit.deleteMany({
          where: { id: clash.id, school_id: BigInt(schoolId), status: { in: FREED } }
        });
      }
      return await applyVisitUpdate(tx, id, updates);
    });
  } catch (error) {
    throw asDoubleBooking(error);
  }
};

const applyVisitUpdate = (tx, id, updates) =>
  tx.campus_visit.update({
    where: {
      id: BigInt(id)
    },
    data: {
      ...(updates.visitor_name !== undefined && {
        visitor_name: updates.visitor_name
      }),

      ...(updates.visitor_phone !== undefined && {
        visitor_phone: updates.visitor_phone
      }),

      ...(updates.student_name !== undefined && {
        student_name: updates.student_name
      }),

      ...(updates.grade !== undefined && {
        grade: updates.grade
      }),

      ...(updates.number_of_visitors !== undefined && {
        number_of_visitors: updates.number_of_visitors
      }),

      ...(updates.visit_date !== undefined && {
        visit_date: new Date(updates.visit_date)
      }),

      ...(updates.start_time !== undefined && {
        start_time: toTimeValue(updates.start_time)
      }),

      ...(updates.end_time !== undefined && {
        end_time: toTimeValue(updates.end_time)
      }),

      // assigned_to is validated by the controller (same school, active staff)
      ...(updates.assigned_to !== undefined && {
        assigned_to: BigInt(updates.assigned_to)
      }),

      ...(updates.visit_type !== undefined && {
        visit_type: updates.visit_type
      }),

      ...(updates.status !== undefined && {
        status: updates.status
      }),

      ...(updates.internal_notes !== undefined && {
        internal_notes: updates.internal_notes
      }),

      ...(updates.tour_preferences !== undefined && {
        tour_preferences: updates.tour_preferences
      }),

      updated_at: new Date()
    }
  });
/**
 * deleteCampusVisit(id, schoolId, counselorId)
 * Delete a campus visit (soft delete via status)
 * @param {Number} id - Visit ID
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor ID
 * @returns {Promise<void>}
 */
export const deleteCampusVisit = async (
  id,
  schoolId,
  counselorId
) => {
  return await prisma.campus_visit.updateMany({
    where: {
      id: BigInt(id),
      school_id: BigInt(schoolId),
      ...ownedBy(counselorId)
    },
    data: {
      status: 'cancelled',
      updated_at: new Date()
    }
  });
};
/**
 * getTimeSlotAvailability(schoolId, date)
 * Get time slot availability for a specific date
 * Groups visits by start_time and counts total visits at each slot
 * Excludes cancelled visits
 * @param {Number} schoolId - School ID
 * @param {String} date - Visit date (YYYY-MM-DD format)
 * @returns {Promise<Array>} Array of { start_time, total_visits }
 */
export const getTimeSlotAvailability = async (
  schoolId,
  date
) => {
  const visits = await prisma.campus_visit.findMany({
    where: {
      school_id: BigInt(schoolId),
      visit_date: new Date(date),
      NOT: {
        status: 'cancelled'
      }
    },
    select: {
      start_time: true
    }
  });

  const grouped = {};

  visits.forEach((visit) => {
    // TIME column: Prisma returns 1970-01-01THH:MM:00Z; the page works in "HH:MM"
    const key = new Date(visit.start_time).toISOString().slice(11, 16);

    grouped[key] = (grouped[key] || 0) + 1;
  });

  return Object.entries(grouped).map(
    ([start_time, total_visits]) => ({
      start_time,
      total_visits
    })
  );
};
/**
 * getFutureVisits(schoolId, counselorId)
 * Get future visits (visit_date >= CURRENT_DATE and status = 'scheduled')
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor user ID
 * @returns {Promise<Array>} Array of upcoming visits
 */
export const getFutureVisits = async (
  schoolId,
  counselorId
) => {
  return await prisma.campus_visit.findMany({
    where: {
      school_id: BigInt(schoolId),
      ...ownedBy(counselorId),
      status: 'scheduled',
      visit_date: {
        gte: new Date()
      }
    },
    include: {
      lead: true
    },
    orderBy: [
      { visit_date: 'asc' },
      { start_time: 'asc' }
    ]
  });
};

/**
 * getMissedVisits(schoolId, counselorId)
 * Get missed visits (visit_date < CURRENT_DATE and status = 'scheduled')
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor user ID
 * @returns {Promise<Array>} Array of missed visits
 */
export const getMissedVisits = async (
  schoolId,
  counselorId
) => {
  return await prisma.campus_visit.findMany({
    where: {
      school_id: BigInt(schoolId),
      ...ownedBy(counselorId),
      status: 'scheduled',
      visit_date: {
        lt: new Date()
      }
    },
    include: {
      lead: true
    },
    orderBy: [
      { visit_date: 'desc' },
      { start_time: 'desc' }
    ]
  });
};

/**
 * updateVisitStatus(id, schoolId, counselorId, status)
 * Update a campus visit's status to 'visited' or 'cancelled'
 * @param {Number} id - Visit ID
 * @param {Number} schoolId - School ID
 * @param {Number} counselorId - Counselor user ID
 * @param {String} status - The new status
 * @returns {Promise<Object>} Updated visit record
 */
export const updateVisitStatus = async (
  id,
  schoolId,
  counselorId,
  status
) => {
  return await prisma.campus_visit.updateMany({
    where: {
      id: BigInt(id),
      school_id: BigInt(schoolId),
      ...ownedBy(counselorId)
    },
    data: {
      status,
      updated_at: new Date()
    }
  });
};