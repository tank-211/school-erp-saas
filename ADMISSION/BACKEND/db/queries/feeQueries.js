import prisma from '../../src/lib/prisma.js';
import { newInvoiceNumber } from '../../services/admissionFeeService.js';

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

  // First day of the current month in India (payment_date is a DATE column)
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
    .format(new Date())
    .split('-')
    .map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));

  const [stats, thisMonth] = await Promise.all([
    prisma.invoice.aggregate({
      where: { school_id: schoolId },
      _sum: { total_amount: true, paid_amount: true, pending_amount: true },
    }),
    // Same rule as the FEES app: every payment that is not cancelled counts
    prisma.payment.aggregate({
      where: {
        school_id: schoolId,
        payment_date: { gte: monthStart },
        status: { not: 'cancelled' },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    total_amount: Number(stats._sum.total_amount || 0),
    paid_amount: Number(stats._sum.paid_amount || 0),
    pending_amount: Number(stats._sum.pending_amount || 0),
    this_month_amount: Number(thisMonth._sum.amount || 0),
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
      // Only what the list shows: name, admission number and current class
      student: {
        select: {
          id: true,
          first_name: true,
          middle_name: true,
          last_name: true,
          admission_number: true,
          admission: {
            select: { school_class: { select: { class_name: true } } },
            orderBy: { id: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return serializeBigInt(
    transactions.map(({ student, ...invoice }) => ({
      ...invoice,
      student_name: student
        ? [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')
        : null,
      admission_number: student?.admission_number || null,
      class_name: student?.admission?.[0]?.school_class?.class_name || null,
    }))
  );
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
          // Current class and section, for the "Bill To" block
          admission: {
            select: {
              school_class: { select: { class_name: true } },
              section: { select: { section_name: true } },
            },
            orderBy: { id: 'desc' },
            take: 1,
          },
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
 * generateInvoiceNumber()
 * invoice_number is unique across all schools, so a per-school yearly counter
 * (INV-2026-0001) collides between schools. Use the shared global format.
 */
export const generateInvoiceNumber = async () => newInvoiceNumber();

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