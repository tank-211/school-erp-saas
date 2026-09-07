import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import csv from 'csv-parser';
import { Readable } from 'stream';

export class BulkUploadService {
  async parseCSV(fileBuffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(fileBuffer.toString());

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Bulk upload fee structures.
   *
   * Current schema requires:
   * - school_id
   * - academic_year_id
   * - class_id
   * - fee_type
   * - amount
   */
  async uploadFeeStructures(
    csvData: any[],
    uploadedBy: string,
    schoolId: string
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const row of csvData) {
      try {
        const scopedSchoolId = schoolId;
        const academicYearId =
          row.academicYearId || row.academic_year_id;
        const classId = row.classId || row.class_id;

        if (!academicYearId) {
          throw new ValidationError(
            'academicYearId is required'
          );
        }

        if (!classId) {
          throw new ValidationError(
            'classId is required'
          );
        }

        const [academicYear, schoolClass] = await Promise.all([
          prisma.academic_year.findFirst({ where: { id: BigInt(academicYearId), school_id: BigInt(scopedSchoolId) } }),
          prisma.school_class.findFirst({ where: { id: BigInt(classId), school_id: BigInt(scopedSchoolId) } }),
        ]);
        if (!academicYear || !schoolClass) {
          throw new ValidationError('Academic year and class must belong to your school');
        }

        const feeType =
          row.feeType ||
          row.fee_type ||
          'General Fee';

        const amount = parseFloat(
          row.amount ||
            row.totalFee ||
            row.total_fee ||
            '0'
        );

        if (!amount || amount <= 0) {
          throw new ValidationError(
            'Valid fee amount is required'
          );
        }

        const feeStructure =
          await prisma.fee_structure.create({
            data: {
              school_id: BigInt(scopedSchoolId),
              academic_year_id: BigInt(
                academicYearId
              ),
              class_id: BigInt(classId),
              fee_type: feeType,
              amount,
              due_date: row.dueDate ||
                row.due_date
                ? new Date(
                    row.dueDate ||
                      row.due_date
                  )
                : undefined,
              description:
                row.description || undefined,
              is_active: true,
            },
          });

        results.push(
          this.serializeBigInt(feeStructure)
        );
      } catch (error: any) {
        errors.push({
          row,
          error: error.message,
        });
      }
    }

    await this.logUpload(
      'Fee Structure',
      csvData.length,
      results.length,
      errors.length,
      uploadedBy
    );

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Bulk upload invoices.
   *
   * Current schema uses invoice instead of feePayment.
   */
  async uploadInvoices(
    csvData: any[],
    uploadedBy: string,
    schoolId: string
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const row of csvData) {
      try {
        const admissionNumber =
          row.studentId ||
          row.student_id ||
          row.admissionNumber ||
          row.admission_number;

        if (!admissionNumber) {
          throw new ValidationError(
            'Student admission number is required'
          );
        }

        const student =
          await prisma.student.findFirst({
            where: { admission_number: admissionNumber, school_id: BigInt(schoolId) },
          });

        if (!student) {
          errors.push({
            row,
            error: 'Student not found',
          });
          continue;
        }

        const amount = parseFloat(
          row.amount ||
            row.totalAmount ||
            row.total_amount ||
            '0'
        );

        if (!amount || amount <= 0) {
          throw new ValidationError(
            'Valid invoice amount is required'
          );
        }

        const dueDate =
          row.dueDate ||
          row.due_date
            ? new Date(
                row.dueDate ||
                  row.due_date
              )
            : new Date(
                Date.now() +
                  30 *
                    24 *
                    60 *
                    60 *
                    1000
              );

        const invoiceNumber =
          row.invoiceNumber ||
          row.invoice_number ||
          `INV-${Date.now()}-${results.length + 1}`;

        const invoice =
          await prisma.invoice.create({
            data: {
              school_id:
                student.school_id,
              student_id:
                student.id,
              invoice_number:
                invoiceNumber,
              invoice_date: new Date(),
              due_date: dueDate,
              total_amount: amount,
              paid_amount: 0,
              pending_amount: amount,
              status: 'unpaid',
              notes: row.notes || undefined,
              created_by: uploadedBy,
            },
          });

        results.push(
          this.serializeBigInt(invoice)
        );
      } catch (error: any) {
        errors.push({
          row,
          error: error.message,
        });
      }
    }

    await this.logUpload(
      'Bulk Invoices',
      csvData.length,
      results.length,
      errors.length,
      uploadedBy
    );

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Bulk upload actual payment transactions.
   *
   * Current schema:
   * payment.invoice_id -> invoice.id
   */
  async uploadPayments(
    csvData: any[],
    uploadedBy: string,
    schoolId: string
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const row of csvData) {
      try {
        const invoiceId =
          row.invoiceId ||
          row.invoice_id;

        if (!invoiceId) {
          throw new ValidationError(
            'Invoice ID is required'
          );
        }

        const amount = parseFloat(
          row.amount || '0'
        );

        if (!amount || amount <= 0) {
          throw new ValidationError(
            'Valid payment amount is required'
          );
        }

        const invoice =
          await prisma.invoice.findFirst({
            where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
          });

        if (!invoice) {
          errors.push({
            row,
            error: 'Invoice not found',
          });
          continue;
        }

        const currentPaid = Number(
          invoice.paid_amount ?? 0
        );

        const currentPending = Number(
          invoice.pending_amount
        );

        if (currentPending <= 0) {
          errors.push({
            row,
            error: 'Invoice is already fully paid',
          });
          continue;
        }

        if (amount > currentPending) {
          errors.push({
            row,
            error:
              `Payment amount (₹${amount}) cannot exceed pending amount (₹${currentPending})`,
          });
          continue;
        }

        const newPaid =
          currentPaid + amount;

        const newPending = Math.max(
          0,
          Number(invoice.total_amount) -
            newPaid
        );

        const newStatus =
          newPending === 0
            ? 'paid'
            : 'partial';

        const paymentNumber =
          row.paymentNumber ||
          row.payment_number ||
          `PAY-${Date.now()}-${results.length + 1}`;

        const result =
          await prisma.$transaction(
            async (tx) => {
              const payment =
                await tx.payment.create({
                  data: {
                    school_id:
                      invoice.school_id,
                    student_id:
                      invoice.student_id,
                    invoice_id:
                      invoice.id,
                    payment_number:
                      paymentNumber,
                    amount,
                    payment_date:
                      row.paymentDate ||
                      row.payment_date
                        ? new Date(
                            row.paymentDate ||
                              row.payment_date
                          )
                        : new Date(),
                    payment_method:
                      row.paymentMethod ||
                      row.payment_method ||
                      'cash',
                    transaction_id:
                      row.transactionId ||
                      row.transaction_id ||
                      undefined,
                    bank_name:
                      row.bankName ||
                      row.bank_name ||
                      undefined,
                    cheque_number:
                      row.chequeNumber ||
                      row.cheque_number ||
                      undefined,
                    status: newStatus,
                    remarks:
                      row.notes ||
                      row.remarks ||
                      undefined,
                    received_by:
                      uploadedBy,
                  },
                });

              const updatedInvoice =
                await tx.invoice.update({
                  where: {
                    id: invoice.id,
                  },
                  data: {
                    paid_amount: newPaid,
                    pending_amount:
                      newPending,
                    status: newStatus,
                    updated_at: new Date(),
                  },
                });

              return {
                payment,
                invoice:
                  updatedInvoice,
              };
            }
          );

        results.push({
          payment:
            this.serializeBigInt(
              result.payment
            ),
          invoice:
            this.serializeBigInt(
              result.invoice
            ),
        });
      } catch (error: any) {
        errors.push({
          row,
          error: error.message,
        });
      }
    }

    await this.logUpload(
      'Payment Records',
      csvData.length,
      results.length,
      errors.length,
      uploadedBy
    );

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Bulk upload students.
   *
   * IMPORTANT:
   * Current schema has no course/class relation on student.
   *
   * school_id is required.
   * admission_number is the student's unique identifier.
   */
  async uploadStudents(
    csvData: any[],
    uploadedBy: string,
    schoolId: string
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const row of csvData) {
      try {
        const admissionNumber =
          row.studentId ||
          row.student_id ||
          row.admissionNumber ||
          row.admission_number;

        if (!admissionNumber) {
          throw new ValidationError(
            'Student admission number is required'
          );
        }

        const existingStudent =
          await prisma.student.findUnique({
            where: {
              admission_number:
                admissionNumber,
            },
          });

        if (existingStudent) {
          errors.push({
            row,
            error:
              'Student with this admission number already exists',
          });
          continue;
        }

        const fullName =
          row.studentName ||
          row.student_name ||
          '';

        const nameParts =
          fullName
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        const firstName =
          row.firstName ||
          row.first_name ||
          nameParts[0] ||
          'Unknown';

        const lastName =
          row.lastName ||
          row.last_name ||
          nameParts.slice(1).join(' ') ||
          undefined;

        const student =
          await prisma.student.create({
            data: {
              school_id:
                BigInt(schoolId),

              admission_number:
                admissionNumber,

              first_name:
                firstName,

              last_name:
                lastName,

              middle_name:
                row.middleName ||
                row.middle_name ||
                undefined,

              email:
                row.email ||
                undefined,

              phone:
                row.phone ||
                undefined,

              date_of_birth:
                row.dateOfBirth ||
                row.date_of_birth
                  ? new Date(
                      row.dateOfBirth ||
                        row.date_of_birth
                    )
                  : undefined,

              gender:
                row.gender ||
                undefined,

              address:
                row.address ||
                row.street ||
                undefined,

              city:
                row.city ||
                undefined,

              state:
                row.state ||
                undefined,

              postal_code:
                row.postalCode ||
                row.postal_code ||
                row.pincode ||
                undefined,

              country:
                row.country ||
                'India',

              blood_group:
                row.bloodGroup ||
                row.blood_group ||
                undefined,

              aadhar_number:
                row.aadharNumber ||
                row.aadhar_number ||
                undefined,

              status:
                row.status ||
                'active',

              created_by:
                uploadedBy,
            },
          });

        results.push(
          this.serializeBigInt(student)
        );
      } catch (error: any) {
        errors.push({
          row,
          error: error.message,
        });
      }
    }

    await this.logUpload(
      'Student Data',
      csvData.length,
      results.length,
      errors.length,
      uploadedBy
    );

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * The current Prisma schema does not contain
   * a bulkUploadLog model.
   *
   * Keep this method as a no-op so existing
   * upload flows continue to work without
   * referencing a non-existent Prisma model.
   */
  async getUploadLogs(
    page: number = 1,
    limit: number = 10
  ) {
    return {
      logs: [],
      total: 0,
      page,
      limit,
    };
  }

  /**
   * Current schema has no bulk_upload_log table.
   * Therefore logging is intentionally disabled.
   */
  private async logUpload(
    _type: string,
    _total: number,
    _success: number,
    _failed: number,
    _uploadedBy: string
  ) {
    return;
  }

  /**
   * Convert BigInt values into JSON-safe values.
   */
  private serializeBigInt(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.serializeBigInt(item)
      );
    }

    if (typeof value === 'object') {
      const result: any = {};

      for (const [key, item] of Object.entries(
        value
      )) {
        result[key] =
          this.serializeBigInt(item);
      }

      return result;
    }

    return value;
  }
}

export default new BulkUploadService();
