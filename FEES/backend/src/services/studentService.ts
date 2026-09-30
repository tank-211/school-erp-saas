import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

export class StudentService {
  async createStudent(data: {
    schoolId: string | number | bigint;
    studentId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    classId?: string;
    parentId?: string;
  }) {
    // In the current schema, studentId maps to admission_number.
    const existing = await prisma.student.findUnique({
      where: {
        admission_number: data.studentId,
      },
    });

    if (existing) {
      throw new ConflictError('Student ID already exists');
    }

    /*
     * The current schema does not have courseId/classId directly
     * on student.
     *
     * Course is also not a model in the current schema.
     * Class is represented by school_class and is connected through
     * admission.
     *
     * Therefore, student creation itself only creates the student.
     * Admission/class assignment should be handled separately.
     */

    const student = await prisma.student.create({
      data: {
        school_id: BigInt(data.schoolId),
        admission_number: data.studentId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        address: data.street,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        country: data.country,
        status: 'active',
      },
    });

    return student;
  }

  async getStudentById(id: string, schoolId: string) {
    const studentId = BigInt(id);

    const student = await prisma.student.findFirst({
      where: { id: studentId, school_id: BigInt(schoolId) },
      include: {
        admission: {
          include: {
            school_class: true,
            academic_year: true,
            section: true,
          },
          orderBy: {
            admission_date: 'desc',
          },
          take: 1,
        },
        parent_detail: true,
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            invoice_date: true,
            due_date: true,
            total_amount: true,
            paid_amount: true,
            pending_amount: true,
            status: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    return student;
  }

  async updateStudent(
    id: string,
    schoolId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: Date;
      gender: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      bloodGroup: string;
      aadharNumber: string;
      status: string;
    }>
  ) {
    const studentId = BigInt(id);

    const student = await prisma.student.findFirst({
      where: { id: studentId, school_id: BigInt(schoolId) },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        address: data.street,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        country: data.country,
        blood_group: data.bloodGroup,
        aadhar_number: data.aadharNumber,
        status: data.status,
      },
      include: {
        admission: {
          include: {
            school_class: true,
            academic_year: true,
            section: true,
          },
          orderBy: {
            admission_date: 'desc',
          },
          take: 1,
        },
        parent_detail: true,
      },
    });

    return updatedStudent;
  }

  async deleteStudent(id: string, schoolId: string) {
    const studentId = BigInt(id);

    const student = await prisma.student.findFirst({
      where: { id: studentId, school_id: BigInt(schoolId) },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    return prisma.student.delete({
      where: {
        id: studentId,
      },
    });
  }

  async searchStudents(
    {
      schoolId,
      search,
      status,
      city,
      classId,
      page = 1,
      limit = 10,
    }: {
      schoolId: string | number | bigint;
      search?: string;
      status?: string;
      city?: string;
      courseId?: string;
      classId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const schoolIdBigInt = BigInt(schoolId);
    const skip = (page - 1) * limit;

    const where: Prisma.studentWhereInput = {
      school_id: schoolIdBigInt,
    };

    if (search) {
      where.OR = [
        {
          admission_number: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          first_name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          last_name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    if (classId) {
      where.admission = {
        some: {
          school_id: schoolIdBigInt,
          class_id: BigInt(classId),
        },
      };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          admission: {
            include: {
              school_class: true,
              academic_year: true,
              section: true,
            },
            orderBy: {
              admission_date: 'desc',
            },
            take: 1,
          },

          parent_detail: true,

          invoice: {
            orderBy: {
              invoice_date: 'desc',
            },
            select: {
              id: true,
              invoice_number: true,
              invoice_date: true,
              due_date: true,
              total_amount: true,
              paid_amount: true,
              pending_amount: true,
              status: true,
            },
          },

          // Payment history shown in the student drawer
          payment: {
            orderBy: {
              payment_date: 'desc',
            },
            take: 50,
            select: {
              id: true,
              invoice_id: true,
              payment_number: true,
              amount: true,
              payment_date: true,
              payment_method: true,
              transaction_id: true,
              status: true,
              received_by: true,
            },
          },

          student_fee_assignment: {
            include: {
              fee_structure: true,
            },
          },
        },

        skip,
        take: limit,

        orderBy: {
          created_at: 'desc',
        },
      }),

      prisma.student.count({
        where,
      }),
    ]);

    // received_by holds a user id: show the staff member's name
    const receiverIds = [
      ...new Set(
        students.flatMap((st: any) => (st.payment || []).map((p: any) => String(p.received_by || '')))
          .filter((v: string) => /^\d+$/.test(v))
      ),
    ];
    const receivers = receiverIds.length
      ? await prisma.app_user.findMany({
          where: { id: { in: receiverIds.map((v) => BigInt(v)) }, school_id: BigInt(schoolId) },
          select: { id: true, name: true },
        })
      : [];
    const receiverName = new Map(receivers.map((u) => [u.id.toString(), u.name]));
    const withNames = students.map((st: any) => ({
      ...st,
      payment: (st.payment || []).map((p: any) => ({
        ...p,
        received_by_name: receiverName.get(String(p.received_by)) || null,
      })),
    }));

    return {
      students: withNames,
      total,
      page,
      limit,
    };
  }

  async bulkCreateStudents(
    data: Array<{
      schoolId: string | number | bigint;
      studentId: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      city?: string;
      state?: string;
      courseId?: string;
      classId?: string;
      parentPhone?: string;
    }>
  ) {
    const results = {
      created: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const studentData of data) {
      try {
        const existing = await prisma.student.findUnique({
          where: {
            admission_number: studentData.studentId,
          },
        });

        if (existing) {
          results.errors.push({
            studentId: studentData.studentId,
            reason: 'Student ID already exists',
          });

          results.failed++;
          continue;
        }

        await prisma.student.create({
          data: {
            school_id: BigInt(studentData.schoolId),
            admission_number: studentData.studentId,
            first_name: studentData.firstName,
            last_name: studentData.lastName,
            email: studentData.email,
            phone: studentData.phone,
            city: studentData.city,
            state: studentData.state,
            status: 'active',
          },
        });

        /*
         * Parent information belongs in parent_detail.
         *
         * Because parent_detail requires:
         *   school_id
         *   student_id
         *   relation
         *   first_name
         *   phone
         *
         * and this service currently does not receive schoolId or
         * parent name/relation, we don't create an incomplete parent
         * record here.
         *
         * parentPhone can be handled when the admission/parent workflow
         * provides the required school and relationship information.
         */

        results.created++;

      } catch (error: any) {
        results.errors.push({
          studentId: studentData.studentId,
          reason: error.message,
        });

        results.failed++;
      }
    }

    return results;
  }

  async getStudentStats(schoolId: string) {
    const schoolIdBigInt = BigInt(schoolId);
    const totalStudents = await prisma.student.count({ where: { school_id: schoolIdBigInt } });

    const activeStudents = await prisma.student.count({
      where: { school_id: schoolIdBigInt, status: 'active' },
    });

    const studentsByStatus = await prisma.student.groupBy({
      by: ['status'],
      where: { school_id: schoolIdBigInt },
      _count: {
        _all: true,
      },
    });

    // Collections today and this month (India dates), same rule as the
    // dashboard: every payment that is not cancelled counts
    const IST = 5.5 * 60 * 60 * 1000;
    const ist = new Date(Date.now() + IST);
    const todayStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
    const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1));
    const paid = (from: Date) =>
      prisma.payment.aggregate({
        where: { school_id: schoolIdBigInt, payment_date: { gte: from }, status: { not: 'cancelled' } },
        _sum: { amount: true },
        _count: { _all: true },
      });

    const activeYear = await prisma.academic_year.findFirst({
      where: { school_id: schoolIdBigInt, OR: [{ is_active: true }, { status: 'active' }] },
      select: { id: true, year_name: true },
    });
    const [today, month, admittedThisYear] = await Promise.all([
      paid(todayStart),
      paid(monthStart),
      activeYear
        ? prisma.admission.count({ where: { school_id: schoolIdBigInt, academic_year_id: activeYear.id } })
        : Promise.resolve(0),
    ]);

    return {
      total: totalStudents,
      active: activeStudents,
      byStatus: studentsByStatus.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      activeYear: activeYear?.year_name || null,
      admittedThisYear,
      collectedToday: Number(today._sum.amount ?? 0),
      paymentsToday: today._count._all,
      collectedThisMonth: Number(month._sum.amount ?? 0),
      paymentsThisMonth: month._count._all,
    };
  }
}

export default new StudentService();
