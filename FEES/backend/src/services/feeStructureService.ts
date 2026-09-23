import prisma from '../config/database';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

class FeeStructureService {
  async getFeeStructures(schoolId: string | number | bigint) {
    const structures = await prisma.fee_structure.findMany({
      where: {
        school_id: BigInt(schoolId),
      },
      include: {
        academic_year: true,
        school_class: true,
      },
      orderBy: [
        { academic_year_id: 'desc' },
        { class_id: 'asc' },
        { fee_type: 'asc' },
      ],
    });

    return structures;
  }

  async createFeeStructure(data: {
    schoolId: string | number | bigint;
    academicYearId: string | number | bigint;
    classId: string | number | bigint;
    feeType: string;
    amount: number;
    dueDate?: Date;
    description?: string;
  }) {
    if (!data.feeType?.trim()) {
      throw new Error('Fee type is required');
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error('Fee amount must be greater than zero');
    }

    const schoolId = BigInt(data.schoolId);
    const academicYearId = BigInt(data.academicYearId);
    const classId = BigInt(data.classId);

    const [academicYear, schoolClass] = await Promise.all([
      prisma.academic_year.findFirst({
        where: {
          id: academicYearId,
          school_id: schoolId,
        },
      }),
      prisma.school_class.findFirst({
        where: {
          id: classId,
          school_id: schoolId,
        },
      }),
    ]);

    if (!academicYear) {
      throw new NotFoundError('Academic year not found');
    }

    if (!schoolClass) {
      throw new NotFoundError('Class not found');
    }

    const existing = await prisma.fee_structure.findFirst({
      where: {
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: classId,
        fee_type: data.feeType.trim(),
      },
    });

    if (existing) {
      throw new ConflictError(
        'Fee structure already exists for this class and academic year'
      );
    }

    return prisma.fee_structure.create({
      data: {
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: classId,
        fee_type: data.feeType.trim(),
        amount: data.amount,
        due_date: data.dueDate,
        description: data.description?.trim() || undefined,
        is_active: true,
      },
      include: {
        academic_year: true,
        school_class: true,
      },
    });
  }

  async updateFeeStructure(
    id: string,
    schoolId: string | number | bigint,
    data: {
      feeType?: string;
      amount?: number;
      dueDate?: Date | null;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const feeStructureId = BigInt(id);
    const schoolIdBigInt = BigInt(schoolId);

    const existing = await prisma.fee_structure.findFirst({
      where: {
        id: feeStructureId,
        school_id: schoolIdBigInt,
      },
    });

    if (!existing) {
      throw new NotFoundError('Fee structure not found');
    }

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Fee amount must be greater than zero');
    }

    return prisma.fee_structure.update({
      where: {
        id: feeStructureId,
      },
      data: {
        fee_type: data.feeType?.trim(),
        amount: data.amount,
        due_date: data.dueDate,
        description: data.description?.trim(),
        is_active: data.isActive,
      },
      include: {
        academic_year: true,
        school_class: true,
      },
    });
  }

  async deleteFeeStructure(
    id: string,
    schoolId: string | number | bigint
  ) {
    const feeStructureId = BigInt(id);
    const schoolIdBigInt = BigInt(schoolId);

    const existing = await prisma.fee_structure.findFirst({
      where: {
        id: feeStructureId,
        school_id: schoolIdBigInt,
      },
    });

    if (!existing) {
      throw new NotFoundError('Fee structure not found');
    }

    return prisma.fee_structure.delete({
      where: {
        id: feeStructureId,
      },
    });
  }
}

export default new FeeStructureService();