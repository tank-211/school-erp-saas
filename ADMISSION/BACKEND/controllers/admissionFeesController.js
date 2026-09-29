/**
 * controllers/admissionFeesController.js
 *
 * Catch-up for completed admissions that have no fees assigned: admissions
 * completed before fees were linked to admissions, or whose class had no fee
 * structure at the time.
 *
 *   GET  /api/fees/admissions-without-fees   any school user
 *   POST /api/fees/assign-admission-fees     school admin
 *        { admission_id }  one admission
 *        { all: true }     every listed admission whose class has a fee structure
 */
import prisma from '../src/lib/prisma.js';
import { assignAdmissionFees } from '../services/admissionFeeService.js';

const MAX_PER_RUN = 200;
const isId = (value) => /^\d+$/.test(String(value ?? ''));
const key = (classId, yearId) => `${classId}:${yearId}`;

// Completed admissions of the school with no student_fee_assignment yet.
const findAdmissionsWithoutFees = async (schoolId) => {
  const [completed, assignments, structures] = await Promise.all([
    prisma.admission.findMany({
      where: { school_id: schoolId, is_completed: true },
      select: { id: true, student_id: true, class_id: true, academic_year_id: true, admission_date: true },
      orderBy: { id: 'desc' },
    }),
    prisma.student_fee_assignment.findMany({
      where: { school_id: schoolId },
      select: { admission_id: true },
      distinct: ['admission_id'],
    }),
    prisma.fee_structure.findMany({
      where: { school_id: schoolId, OR: [{ is_active: true }, { is_active: null }] },
      select: { class_id: true, academic_year_id: true },
    }),
  ]);

  const withFees = new Set(assignments.map((a) => String(a.admission_id)));
  const priced = new Set(structures.map((s) => key(s.class_id, s.academic_year_id)));
  const missing = completed.filter((a) => !withFees.has(String(a.id)));
  if (!missing.length) return [];

  const [students, classes, years] = await Promise.all([
    prisma.student.findMany({
      where: { school_id: schoolId, id: { in: missing.map((a) => a.student_id) } },
      select: { id: true, first_name: true, last_name: true, admission_number: true },
    }),
    prisma.school_class.findMany({ where: { school_id: schoolId }, select: { id: true, class_name: true } }),
    prisma.academic_year.findMany({ where: { school_id: schoolId }, select: { id: true, year_name: true } }),
  ]);
  const studentById = new Map(students.map((s) => [String(s.id), s]));
  const className = new Map(classes.map((c) => [String(c.id), c.class_name]));
  const yearName = new Map(years.map((y) => [String(y.id), y.year_name]));

  return missing.map((a) => {
    const student = studentById.get(String(a.student_id));
    return {
      admission_id: String(a.id),
      student_id: String(a.student_id),
      student_name: student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : null,
      admission_number: student?.admission_number || null,
      class_name: className.get(String(a.class_id)) || null,
      year_name: yearName.get(String(a.academic_year_id)) || null,
      has_fee_structure: priced.has(key(a.class_id, a.academic_year_id)),
    };
  });
};

export const getAdmissionsWithoutFees = async (req, res) => {
  try {
    const items = await findAdmissionsWithoutFees(req.schoolId);
    res.status(200).json({
      success: true,
      data: {
        count: items.length,
        ready_count: items.filter((i) => i.has_fee_structure).length,
        items,
      },
    });
  } catch (error) {
    console.error('Admissions without fees error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load admissions without fees' });
  }
};

export const assignFeesToAdmissions = async (req, res) => {
  const actor = req.user.name || req.user.email || req.user.id;

  try {
    // One admission
    if (req.body?.admission_id !== undefined) {
      if (!isId(req.body.admission_id)) {
        return res.status(400).json({ success: false, message: 'Invalid admission id' });
      }
      const admission = await prisma.admission.findFirst({
        where: { id: BigInt(req.body.admission_id), school_id: req.schoolId },
        select: { id: true, is_completed: true },
      });
      if (!admission) {
        return res.status(404).json({ success: false, message: 'Admission not found' });
      }
      if (!admission.is_completed) {
        return res.status(409).json({ success: false, message: 'Complete the admission before assigning fees' });
      }
      const fees = await prisma.$transaction((tx) =>
        assignAdmissionFees(tx, { schoolId: req.schoolId, admissionId: admission.id, actor })
      );
      if (fees.status === 'no_fee_structure') {
        return res.status(409).json({
          success: false,
          message: 'No fee structure is set up for this class and academic year. Add one in the Fees app first.',
          data: fees,
        });
      }
      return res.status(200).json({ success: true, message: 'Fees assigned', data: fees });
    }

    // Every listed admission that has a fee structure
    if (req.body?.all !== true) {
      return res.status(400).json({ success: false, message: 'Send admission_id, or all: true' });
    }

    const items = await findAdmissionsWithoutFees(req.schoolId);
    const ready = items.filter((i) => i.has_fee_structure).slice(0, MAX_PER_RUN);
    const summary = { invoices_created: 0, assigned: 0, failed: [], skipped_no_fee_structure: items.filter((i) => !i.has_fee_structure).length };

    // One transaction per admission, so one failure does not undo the others.
    for (const item of ready) {
      try {
        const fees = await prisma.$transaction((tx) =>
          assignAdmissionFees(tx, { schoolId: req.schoolId, admissionId: BigInt(item.admission_id), actor })
        );
        if (fees.status === 'assigned') summary.assigned += 1;
        if (fees.invoice_number) summary.invoices_created += 1;
      } catch (error) {
        summary.failed.push({ admission_id: item.admission_id, student_name: item.student_name, message: error.message });
      }
    }
    summary.remaining = Math.max(items.filter((i) => i.has_fee_structure).length - ready.length, 0);

    const parts = [`Fees assigned to ${summary.assigned} admission(s), ${summary.invoices_created} invoice(s) created`];
    if (summary.failed.length) parts.push(`${summary.failed.length} failed`);
    if (summary.skipped_no_fee_structure) parts.push(`${summary.skipped_no_fee_structure} skipped (no fee structure for their class)`);
    if (summary.remaining) parts.push(`${summary.remaining} more left; run again`);

    return res.status(summary.failed.length && !summary.assigned ? 500 : 200).json({
      success: summary.failed.length === 0 || summary.assigned > 0,
      message: parts.join('. ') + '.',
      data: summary,
    });
  } catch (error) {
    console.error('Assign admission fees error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign fees' });
  }
};
