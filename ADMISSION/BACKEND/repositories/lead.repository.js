import prisma from '../src/lib/prisma.js';

/**
 * Repository: lead
 * Handles DB CRUD for lead records.
 */

const insertLead = async ({
  school_id,
  academic_year_id,
  first_name,
  last_name,
  email,
  phone,
  desired_class,
  source,
  assigned_to,
  notes,
  created_by = 'admin',
}) => {
  const lead = await prisma.lead.create({
    data: {
      school_id: BigInt(school_id),
      academic_year_id: BigInt(academic_year_id),
      first_name,
      last_name,
      email,
      phone,
      desired_class,
      source,
      assigned_to: assigned_to
        ? BigInt(assigned_to)
        : null,
      notes,
      created_by,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone: true,
      source: true,
      assigned_to: true,
      created_at: true,
    },
  });

  return lead;
};

export default {
  insertLead,
};