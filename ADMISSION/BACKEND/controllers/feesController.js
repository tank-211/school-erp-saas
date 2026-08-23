import prisma from '../src/lib/prisma.js';
import * as feeQueries from '../db/queries/feeQueries.js';
import Joi from 'joi';

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
      const feeAssignments =
        await tx.student_fee_assignment.findMany({
          where: {
            student_id: BigInt(student_id),
            school_id: BigInt(school_id)
          },
          include: {
            fee_structure: true
          }
        });

      const selectedFees = feeAssignments.filter((fee) =>
        fee_structure_ids.includes(
          Number(fee.fee_structure_id)
        )
      );

      if (selectedFees.length === 0) {
        const error = new Error(
          'No valid fee assignments found for the selected fee structures'
        );
        error.status = 400;
        throw error;
      }

      const totalAmount = selectedFees.reduce(
        (sum, fee) =>
          sum + parseFloat(fee.final_amount),
        0
      );

      const year = new Date().getFullYear();

      const invoiceCount =
        await tx.invoice.count({
          where: {
            school_id: BigInt(school_id),
            created_at: {
              gte: new Date(year, 0, 1),
              lt: new Date(year + 1, 0, 1)
            }
          }
        });

      const invoiceNumber =
        `INV-${year}-${String(invoiceCount + 1).padStart(4, '0')}`;

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
              `Generated for fee structures: ${fee_structure_ids.join(', ')}`,
            created_by: req.user.name || 'System'
          }
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
          new_data: invoice,
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
      data: result,
      message: 'Invoice generated successfully'
    });

  } catch (err) {
    next(err);
  }
};