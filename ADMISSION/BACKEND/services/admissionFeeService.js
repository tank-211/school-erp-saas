/**
 * services/admissionFeeService.js
 *
 * Links a completed admission to fees: every active fee structure of the
 * admission's class and academic year becomes a student_fee_assignment, and the
 * newly assigned fees are billed on one invoice. The FEES app reads these same
 * tables (invoice, student_fee_assignment), so the student shows up there with
 * the amount due.
 *
 * Safe to run more than once: fee structures already assigned to the admission
 * are skipped (student_fee_assignment is unique on admission_id + fee_structure_id),
 * so a second run only bills fee structures added since the last run.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
// Used when none of the assigned fee structures has a due date of its own.
const DEFAULT_DUE_DAYS = 15;

const toPaise = (value) => Math.round(Number(value || 0) * 100);
const fromPaise = (paise) => (paise / 100).toFixed(2);

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// Same format as the FEES app (FEES/backend/src/services/invoiceService.ts).
// invoice_number is unique across all schools, so it must not be a per-school counter.
export const newInvoiceNumber = () =>
  `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

/**
 * Assign fees for one admission, inside the caller's transaction.
 *
 * @param tx        Prisma transaction client (or prisma itself)
 * @param schoolId  school of the logged-in user (BigInt or numeric string)
 * @param admissionId
 * @param actor     who triggered it, stored in invoice.created_by
 * @returns {{ status: 'assigned'|'already_assigned'|'no_fee_structure',
 *             fee_types: string[], total_amount: string|null,
 *             invoice_id: string|null, invoice_number: string|null }}
 */
export const assignAdmissionFees = async (tx, { schoolId, admissionId, actor }) => {
  const sid = BigInt(schoolId);

  const admission = await tx.admission.findFirst({
    where: { id: BigInt(admissionId), school_id: sid },
    select: { id: true, student_id: true, class_id: true, academic_year_id: true },
  });
  if (!admission) {
    const error = new Error('Admission not found');
    error.status = 404;
    throw error;
  }

  const structures = await tx.fee_structure.findMany({
    where: {
      school_id: sid,
      class_id: admission.class_id,
      academic_year_id: admission.academic_year_id,
      // is_active is nullable with default true; only an explicit false switches a fee off
      OR: [{ is_active: true }, { is_active: null }],
    },
    orderBy: { id: 'asc' },
  });

  const empty = { fee_types: [], total_amount: null, invoice_id: null, invoice_number: null };
  if (!structures.length) {
    return { status: 'no_fee_structure', ...empty };
  }

  const existing = await tx.student_fee_assignment.findMany({
    where: { admission_id: admission.id, school_id: sid },
    select: { fee_structure_id: true },
  });
  const assigned = new Set(existing.map((a) => String(a.fee_structure_id)));
  const toAssign = structures.filter((s) => !assigned.has(String(s.id)));

  if (!toAssign.length) {
    return { status: 'already_assigned', ...empty };
  }

  for (const structure of toAssign) {
    await tx.student_fee_assignment.create({
      data: {
        school_id: sid,
        student_id: admission.student_id,
        admission_id: admission.id,
        fee_structure_id: structure.id,
        amount: structure.amount,
        due_date: structure.due_date || null,
        concession_percentage: 0,
        concession_amount: 0,
        final_amount: structure.amount,
        // Billed on the invoice created just below (or nothing to bill when the total is 0)
        status: 'invoiced',
      },
    });
  }

  const totalPaise = toAssign.reduce((sum, s) => sum + toPaise(s.amount), 0);
  const feeTypes = toAssign.map((s) => s.fee_type);

  // A zero total (all fee structures at 0) needs no invoice.
  if (totalPaise <= 0) {
    return { status: 'assigned', ...empty, fee_types: feeTypes, total_amount: fromPaise(0) };
  }

  // Due on the earliest fee due date, but never before today; otherwise in DEFAULT_DUE_DAYS days.
  const today = startOfToday();
  const dueDates = toAssign
    .map((s) => (s.due_date ? new Date(s.due_date) : null))
    .filter((d) => d && !Number.isNaN(d.getTime()));
  const earliest = dueDates.length ? new Date(Math.min(...dueDates.map((d) => d.getTime()))) : null;
  const dueDate = earliest
    ? (earliest < today ? today : earliest)
    : new Date(today.getTime() + DEFAULT_DUE_DAYS * DAY_MS);

  const total = fromPaise(totalPaise);
  const invoice = await tx.invoice.create({
    data: {
      school_id: sid,
      student_id: admission.student_id,
      invoice_number: newInvoiceNumber(),
      invoice_date: today,
      due_date: dueDate,
      total_amount: total,
      paid_amount: 0,
      pending_amount: total,
      status: 'unpaid',
      notes: `Admission fees: ${feeTypes.join(', ')}`,
      created_by: actor ? String(actor).slice(0, 100) : null,
    },
    select: { id: true, invoice_number: true },
  });

  return {
    status: 'assigned',
    fee_types: feeTypes,
    total_amount: total,
    invoice_id: String(invoice.id),
    invoice_number: invoice.invoice_number,
  };
};

/** One line for the user, e.g. after completing an admission. */
export const describeFeeResult = (fees) => {
  if (!fees) return '';
  if (fees.status === 'no_fee_structure') {
    return 'No fee structure is set up for this class and academic year yet, so no fees were assigned. Add one in the Fees app, then assign fees from Fees & Payments.';
  }
  if (fees.status === 'already_assigned') {
    return 'Fees were already assigned to this admission.';
  }
  if (fees.invoice_number) {
    return `Invoice ${fees.invoice_number} created for Rs ${fees.total_amount} (${fees.fee_types.join(', ')}).`;
  }
  return `Fees assigned (${fees.fee_types.join(', ')}); the total is 0, so no invoice was created.`;
};

/**
 * Fee assignments of the school that have not been billed on any invoice yet.
 *
 * status 'invoiced' marks billed assignments. Assignments created by the
 * admission link before that status existed are still 'pending' although they
 * were billed straight away: those are recognised by the "Admission fees: ..."
 * invoice for the same student created at (almost) the same time.
 */
const LINK_WINDOW_MS = 5 * 60 * 1000;

export const findUninvoicedAssignments = async (db, schoolId, { studentId } = {}) => {
  const sid = BigInt(schoolId);
  const assignments = await db.student_fee_assignment.findMany({
    where: {
      school_id: sid,
      ...(studentId ? { student_id: BigInt(studentId) } : {}),
      OR: [{ status: 'pending' }, { status: null }],
    },
    include: { fee_structure: true },
    orderBy: { id: 'asc' },
  });
  if (!assignments.length) return [];

  const linkInvoices = await db.invoice.findMany({
    where: {
      school_id: sid,
      student_id: { in: [...new Set(assignments.map((a) => a.student_id))] },
      notes: { startsWith: 'Admission fees:' },
    },
    select: { student_id: true, created_at: true },
  });

  return assignments.filter((a) => {
    const created = a.created_at ? new Date(a.created_at).getTime() : null;
    if (created === null) return true;
    return !linkInvoices.some((inv) => {
      if (String(inv.student_id) !== String(a.student_id) || !inv.created_at) return false;
      const gap = new Date(inv.created_at).getTime() - created;
      return gap >= -LINK_WINDOW_MS && gap <= LINK_WINDOW_MS;
    });
  });
};
