/**
 * services/feeStructureService.ts — a school's fees per class and academic year.
 *
 * Every query is scoped to the caller's school. A fee structure is the price
 * list; when an admission is completed (or fees are assigned) its amount is
 * copied into student_fee_assignment and billed on an invoice, so changing the
 * amount here only affects students assigned afterwards.
 *
 * Deleting a fee structure would also delete its student_fee_assignment rows
 * (ON DELETE CASCADE), so a fee that is assigned to any student cannot be
 * deleted: switch it off instead.
 */
import prisma from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

const MAX_AMOUNT = 9_999_999_999.99; // DECIMAL(12,2)

const toId = (value: unknown, what: string): bigint => {
  if (!/^\d+$/.test(String(value ?? ''))) {
    throw new ValidationError(`Invalid ${what}`);
  }
  return BigInt(String(value));
};

const cleanFeeType = (value: unknown): string => {
  const feeType = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!feeType) throw new ValidationError('Fee type is required');
  if (feeType.length > 100) throw new ValidationError('Fee type must be at most 100 characters');
  return feeType;
};

const cleanAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('Fee amount must be greater than zero');
  }
  if (amount > MAX_AMOUNT) throw new ValidationError('Fee amount is too large');
  return Math.round(amount * 100) / 100;
};

// 'YYYY-MM-DD' (or a Date) → Date; empty → null
const cleanDueDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ValidationError('Due date is not a valid date');
  return date;
};

const cleanDescription = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, 1000) : null;
};

const isUniqueError = (err: any) => err?.code === 'P2002';

const include = {
  academic_year: { select: { id: true, year_name: true } },
  school_class: { select: { id: true, class_name: true } },
  _count: { select: { student_fee_assignment: true } },
} as const;

// Plain JSON for the app (no BigInt / Decimal objects)
const shape = (row: any) => ({
  id: row.id.toString(),
  academicYearId: row.academic_year_id.toString(),
  academicYear: row.academic_year?.year_name ?? null,
  classId: row.class_id.toString(),
  className: row.school_class?.class_name ?? null,
  feeType: row.fee_type,
  amount: Number(row.amount),
  dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
  description: row.description ?? null,
  isActive: row.is_active !== false,
  assignedCount: row._count?.student_fee_assignment ?? 0,
  updatedAt: row.updated_at ?? null,
});

const duplicateMessage = (feeType: string, className?: string | null, yearName?: string | null) =>
  `${feeType} already exists for ${className || 'this class'}${yearName ? ` in ${yearName}` : ' in this academic year'}.`;

class FeeStructureService {
  async getFeeStructures(schoolId: string | number | bigint) {
    const rows = await prisma.fee_structure.findMany({
      where: { school_id: BigInt(schoolId) },
      include,
      orderBy: [{ academic_year_id: 'desc' }, { class_id: 'asc' }, { fee_type: 'asc' }],
    });
    return rows.map(shape);
  }

