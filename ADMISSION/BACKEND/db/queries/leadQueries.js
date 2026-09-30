import prisma from '../../src/lib/prisma.js';

export const createLead = async (data) => {
  return await prisma.lead.create({
    data: {
      school_id: BigInt(data.school_id),
      academic_year_id: data.academic_year_id
        ? BigInt(data.academic_year_id)
        : null,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      desired_class: data.desired_class,
      source: data.source,
      follow_up_status: data.follow_up_status || 'pending',
      notes: data.notes,
      assigned_to: data.assigned_to ? data.assigned_to.toString() : null,
      created_by: data.created_by
        ? data.created_by.toString()
        : null
    }
  });
};

export const getAllLeads = async (school_id, filters = {}) => {
  const {
    follow_up_status,
    desired_class,
    assigned_to,
    search,
    limit
  } = filters;

  const where = {
    school_id: BigInt(school_id)
  };

  if (follow_up_status) where.follow_up_status = follow_up_status;
  if (desired_class) where.desired_class = desired_class;
  if (assigned_to) where.assigned_to = assigned_to.toString();

  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }

  return await prisma.lead.findMany({
    where,
    orderBy: {
      created_at: 'desc'
    },
    ...(limit ? { take: Number(limit) } : {})
  });
};

export const getLeadById = async (id, school_id) => {
  return await prisma.lead.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(school_id)
    }
  });
};

export const updateLead = async (id, school_id, data) => {
  const existingLead = await prisma.lead.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(school_id)
    }
  });

  if (!existingLead) return null;

  return await prisma.lead.update({
    where: {
      id: BigInt(id)
    },
    data: {
      ...(data.first_name !== undefined && { first_name: data.first_name }),
      ...(data.last_name !== undefined && { last_name: data.last_name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.desired_class !== undefined && {
        desired_class: data.desired_class
      }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.follow_up_status !== undefined && {
        follow_up_status: data.follow_up_status
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.assigned_to !== undefined && {
        assigned_to: data.assigned_to
          ? data.assigned_to.toString()
          : null
      }),
      updated_at: new Date()
    }
  });
};

export const deleteLead = async (id, school_id) => {
  const existingLead = await prisma.lead.findFirst({
    where: {
      id: BigInt(id),
      school_id: BigInt(school_id)
    }
  });

  if (!existingLead) return false;

  await prisma.lead.delete({
    where: {
      id: BigInt(id)
    }
  });

  return true;
};

// Real follow-ups: the next_follow_up_date set on each open lead's most recent
// activity that scheduled one (a later activity replaces an earlier plan).
// `followupInterval` is accepted for compatibility and no longer used.
export const getUpcomingFollowups = async (
  school_id,
  followupInterval = 2,
  limit = 10
) => {
  void followupInterval;
  const activities = await prisma.lead_activity.findMany({
    where: {
      next_follow_up_date: { not: null },
      lead: {
        school_id: BigInt(school_id),
        NOT: { follow_up_status: { in: ['admitted', 'converted', 'lost', 'inactive', 'not-interested', 'not_interested'] } }
      }
    },
    orderBy: { created_at: 'desc' },
    select: {
      lead_id: true,
      activity_type: true,
      notes: true,
      next_follow_up_date: true,
      scheduled_time: true,
      created_at: true,
      lead: true
    }
  });

  const latest = new Map();
  for (const activity of activities) {
    const key = String(activity.lead_id);
    if (!latest.has(key)) latest.set(key, activity);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  return [...latest.values()]
    .sort((x, y) => new Date(x.next_follow_up_date) - new Date(y.next_follow_up_date))
    .slice(0, Number(limit))
    .map((activity) => {
      const dateKey = new Date(activity.next_follow_up_date).toISOString().slice(0, 10);
      return {
        ...activity.lead,
        next_follow_up_date: activity.next_follow_up_date,
        next_action: activity.activity_type,
        next_action_notes: activity.notes,
        priority: dateKey < todayKey ? 'overdue' : dateKey === todayKey ? 'today' : 'upcoming'
      };
    });
};