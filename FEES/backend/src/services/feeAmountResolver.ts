import { NotFoundError, ValidationError } from '../middleware/errorHandler';

/**
 * Resolve invoice value from the school's fee catalogue and, when present,
 * the student's assigned fee (which already includes approved concessions).
 * Request-body totals are deliberately not accepted as the source of truth.
 */
export async function resolveStudentFeeAmount(
  db: any,
  schoolId: string,
  studentId: string,
  feeStructureId: string
) {
  if (!/^\d+$/.test(String(schoolId)) || !/^\d+$/.test(String(studentId)) || !/^\d+$/.test(String(feeStructureId))) {
    throw new ValidationError('A valid student and fee structure are required');
  }

  const school = BigInt(schoolId);
  const student = BigInt(studentId);
  const structureId = BigInt(feeStructureId);
  const structure = await db.fee_structure.findFirst({
    where: { id: structureId, school_id: school },
    select: { id: true, amount: true, due_date: true, fee_type: true, is_active: true },
  });
  if (!structure) throw new NotFoundError('Fee structure not found for this school');

  const assignment = await db.student_fee_assignment.findFirst({
    where: { school_id: school, student_id: student, fee_structure_id: structureId },
    orderBy: { id: 'desc' },
    select: { final_amount: true, due_date: true },
  });

  if (!assignment && structure.is_active === false) {
    throw new NotFoundError('Fee structure is inactive and has no existing student assignment');
  }

  const rawAmount = Number(assignment?.final_amount ?? structure.amount);
  const amountPaise = Math.round(rawAmount * 100);
  if (!Number.isFinite(rawAmount) || amountPaise <= 0) {
    throw new ValidationError('The configured fee amount must be greater than zero');
  }

  return {
    amount: amountPaise / 100,
    dueDate: assignment?.due_date ?? structure.due_date ?? null,
    feeType: structure.fee_type,
  };
}
