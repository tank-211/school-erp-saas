import prisma from '../src/lib/prisma.js';
import * as feeQueries from '../db/queries/feeQueries.js';
import Joi from 'joi';
import { newInvoiceNumber, findUninvoicedAssignments } from '../services/admissionFeeService.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

/**
 * Fees Controller
 * Handles all fee and invoice related endpoints
 */

// Validation schemas
const generateInvoiceSchema = Joi.object({
  student_id: Joi.number().integer().required(),
  fee_structure_ids: Joi.array().items(Joi.number().integer()).min(1).required()
});

/**
 * GET /api/fees/dashboard-stats
 * Aggregate total_amount, paid_amount, and pending_amount
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const stats = await feeQueries.getDashboardStats(school_id);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fees/transactions
 * Fetch list of invoices with student and class info
 */
export const getTransactions = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const transactions = await feeQueries.getTransactions(school_id);

    res.status(200).json({
      success: true,
      data: JSON.parse(
        JSON.stringify(
          transactions,
          (key, value) =>
            typeof value === 'bigint'
              ? value.toString()
              : value
        )
      )
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fees/invoice/:id
 * Fetch full invoice details with school, student, parent, and payment history
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { school_id } = req.user;

    const invoice = await feeQueries.getInvoiceById(id, school_id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fees/uninvoiced
 * Students with fees assigned but not invoiced yet, for the Generate Invoice dialog.
 */
export const getUninvoicedFees = async (req, res, next) => {
  try {
    const assignments = await findUninvoicedAssignments(prisma, req.schoolId);
    if (!assignments.length) {
      return res.status(200).json({ success: true, data: [] });
    }
    const students = await prisma.student.findMany({
      where: { school_id: req.schoolId, id: { in: [...new Set(assignments.map((a) => a.student_id))] } },
      select: { id: true, first_name: true, last_name: true, admission_number: true },
    });
    const byStudent = new Map(students.map((st) => [String(st.id), {
      student_id: String(st.id),
      student_name: [st.first_name, st.last_name].filter(Boolean).join(' '),
      admission_number: st.admission_number || null,
      fees: [],
    }]));
    for (const a of assignments) {
      const entry = byStudent.get(String(a.student_id));
      if (!entry) continue;
      entry.fees.push({
        fee_structure_id: String(a.fee_structure_id),
        fee_type: a.fee_structure?.fee_type || 'Fee',
        amount: String(a.final_amount),
        due_date: a.due_date,
      });
    }
    res.status(200).json({
      success: true,
      data: [...byStudent.values()].sort((x, y) => x.student_name.localeCompare(y.student_name)),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fees/generate-invoice
 * Generate new invoice for student with fee calculations
 */
export const generateInvoice = async (req, res, next) => {
  try {
    const { error, value } = generateInvoiceSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { student_id, fee_structure_ids } = value;
    const { school_id, id: user_id } = req.user;

    const result = await prisma.$transaction(async (tx) => {
      // Only fees of this student that are not on an invoice yet, so the
      // same fee cannot be billed twice
      const feeAssignments = await findUninvoicedAssignments(tx, school_id, {
        studentId: student_id,
      });

      const selectedFees = feeAssignments.filter((fee) =>
        fee_structure_ids.includes(
          Number(fee.fee_structure_id)
        )
      );

      if (selectedFees.length === 0) {
        const error = new Error(
          'These fees are already invoiced, or do not belong to this student'
        );
        error.status = 400;
        throw error;
      }

      // Sum in paise so 0.1 + 0.2 style float errors cannot creep into amounts
      const totalAmount = (
        selectedFees.reduce(
          (sum, fee) => sum + Math.round(Number(fee.final_amount) * 100),
          0
        ) / 100
      ).toFixed(2);

      // invoice_number is unique across all schools, so it cannot be a
      // per-school counter (school B's INV-2026-0001 would clash with school A's).
      const invoiceNumber = newInvoiceNumber();

      const invoiceDate = new Date();
      const dueDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );

      const invoice =
        await tx.invoice.create({
          data: {
            school_id: BigInt(school_id),
            student_id: BigInt(student_id),
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            due_date: dueDate,
            total_amount: totalAmount,
            paid_amount: 0,
            pending_amount: totalAmount,
            notes:
              `Fees: ${selectedFees.map((fee) => fee.fee_structure?.fee_type || fee.fee_structure_id).join(', ')}`,
            created_by: req.user.name || 'System'
          }
        });

      // Mark the billed fees so they are not offered again
      await tx.student_fee_assignment.updateMany({
        where: { id: { in: selectedFees.map((fee) => fee.id) }, school_id: BigInt(school_id) },
        data: { status: 'invoiced', updated_at: new Date() },
      });

      await tx.audit_log.create({
        data: {
          school_id: BigInt(school_id),
          user_id: user_id
            ? BigInt(user_id)
            : null,
          action: 'create',
          entity: 'invoice',
          entity_id: invoice.id,
          status: 'success',
          // BigInt ids cannot go into a JSON column as-is
          new_data: serializeBigInt(invoice),
          change_summary:
            `Generated invoice ${invoiceNumber} for student ${student_id}`,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      return invoice;
    });

    res.status(201).json({
      success: true,
      data: serializeBigInt(result),
      message: 'Invoice generated successfully'
    });

  } catch (err) {
    next(err);
  }
};