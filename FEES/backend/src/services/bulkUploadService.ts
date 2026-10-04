import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { serializeBigInt } from '../utils/responseHelper';

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
    schoolId: string,
    fileName: string = ''
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const row of csvData) {
      try {
        const scopedSchoolId = schoolId;
        // Class and year may be given by name (as on School Setup) or by id.
        // With no year given, the school's active year is used.
        const academicYearId = await this.resolveAcademicYearId(row, scopedSchoolId);
        const classId = await this.resolveClassId(row, scopedSchoolId);

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
          // The same fee type can exist only once per class and academic year
          error:
            error?.code === 'P2002'
              ? `${row.feeType || row.fee_type || 'General Fee'} already exists for ${row.className || row.class_name || 'this class'} in this academic year. Use a different fee type name, or change the existing fee.`
              : error.message,
        });
      }
    }

    await this.logUpload(
      'Fee Structure',
      csvData.length,
      results.length,
      errors.length,
      uploadedBy,
      schoolId,
      fileName
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
    schoolId: string,
    fileName: string = ''
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
      uploadedBy,
      schoolId,
      fileName
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
    schoolId: string,
    fileName: string = ''
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const row of csvData) {
      try {
        // Invoice by its number (INV-...) as printed, or by internal id
        const invoiceRef = String(
          row.invoiceNumber ||
          row.invoice_number ||
          row.invoiceId ||
          row.invoice_id ||
          ''
        ).trim();

        if (!invoiceRef) {
          throw new ValidationError(
            'Invoice number is required'
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
            where: /^\d+$/.test(invoiceRef)
              ? { id: BigInt(invoiceRef), school_id: BigInt(schoolId) }
              : { invoice_number: invoiceRef, school_id: BigInt(schoolId) },
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
      uploadedBy,
      schoolId,
      fileName
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
    schoolId: string,
    fileName: string = ''
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
      uploadedBy,
      schoolId,
      fileName
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
  /**
   * Upload history of one school. There is no bulk_upload_log table, so each
   * upload is recorded in audit_log (action 'bulk_upload').
   */
  async getUploadLogs(
    page: number = 1,
    limit: number = 10,
    schoolId: string
  ) {
    const where = { school_id: BigInt(schoolId), action: 'bulk_upload' };
    const [rows, total] = await Promise.all([
      prisma.audit_log.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { app_user: { select: { name: true } } },
      }),
      prisma.audit_log.count({ where }),
    ]);

    const logs = rows.map((row: any) => {
      const data = (row.new_data || {}) as any;
      return {
        id: row.id.toString(),
        type: row.entity,
        fileName: data.fileName || null,
        records: Number(data.total || 0),
        succeeded: Number(data.success || 0),
        failed: Number(data.failed || 0),
        status: row.status,
        uploadedBy: row.app_user?.name || null,
        createdAt: row.created_at,
      };
    });

    return { logs, total, page, limit };
  }

  private async logUpload(
    type: string,
    total: number,
    success: number,
    failed: number,
    uploadedBy: string,
    schoolId: string,
    fileName: string
  ) {
    // History must never break the upload itself
    try {
      await prisma.audit_log.create({
        data: {
          school_id: BigInt(schoolId),
          user_id: /^\d+$/.test(String(uploadedBy || '')) ? BigInt(uploadedBy) : null,
          action: 'bulk_upload',
          entity: type,
          entity_id: BigInt(0),
          status: failed === 0 ? 'success' : success === 0 ? 'failed' : 'partial',
          new_data: { fileName: fileName || null, total, success, failed },
          change_summary: `${type} upload: ${success} of ${total} rows imported`,
        },
      });
    } catch (error: any) {
      console.error('Could not record upload history:', error?.message);
    }
  }

  private async resolveAcademicYearId(row: any, schoolId: string): Promise<bigint> {
    const sid = BigInt(schoolId);
    const byId = row.academicYearId || row.academic_year_id;
    const byName = String(row.academicYear || row.academic_year || row.yearName || '').trim();
    const year = byId && /^\d+$/.test(String(byId))
      ? await prisma.academic_year.findFirst({ where: { id: BigInt(byId), school_id: sid }, select: { id: true } })
      : byName
        ? await prisma.academic_year.findFirst({ where: { school_id: sid, year_name: { equals: byName, mode: 'insensitive' } }, select: { id: true } })
        : await prisma.academic_year.findFirst({ where: { school_id: sid, is_active: true }, select: { id: true } });
    if (!year) {
      throw new ValidationError(
        byId || byName
          ? `Academic year "${byName || byId}" was not found in your school`
          : 'No academic year given and the school has no active year'
      );
    }
    return year.id;
  }

  private async resolveClassId(row: any, schoolId: string): Promise<bigint> {
    const sid = BigInt(schoolId);
    const byId = row.classId || row.class_id;
    const byName = String(row.className || row.class_name || row.class || '').trim();
    if (!byId && !byName) {
      throw new ValidationError('className is required');
    }
    const found = byId && /^\d+$/.test(String(byId))
      ? await prisma.school_class.findFirst({ where: { id: BigInt(byId), school_id: sid }, select: { id: true } })
      : await prisma.school_class.findFirst({ where: { school_id: sid, class_name: { equals: byName, mode: 'insensitive' } }, select: { id: true } });
    if (!found) {
      throw new ValidationError(`Class "${byName || byId}" was not found in your school`);
    }
    return found.id;
  }

  /**
   * Convert BigInt values into JSON-safe values.
   */
  private serializeBigInt(value: any): any {
    return serializeBigInt(value);
  }
}

export default new BulkUploadService();
