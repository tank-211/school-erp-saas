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

export const getUpcomingFollowups = async (
  school_id,
  followupInterval = 2,
  limit = 10
) => {
  const leads = await prisma.lead.findMany({
    where: {
      school_id: BigInt(school_id),
      follow_up_status: {
        in: ['pending', 'contacted', 'interested']
      },
      last_contacted_at: {
        not: null
      }
    },
    take: Number(limit)
  });

  return leads.map((lead) => {
    const nextDate = new Date(lead.last_contacted_at);
    nextDate.setDate(nextDate.getDate() + Number(followupInterval));

    let priority = 'upcoming';

    if (nextDate < new Date()) {
      priority = 'overdue';
    } else if (
      nextDate.toDateString() === new Date().toDateString()
    ) {
      priority = 'today';
    }

    return {
      ...lead,
      next_follow_up_date: nextDate,
      priority
    };
  });
};