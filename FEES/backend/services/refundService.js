import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

export class RefundService {
  static async createRefundRequest(refundData, studentId) {
    try {
      let feePaymentId = refundData.feePayment;
      
      // If feePayment is not a valid UUID/CUID format, try to find it
      if (!feePaymentId || feePaymentId === 'invoiceId') {
        logger.info(`feePayment reference not found: ${feePaymentId}, fetching latest for student`);
        
        // Find the most recent fee payment for the student
        const latestFeePayment = await prisma.feePayment.findFirst({
          where: { studentId },
          orderBy: { createdAt: 'desc' },
        });
        
        if (!latestFeePayment) {
          throw new Error('No fee payment records found for this student');
        }
        
        feePaymentId = latestFeePayment.id;
        logger.info(`Using fee payment: ${feePaymentId}`);
      }

      // Verify fee payment exists and belongs to student
      const feePayment = await prisma.feePayment.findUnique({
        where: { id: feePaymentId },
      });

      if (!feePayment) {
        throw new Error('Fee payment not found');
      }

      if (feePayment.studentId !== studentId) {
        logger.warn(`Fee payment ${feePaymentId} does not belong to student ${studentId}`);
        throw new Error('Unauthorized: Fee payment does not belong to this student');
      }

      // Check if refund amount is valid
      if (parseFloat(refundData.amount) > parseFloat(feePayment.amountPaid)) {
        throw new Error(`Refund amount cannot exceed paid amount (${feePayment.amountPaid})`);
      }

      // Create refund request
      const refundRequest = await prisma.refundRequest.create({
        data: {
          studentId,
          feePaymentId,
          amount: parseFloat(refundData.amount),
          reason: refundData.reason,
          description: refundData.description,
          refundMethod: refundData.refundMethod || 'BANK_TRANSFER',
          bankAccountHolder: refundData.bankDetails?.accountHolder,
          bankAccountNumber: refundData.bankDetails?.accountNumber,
          ifscCode: refundData.bankDetails?.ifscCode,
          notes: refundData.notes,
          status: 'PENDING',
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          feePayment: {
            select: {
              id: true,
              totalAmount: true,
              amountPaid: true,
            },
          },
        },
      });

      logger.info(`Refund request created: ${refundRequest.id}`);
      return refundRequest;
    } catch (error) {
      logger.error(`Create refund request error: ${error.message}`);
      throw error;
    }
  }

  static async approveRefundRequest(refundId, approvalData) {
    try {
      const refundRequest = await prisma.refundRequest.findUnique({
        where: { id: refundId },
      });

      if (!refundRequest) {
        throw new Error('Refund request not found');
      }

      const updatedRefund = await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'APPROVED',
          approvedBy: approvalData.approvedBy,
          approvalDate: new Date(),
          notes: approvalData.notes,
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          feePayment: true,
        },
      });

      logger.info(`Refund request approved: ${refundRequest.id}`);
      return updatedRefund;
    } catch (error) {
      logger.error(`Approve refund request error: ${error.message}`);
      throw error;
    }
  }

  static async rejectRefundRequest(refundId, rejectionData) {
    try {
      const refundRequest = await prisma.refundRequest.findUnique({
        where: { id: refundId },
      });

      if (!refundRequest) {
        throw new Error('Refund request not found');
      }

      const updatedRefund = await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionData.rejectionReason,
          approvedBy: rejectionData.approvedBy,
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          feePayment: true,
        },
      });

      logger.info(`Refund request rejected: ${refundRequest.id}`);
      return updatedRefund;
    } catch (error) {
      logger.error(`Reject refund request error: ${error.message}`);
      throw error;
    }
  }

  static async processRefund(refundId, processData) {
    try {
      const refundRequest = await prisma.refundRequest.findUnique({
        where: { id: refundId },
      });

      if (!refundRequest) {
        throw new Error('Refund request not found');
      }

      if (refundRequest.status !== 'APPROVED') {
        throw new Error('Refund request must be approved before processing');
      }

      const updatedRefund = await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'PROCESSED',
          processedDate: new Date(),
          refundTransactionId: processData.transactionId,
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          feePayment: true,
        },
      });

      logger.info(`Refund processed: ${refundRequest.id}`);
      return updatedRefund;
    } catch (error) {
      logger.error(`Process refund error: ${error.message}`);
      throw error;
    }
  }

  static async getRefundRequests(filters = {}, skip = 0, limit = 10) {
    try {
      const where = {};

      if (filters.status) {
        where.status = filters.status.toUpperCase();
      }
      if (filters.student) {
        where.studentId = filters.student;
      }

      const refunds = await prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestDate: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          feePayment: {
            select: {
              id: true,
              totalAmount: true,
              amountPaid: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      const total = await prisma.refundRequest.count({ where });

      return { refunds, total };
    } catch (error) {
      logger.error(`Get refund requests error: ${error.message}`);
      throw error;
    }
  }

  static async getRefundStats() {
    try {
      const stats = await prisma.refundRequest.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      });

      const formattedStats = stats.map((stat) => ({
        status: stat.status,
        count: stat._count.id,
        totalAmount: stat._sum.amount || 0,
      }));

      return formattedStats;
    } catch (error) {
      logger.error(`Get refund stats error: ${error.message}`);
      throw error;
    }
  }
}
