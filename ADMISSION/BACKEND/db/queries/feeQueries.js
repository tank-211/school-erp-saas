import prisma from '../../src/lib/prisma.js';

/**
 * Convert Prisma BigInt values to strings.
 * Useful before sending database records through JSON.
 */
const serializeBigInt = (value) => {
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    )
  );
};

/**
 * getDashboardStats(school_id)
 * Aggregate total_amount, paid_amount, and pending_amount
 * from invoice table.
 */
export const getDashboardStats = async (school_id) => {
  const schoolId = BigInt(school_id);

  console.log("💰 [FEES] Checking school:", schoolId.toString());

  // Completed admissions
  const admissions = await prisma.admission.findMany({
    where: {
      school_id: schoolId,
      is_completed: true,
    },
    select: {
      id: true,
      student_id: true,
      academic_year_id: true,
      class_id: true,
      section_id: true,
      status: true,
      is_completed: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  console.log(
    "🎓 [FEES] COMPLETED ADMISSIONS:",
    admissions.map((item) => ({
      id: item.id.toString(),
      student_id: item.student_id?.toString(),
      academic_year_id: item.academic_year_id?.toString(),
      class_id: item.class_id?.toString(),
      section_id: item.section_id?.toString(),
      status: item.status,
      is_completed: item.is_completed,
    }))
  );

  // Fee structures for this school
  const feeStructures = await prisma.fee_structure.findMany({
    where: {
      school_id: schoolId,
      is_active: true,
    },
    include: {
      school_class: true,
      academic_year: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  console.log(
    "📋 [FEES] ACTIVE FEE STRUCTURES:",
    feeStructures.map((item) => ({
      id: item.id.toString(),
      school_id: item.school_id.toString(),
      academic_year_id: item.academic_year_id.toString(),
      class_id: item.class_id.toString(),
      fee_type: item.fee_type,
      amount: item.amount?.toString(),
      due_date: item.due_date,
      class_name: item.school_class?.class_name,
    }))
  );

  // Existing assignments
  const assignments = await prisma.student_fee_assignment.findMany({
    where: {
      school_id: schoolId,
    },
    include: {
      fee_structure: true,
    },
  });

  console.log(
    "💵 [FEES] FEE ASSIGNMENTS:",
    assignments.map((item) => ({
      id: item.id.toString(),
      student_id: item.student_id.toString(),
      admission_id: item.admission_id.toString(),
      fee_structure_id: item.fee_structure_id.toString(),
      amount: item.amount?.toString(),
      final_amount: item.final_amount?.toString(),
      status: item.status,
    }))
  );

  // Existing invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      school_id: schoolId,
    },
    select: {
      id: true,
      student_id: true,
      invoice_number: true,
      total_amount: true,
      paid_amount: true,
      pending_amount: true,
      status: true,
    },
  });

  console.log(
    "🧾 [FEES] INVOICES:",
    invoices.map((item) => ({
      id: item.id.toString(),
      student_id: item.student_id.toString(),
      invoice_number: item.invoice_number,
      total_amount: item.total_amount?.toString(),
      paid_amount: item.paid_amount?.toString(),
      pending_amount: item.pending_amount?.toString(),
      status: item.status,
    }))
  );

  // Dashboard stats
  const stats = await prisma.invoice.aggregate({
    where: {
      school_id: schoolId,
    },
    _sum: {
      total_amount: true,
      paid_amount: true,
      pending_amount: true,
    },
  });

  return {
    total_amount: Number(stats._sum.total_amount || 0),
    paid_amount: Number(stats._sum.paid_amount || 0),
    pending_amount: Number(stats._sum.pending_amount || 0),
  };
};

/**
 * getTransactions(school_id)
 * Fetch invoices with student information.
 */
export const getTransactions = async (school_id) => {
  const transactions = await prisma.invoice.findMany({
    where: {
      school_id: BigInt(school_id),
    },
    include: {
      student: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return serializeBigInt(transactions);
};

/**
 * getInvoiceById(invoice_id, school_id)
 * Fetch full invoice details with:
 * - school
 * - student
 * - parent
 * - payment history
 */
export const getInvoiceById = async (
  invoice_id,
  school_id
) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: BigInt(invoice_id),
      school_id: BigInt(school_id),
    },
    include: {
      school: true,
      student: {
        include: {
          parent_detail: true,
        },
      },
      payment: {
        orderBy: {
          created_at: 'desc',
        },
      },
    },
  });

  return invoice ? serializeBigInt(invoice) : null;
};

/**
 * generateInvoiceNumber(school_id)
 * Generate invoice number for the current year.
 */
export const generateInvoiceNumber = async (school_id) => {
  const year = new Date().getFullYear();

  const count = await prisma.invoice.count({
    where: {
      school_id: BigInt(school_id),
      created_at: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * createInvoice(invoiceData)
 * Insert a new invoice record.
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
      created_by: invoiceData.created_by?.toString(),
    },
  });
};

/**
 * createAuditLog(auditData)
 * Create an audit log entry.
 */
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
      user_agent: auditData.user_agent,
    },
  });
};

/**
 * getStudentFeeAssignments(student_id, school_id)
 * Get fee assignments for a student with concessions applied.
 */
export const getStudentFeeAssignments = async (
  student_id,
  school_id
) => {
  return await prisma.student_fee_assignment.findMany({
    where: {
      student_id: BigInt(student_id),
      school_id: BigInt(school_id),
    },
    include: {
      fee_structure: true,
    },
  });
};