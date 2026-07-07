import prisma from '../../src/lib/prisma.js';

/**
 * getDashboardStats(school_id)
 * Aggregate total_amount, paid_amount, and pending_amount from invoice table
 */
export const getDashboardStats = async (school_id) => {
  const stats = await prisma.invoice.aggregate({
    where: {
      school_id: BigInt(school_id)
    },
    _sum: {
      total_amount: true,
      paid_amount: true,
      pending_amount: true
    }
  });

  return {
    total_amount: stats._sum.total_amount || 0,
    paid_amount: stats._sum.paid_amount || 0,
    pending_amount: stats._sum.pending_amount || 0
  };
};

/**
 * getTransactions(school_id)
 * Fetch invoices joined with student and school_class
 */
export const getTransactions = async (school_id) => {
  return await prisma.invoice.findMany({
    where: {
      school_id: BigInt(school_id)
    },
    include: {
      student: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
};

/**
 * getInvoiceById(invoice_id, school_id)
 * Fetch full invoice details with school, student, parent, and payment history
 */
export const getInvoiceById = async (
  invoice_id,
  school_id
) => {
  return await prisma.invoice.findFirst({
    where: {
      id: BigInt(invoice_id),
      school_id: BigInt(school_id)
    },
    include: {
      school: true,
      student: {
        include: {
          parent_detail: true
        }
      },
      payment: {
        orderBy: {
          created_at: 'desc'
        }
      }
    }
  });
};
/**
 * generateInvoiceNumber(school_id)
 * Generate unique invoice number
 */
export const generateInvoiceNumber = async (school_id) => {
  const count = await prisma.invoice.count({
    where: {
      school_id: BigInt(school_id),
      created_at: {
        gte: new Date(new Date().getFullYear(), 0, 1),
        lt: new Date(new Date().getFullYear() + 1, 0, 1)
      }
    }
  });

  const year = new Date().getFullYear();

  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * createInvoice(invoiceData)
 * Insert new invoice record
 
 */


export const createInvoice = async (invoiceData) => {
  return await prisma.invoice.create({
    data: {
      school_id: BigInt(invoiceData.school_id),
      student_id: BigInt(invoiceData.student_id),
      invoice_number: invoiceData.invoice_number,
      invoice_date: new Date(invoiceData.invoice_date),
      due_date: new Date(invoiceData.due_date),
      total_amount: Number(invoiceData.total_amount),
      paid_amount: Number(invoiceData.paid_amount || 0),
      pending_amount: Number(invoiceData.pending_amount),
      notes: invoiceData.notes,
      created_by: invoiceData.created_by?.toString()
    }
  });
};



export const createAuditLog = async (auditData) => {
  return await prisma.audit_log.create({
    data: {
      school_id: BigInt(auditData.school_id),
      user_id: auditData.user_id
        ? BigInt(auditData.user_id)
        : null,
      action: auditData.action,
      entity: auditData.entity,
      entity_id: BigInt(auditData.entity_id),
      status: auditData.status,
      old_data: auditData.old_data,
      new_data: auditData.new_data,
      change_summary: auditData.change_summary,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent
    }
  });
};

/**
 * getStudentFeeAssignments(student_id, school_id)
 * Get fee assignments for a student with concessions applied
 */
export const getStudentFeeAssignments = async (
  student_id,
  school_id
) => {
  return await prisma.student_fee_assignment.findMany({
    where: {
      student_id: BigInt(student_id),
      school_id: BigInt(school_id)
    },
    include: {
      fee_structure: true
    }
  });
};
