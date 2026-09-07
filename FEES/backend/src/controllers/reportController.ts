import { Request, Response } from 'express';
import reportService from '../services/reportService';
import pdfGenerator from '../utils/pdfGenerator';
import logger from '../config/logger';

/**
 * Export comprehensive report as PDF
 * GET /api/reports/export
 */
export const exportReport = async (req: Request, res: Response) => {
  try {
    logger.info('Starting report export...');

    // Fetch comprehensive report data
    const reportData = await reportService.getComprehensiveReportData(req.user!.schoolId);

    // Generate PDF
    const pdfBuffer: any = await pdfGenerator.generateReport(reportData);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Fee_Report_${new Date().toISOString().split('T')[0]}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    logger.info(`Report exported successfully. Size: ${pdfBuffer.length} bytes`);

    // Send PDF to client
    res.end(pdfBuffer);
  } catch (error: any) {
    logger.error(`Export report error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to export report: ${error.message}`,
    });
  }
};

/**
 * Export dashboard statistics only
 * GET /api/reports/dashboard-stats
 */
export const exportDashboardStats = async (req: Request, res: Response) => {
  try {
    const stats = await reportService.getDashboardStats(req.user!.schoolId);
    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error(`Export dashboard stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to fetch dashboard stats: ${error.message}`,
    });
  }
};

/**
 * Export recent transactions as CSV
 * GET /api/reports/transactions/csv
 */
export const exportTransactionsCSV = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const transactions = await reportService.getRecentTransactions(req.user!.schoolId, limit);

    // Create CSV content
    const headers = [
      'Student ID',
      'Student Name',
      'Amount',
      'Payment Method',
      'Transaction ID',
      'Total Amount',
      'Amount Paid',
      'Status',
      'Date',
    ];

    const csvContent = [
      headers.join(','),
      ...transactions.map((t: any) =>
        [
          t.studentId,
          t.studentName,
          t.amount,
          t.paymentMethod,
          t.transactionId,
          t.totalAmount,
          t.amountPaid,
          t.paymentStatus,
          new Date(t.date).toLocaleString(),
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Transactions_${new Date().toISOString().split('T')[0]}.csv"`
    );

    logger.info('Transactions exported as CSV');
    res.end(csvContent);
  } catch (error: any) {
    logger.error(`Export transactions CSV error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to export transactions: ${error.message}`,
    });
  }
};

/**
 * Export pending payments as CSV
 * GET /api/reports/pending-payments/csv
 */
export const exportPendingPaymentsCSV = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const pendingPayments = await reportService.getPendingPaymentsReport(req.user!.schoolId, limit);

    // Create CSV content
    const headers = [
      'Student ID',
      'Student Name',
      'Email',
      'Total Amount',
      'Amount Paid',
      'Amount Pending',
      'Due Date',
      'Status',
      'Days Overdue',
    ];

    const csvContent = [
      headers.join(','),
      ...pendingPayments.map((p: any) =>
        [
          p.studentId,
          p.studentName,
          p.email,
          p.totalAmount,
          p.amountPaid,
          p.amountPending,
          new Date(p.dueDate).toLocaleDateString(),
          p.status,
          p.daysOverdue,
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Pending_Payments_${new Date().toISOString().split('T')[0]}.csv"`
    );

    logger.info('Pending payments exported as CSV');
    res.end(csvContent);
  } catch (error: any) {
    logger.error(`Export pending payments CSV error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to export pending payments: ${error.message}`,
    });
  }
};

/**
 * Export refund requests as CSV
 * GET /api/reports/refunds/csv
 */
export const exportRefundsCSV = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const refunds = await reportService.getRefundRequestsReport(req.user!.schoolId, limit);

    // Create CSV content
    const headers = [
      'Request ID',
      'Student ID',
      'Student Name',
      'Amount',
      'Reason',
      'Status',
      'Request Date',
      'Processed Date',
    ];

    const csvContent = [
      headers.join(','),
      ...refunds.map((r: any) =>
        [
          r.id,
          r.studentId,
          r.studentName,
          r.amount,
          r.reason,
          r.status,
          new Date(r.requestDate).toLocaleDateString(),
          new Date(r.processedDate).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Refund_Requests_${new Date().toISOString().split('T')[0]}.csv"`
    );

    logger.info('Refunds exported as CSV');
    res.end(csvContent);
  } catch (error: any) {
    logger.error(`Export refunds CSV error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to export refunds: ${error.message}`,
    });
  }
};

/**
 * Get available report formats
 * GET /api/reports/formats
 */
export const getAvailableFormats = async (req: Request, res: Response) => {
  try {
    const formats = [
      {
        id: 'pdf',
        name: 'PDF Report',
        description: 'Comprehensive report with all data in PDF format',
        endpoint: '/api/reports/export',
      },
      {
        id: 'transactions-csv',
        name: 'Transactions CSV',
        description: 'Recent transactions in CSV format',
        endpoint: '/api/reports/transactions/csv',
      },
      {
        id: 'pending-csv',
        name: 'Pending Payments CSV',
        description: 'Pending payments list in CSV format',
        endpoint: '/api/reports/pending-payments/csv',
      },
      {
        id: 'refunds-csv',
        name: 'Refund Requests CSV',
        description: 'Refund requests in CSV format',
        endpoint: '/api/reports/refunds/csv',
      },
    ];

    res.json({
      success: true,
      formats,
    });
  } catch (error: any) {
    logger.error(`Get available formats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to get available formats: ${error.message}`,
    });
  }
};

export default {
  exportReport,
  exportDashboardStats,
  exportTransactionsCSV,
  exportPendingPaymentsCSV,
  exportRefundsCSV,
  getAvailableFormats,
};
