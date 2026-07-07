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
  const client = await prisma.$connect();

  try {
    // Validate input
    const { error, value } = generateInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { student_id, fee_structure_ids } = value;
    const { school_id, id: user_id } = req.user;

    // Start transaction
    await client.query('BEGIN');

    // Get student fee assignments
    const feeAssignments = await feeQueries.getStudentFeeAssignments(student_id, school_id);

    // Filter by requested fee_structure_ids
    const selectedFees = feeAssignments.filter(fa =>
      fee_structure_ids.includes(fa.fee_structure_id)
    );

    if (selectedFees.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No valid fee assignments found for the selected fee structures'
      });
    }

    // Calculate totals
    const totalAmount = selectedFees.reduce((sum, fee) => sum + parseFloat(fee.final_amount), 0);
    const invoiceNumber = await feeQueries.generateInvoiceNumber(school_id);
    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    // Create invoice
    const invoiceData = {
      school_id,
      student_id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      total_amount: totalAmount,
      paid_amount: 0,
      pending_amount: totalAmount,
      notes: `Generated for fee structures: ${fee_structure_ids.join(', ')}`,
      created_by: req.user.name || 'System'
    };

    const invoice = await feeQueries.createInvoice(invoiceData);

    // Create audit log
    await feeQueries.createAuditLog({
      school_id,
      user_id,
      action: 'create',
      entity: 'invoice',
      entity_id: invoice.id,
      status: 'success',
      new_data: invoice,
      change_summary: `Generated invoice ${invoiceNumber} for student ${student_id}`,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice generated successfully'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};