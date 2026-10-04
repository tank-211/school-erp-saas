import prisma from '../config/database';
import { serializeBigInt } from '../utils/responseHelper';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';

export class InvoiceService {
  /**
   * Get a single invoice with student and payment information.
   */
  async getInvoiceById(invoiceId: string, schoolId: string) {
    const invoice =
      await prisma.invoice.findFirst({
        where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
        include: {
          student: {
            select: {
              id: true,
              admission_number: true,
              first_name: true,
              middle_name: true,
              last_name: true,
              email: true,
              phone: true,
              date_of_birth: true,
              gender: true,
              city: true,
              state: true,
              postal_code: true,
              parent_detail: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                  phone: true,
                  relation: true,
                },
              },
            },
          },
          payment: {
            select: {
              id: true,
              payment_number: true,
              amount: true,
              payment_date: true,
              payment_method: true,
              transaction_id: true,
              bank_name: true,
              cheque_number: true,
              status: true,
              remarks: true,
              received_by: true,
            },
            orderBy: {
              payment_date: 'desc',
            },
          },
        },
      });

    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      );
    }

    const student = invoice.student;

    const parent =
      student.parent_detail?.[0] || null;

    const totalAmount =
      Number(invoice.total_amount);

    const paidAmount =
      Number(invoice.paid_amount ?? 0);

    const pendingAmount =
      Number(invoice.pending_amount);

    // School letterhead, the student's class/year, and what the invoice covers
    const [school, admission, assignments] = await Promise.all([
      prisma.school.findUnique({
        where: { id: invoice.school_id },
        select: { name: true, address: true, city: true, state: true, postal_code: true, phone: true, email: true },
      }),
      prisma.admission.findFirst({
        where: { student_id: student.id, school_id: invoice.school_id },
        orderBy: { id: 'desc' },
        select: {
          school_class: { select: { class_name: true } },
          section: { select: { section_name: true } },
          academic_year: { select: { year_name: true } },
        },
      }),
      prisma.student_fee_assignment.findMany({
        where: { student_id: student.id, school_id: invoice.school_id },
        select: { final_amount: true, fee_structure: { select: { fee_type: true } } },
      }),
    ]);
    const feeBreakdown = this.breakdownFromNotes(invoice.notes, assignments, totalAmount);

    return {
      invoiceId: invoice.id.toString(),

      school: school
        ? {
            name: school.name,
            address: [school.address, school.city, school.state, school.postal_code].filter(Boolean).join(', '),
            phone: school.phone || null,
            email: school.email || null,
          }
        : null,

      className: admission?.school_class?.class_name || null,
      section: admission?.section?.section_name || null,
      academicYear: admission?.academic_year?.year_name || null,
      feeBreakdown,
      invoiceNumber:
        invoice.invoice_number,

      invoiceDate:
        this.formatDate(
          invoice.invoice_date
        ),

      studentName:
        [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(' '),

      rollNumber:
        student.admission_number,

      parentName: parent
        ? [
            parent.first_name,
            parent.last_name,
          ]
            .filter(Boolean)
            .join(' ')
        : 'N/A',

      email:
        student.email || 'N/A',

      phone:
        student.phone || 'N/A',

      dateOfBirth:
        student.date_of_birth
          ? this.formatDate(
              student.date_of_birth
            )
          : null,

      gender:
        student.gender || null,

      address: {
        city:
          student.city || null,
        state:
          student.state || null,
        postalCode:
          student.postal_code || null,
      },

      totalAmount,

      paidAmount,

      amountPending:
        pendingAmount,

      status:
        this.formatStatus(
          invoice.status
        ),

      dueDate:
        this.formatDate(
          invoice.due_date
        ),

      notes:
        invoice.notes || null,

      payments:
        invoice.payment.map(
          (payment) => ({
            id: payment.id.toString(),
            paymentNumber:
              payment.payment_number,
            amount:
              Number(payment.amount),
            paymentDate:
              this.formatDate(
                payment.payment_date
              ),
            paymentMethod:
              payment.payment_method,
            transactionId:
              payment.transaction_id ||
              null,
            bankName:
              payment.bank_name ||
              null,
            chequeNumber:
              payment.cheque_number ||
              null,
            status:
              payment.status ||
              'pending',
            remarks:
              payment.remarks ||
              null,
            receivedBy:
              payment.received_by ||
              null,
          })
        ),

      paymentDate:
        invoice.payment[0]
          ? this.formatDate(
              invoice.payment[0]
                .payment_date
            )
          : null,
    };
  }

  /**
   * Get invoices with pagination and filters.
   */
  async getAllInvoices(
    page: number = 1,
    limit: number = 10,
    filters: any = {},
    schoolId: string
  ) {
    const skip =
      (page - 1) * limit;

    const where: any = { school_id: BigInt(schoolId) };

    if (filters.status) {
      where.status =
        String(
          filters.status
        ).toLowerCase();
    }

    if (filters.studentId) {
      where.student_id =
        BigInt(
          filters.studentId
        );
    }

    if (filters.admissionNumber) {
      where.student = {
        admission_number:
          filters.admissionNumber,
      };
    }

    if (filters.invoiceNumber) {
      where.invoice_number =
        filters.invoiceNumber;
    }

    const [
      invoices,
      total,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where,

        include: {
          student: {
            select: {
              admission_number: true,
              first_name: true,
              middle_name: true,
              last_name: true,
              phone: true,
              // Current class, for the list
              admission: {
                select: { school_class: { select: { class_name: true } } },
                orderBy: { id: 'desc' },
                take: 1,
              },
            },
          },

          payment: {
            select: {
              amount: true,
              payment_method: true,
              payment_date: true,
            },

            orderBy: {
              payment_date:
                'desc',
            },

            take: 1,
          },
        },

        orderBy: {
          invoice_date: 'desc',
        },

        skip,
        take: limit,
      }),

      prisma.invoice.count({
        where,
      }),
    ]);

    return {
      invoices:
        invoices.map(
          (invoice) => ({
            invoiceId:
              invoice.id.toString(),

            invoiceNumber:
              invoice.invoice_number,

            invoiceDate:
              this.formatDate(
                invoice.invoice_date
              ),

            studentName:
              [
                invoice.student
                  .first_name,
                invoice.student
                  .middle_name,
                invoice.student
                  .last_name,
              ]
                .filter(Boolean)
                .join(' '),

            rollNumber:
              invoice.student
                .admission_number,

            className:
              invoice.student.admission?.[0]?.school_class?.class_name || null,

            phone:
              invoice.student.phone || null,

            totalAmount:
              Number(
                invoice.total_amount
              ),

            paidAmount:
              Number(
                invoice.paid_amount ??
                  0
              ),

            amountPending:
              Number(
                invoice.pending_amount
              ),

            status:
              invoice.status ||
              'unpaid',

            dueDate:
              this.formatDate(
                invoice.due_date
              ),

            lastPaymentDate:
              invoice.payment[0]
                ? this.formatDate(
                    invoice.payment[0]
                      .payment_date
                  )
                : null,

            lastPaymentAmount:
              invoice.payment[0]
                ? Number(
                    invoice.payment[0]
                      .amount
                  )
                : 0,

            lastPaymentMethod:
              invoice.payment[0]
                ?.payment_method ||
              null,
          })
        ),

      total,
      page,
      limit,
    };
  }

  /**
   * Create a single invoice.
   *
   * Current schema uses invoice directly.
   */
  async createInvoice(data: {
    schoolId: string;
    studentId: string;
    feeStructureId?: string;
    totalAmount: number;
    dueDate: Date;
    approvedBy?: string;
    notes?: string;
  }) {
    if (
      !data.studentId
    ) {
      throw new ValidationError(
        'Student ID is required'
      );
    }

    if (
      !data.totalAmount ||
      data.totalAmount <= 0
    ) {
      throw new ValidationError(
        'Total amount must be greater than zero'
      );
    }

    const student =
      await prisma.student.findFirst({
        where: { id: BigInt(data.studentId), school_id: BigInt(data.schoolId) },
      });

    if (!student) {
      throw new NotFoundError(
        'Student not found'
      );
    }

    /**
     * feeStructureId is kept in the service
     * interface for compatibility with the
     * existing controller.
     *
     * The current invoice table does not have
     * a fee_structure_id column, so it is not
     * written directly to invoice.
     *
     * If the application needs to associate
     * invoices with fee structures, that
     * relationship should be implemented through
     * student_fee_assignment.
     */

    const invoiceNumber =
      await this.generateInvoiceNumber();

    const invoice =
      await prisma.invoice.create({
        data: {
          school_id:
            student.school_id,

          student_id:
            student.id,

          invoice_number:
            invoiceNumber,

          invoice_date:
            new Date(),

          due_date:
            data.dueDate,

          total_amount:
            data.totalAmount,

          paid_amount:
            0,

          pending_amount:
            data.totalAmount,

          status:
            'unpaid',

          notes:
            data.notes ||
            undefined,

          created_by:
            data.approvedBy ||
            undefined,
        },

        include: {
          student: {
            select: {
              id: true,
              admission_number:
                true,
              first_name: true,
              middle_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

    return this.serializeBigInt(
      invoice
    );
  }

  /**
   * Create multiple invoices.
   */
  async bulkCreateInvoices(
    invoices: Array<{
      studentId: string;
      feeStructureId?: string;
      totalAmount: number;
      dueDate: Date;
    }>,
    schoolId: string
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (
      const invoiceData of invoices
    ) {
      try {
        const invoice =
          await this.createInvoice(
            { ...invoiceData, schoolId }
          );

        results.push(invoice);
      } catch (error: any) {
        errors.push({
          data: invoiceData,
          error:
            error.message,
        });
      }
    }

    return {
      success:
        results.length,

      failed:
        errors.length,

      results,
      errors,
    };
  }

  /**
   * Generate a unique invoice number.
   */
  private async generateInvoiceNumber() {
    const timestamp =
      Date.now();

    const random =
      Math.floor(
        Math.random() * 1000
      )
        .toString()
        .padStart(3, '0');

    return `INV-${timestamp}-${random}`;
  }

  /**
   * Fee lines of an invoice. Invoices raised by the admission link and the
   * Generate Invoice dialog list their fee types in the notes
   * ("Admission fees: Tuition, Lab" / "Fees: Tuition"); each is matched to the
   * student's fee assignment. When nothing matches, or the lines do not add up
   * to the invoice total, no breakdown is shown rather than a guessed one.
   */
  private breakdownFromNotes(
    notes: string | null,
    assignments: Array<{ final_amount: any; fee_structure: { fee_type: string } | null }>,
    total: number
  ) {
    const listed = String(notes || '')
      .replace(/^[^:]*fees:\s*/i, '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (!listed.length) return [];
    const lines = listed
      .map((type) => assignments.find((a) => a.fee_structure?.fee_type?.toLowerCase() === type))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ feeType: a.fee_structure!.fee_type, amount: Number(a.final_amount) }));
    const sum = lines.reduce((t, l) => t + Math.round(l.amount * 100), 0);
    return lines.length === listed.length && sum === Math.round(total * 100) ? lines : [];
  }

  /**
   * Format Date as YYYY-MM-DD.
   */
  private formatDate(
    date: Date
  ) {
    return date
      .toISOString()
      .split('T')[0];
  }

  /**
   * Convert old status values into
   * readable invoice status.
   */
  private formatStatus(
    status: string | null
  ) {
    switch (
      String(status || '')
        .toLowerCase()
    ) {
      case 'paid':
        return 'Paid';

      case 'partial':
      case 'partially_paid':
        return 'Partially Paid';

      case 'pending':
      case 'unpaid':
        return 'Pending';

      case 'overdue':
        return 'Overdue';

      case 'failed':
        return 'Failed';

      default:
        return status || 'Pending';
    }
  }

  /**
   * Convert BigInt values to strings
   * so the response can be JSON serialized.
   */
  private serializeBigInt(
    value: any
  ): any {
    return serializeBigInt(value);
  }
}

export default new InvoiceService();