  async createFeeStructure(data: {
    schoolId: string | number | bigint;
    academicYearId: unknown;
    classId: unknown;
    feeType: unknown;
    amount: unknown;
    dueDate?: unknown;
    description?: unknown;
  }) {
    const schoolId = BigInt(data.schoolId);
    const academicYearId = toId(data.academicYearId, 'academic year');
    const classId = toId(data.classId, 'class');
    const feeType = cleanFeeType(data.feeType);
    const amount = cleanAmount(data.amount);
    const dueDate = cleanDueDate(data.dueDate);

    // Both must belong to the caller's school
    const [academicYear, schoolClass] = await Promise.all([
      prisma.academic_year.findFirst({ where: { id: academicYearId, school_id: schoolId }, select: { year_name: true } }),
      prisma.school_class.findFirst({ where: { id: classId, school_id: schoolId }, select: { class_name: true } }),
    ]);
    if (!academicYear) throw new NotFoundError('Academic year not found');
    if (!schoolClass) throw new NotFoundError('Class not found');

    const existing = await prisma.fee_structure.findFirst({
      where: {
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: classId,
        fee_type: { equals: feeType, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(duplicateMessage(feeType, schoolClass.class_name, academicYear.year_name));
    }

    try {
      const row = await prisma.fee_structure.create({
        data: {
          school_id: schoolId,
          academic_year_id: academicYearId,
          class_id: classId,
          fee_type: feeType,
          amount,
          due_date: dueDate,
          description: cleanDescription(data.description),
          is_active: true,
        },
        include,
      });
      return shape(row);
    } catch (err) {
      if (isUniqueError(err)) {
        throw new ConflictError(duplicateMessage(feeType, schoolClass.class_name, academicYear.year_name));
      }
      throw err;
    }
  }

  async updateFeeStructure(
    id: string,
    schoolId: string | number | bigint,
    data: {
      feeType?: unknown;
      amount?: unknown;
      dueDate?: unknown;
      description?: unknown;
      isActive?: unknown;
    }
  ) {
    const feeStructureId = toId(id, 'fee structure id');
    const sid = BigInt(schoolId);

    const existing = await prisma.fee_structure.findFirst({
      where: { id: feeStructureId, school_id: sid },
      include,
    });
    if (!existing) throw new NotFoundError('Fee structure not found');

    const update: Record<string, any> = { updated_at: new Date() };
    if (data.feeType !== undefined) update.fee_type = cleanFeeType(data.feeType);
    if (data.amount !== undefined) update.amount = cleanAmount(data.amount);
    if (data.dueDate !== undefined) update.due_date = cleanDueDate(data.dueDate);
    if (data.description !== undefined) update.description = cleanDescription(data.description);
    if (data.isActive !== undefined) {
      if (typeof data.isActive !== 'boolean') throw new ValidationError('isActive must be true or false');
      update.is_active = data.isActive;
    }

    // A rename must not collide with another fee of the same class and year
    if (update.fee_type && update.fee_type.toLowerCase() !== String(existing.fee_type).toLowerCase()) {
      const clash = await prisma.fee_structure.findFirst({
        where: {
          school_id: sid,
          academic_year_id: existing.academic_year_id,
          class_id: existing.class_id,
          fee_type: { equals: update.fee_type, mode: 'insensitive' },
          NOT: { id: feeStructureId },
        },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictError(
          duplicateMessage(update.fee_type, existing.school_class?.class_name, existing.academic_year?.year_name)
        );
      }
    }

    try {
      const row = await prisma.fee_structure.update({
        where: { id: feeStructureId },
        data: update,
        include,
      });
      return shape(row);
    } catch (err) {
      if (isUniqueError(err)) {
        throw new ConflictError(
          duplicateMessage(update.fee_type || existing.fee_type, existing.school_class?.class_name, existing.academic_year?.year_name)
        );
      }
      throw err;
    }
  }

  async deleteFeeStructure(id: string, schoolId: string | number | bigint) {
    const feeStructureId = toId(id, 'fee structure id');
    const sid = BigInt(schoolId);

    const existing = await prisma.fee_structure.findFirst({
      where: { id: feeStructureId, school_id: sid },
      select: { id: true, fee_type: true },
    });
    if (!existing) throw new NotFoundError('Fee structure not found');

    // Deleting would cascade to the students' fee assignments
    const assigned = await prisma.student_fee_assignment.count({
      where: { fee_structure_id: feeStructureId, school_id: sid },
    });
    if (assigned > 0) {
      throw new ConflictError(
        `${existing.fee_type} is assigned to ${assigned} student${assigned === 1 ? '' : 's'}, so it cannot be deleted. Switch it off instead: it will no longer be added to new admissions.`
      );
    }

    await prisma.fee_structure.delete({ where: { id: feeStructureId } });
    return { id: existing.id.toString() };
  }
}

export default new FeeStructureService();
