import ReportService from '../services/reportService.js';
import PDFGenerator from '../utils/pdfGenerator.js';
import { sendErrorResponse } from '../utils/responseHelper.js';
import logger from '../config/logger.js';

/**
 * Report Controller
 * Handles report generation and export endpoints
 */
export class ReportController {
  /**
   * Export comprehensive report as PDF
   * GET /api/reports/export
   */
  static async exportReport(req, res, next) {
    try {
      logger.info('Starting report export...');

      // Fetch comprehensive report data
      const reportData = await ReportService.getComprehensiveReportData();

      // Generate PDF
      const pdfBuffer = await PDFGenerator.generateReport(reportData);

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
    } catch (error) {
      logger.error(`Export report error: ${error.message}`);
      return sendErrorResponse(
        res,
        `Failed to export report: ${error.message}`,
        500
      );
    }
  }

  /**
   * Export dashboard statistics only
   * GET /api/reports/dashboard-stats
   */
  static async exportDashboardStats(req, res, next) {
    try {
      const stats = await ReportService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`Export dashboard stats error: ${error.message}`);
      return sendErrorResponse(
        res,
        `Failed to fetch dashboard stats: ${error.message}`,
        500
      );
    }
  }

  /**
   * Export recent transactions as CSV
   * GET /api/reports/transactions/csv
   */
  static async exportTransactionsCSV(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const transactions = await ReportService.getRecentTransactions(limit);

      // Create CSV content
      const csvContent = this.generateCSV(
        [
          'Student ID',
          'Student Name',
          'Amount',
          'Payment Method',
          'Transaction ID',
          'Total Amount',
          'Amount Paid',
          'Status',
          'Date',
        ],
        transactions.map((t) => [
          t.studentId,
          t.studentName,
          t.amount,
          t.paymentMethod,
          t.transactionId,
          t.totalAmount,
          t.amountPaid,
          t.paymentStatus,
          new Date(t.date).toLocaleString(),
        ])
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Transactions_${new Date().toISOString().split('T')[0]}.csv"`
      );

      logger.info('Transactions exported as CSV');
      res.end(csvContent);
    } catch (error) {
      logger.error(`Export transactions CSV error: ${error.message}`);
      return sendErrorResponse(
        res,
        `Failed to export transactions: ${error.message}`,
        500
      );
    }
  }

  /**
   * Export pending payments as CSV
   * GET /api/reports/pending-payments/csv
   */
  static async exportPendingPaymentsCSV(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const pendingPayments = await ReportService.getPendingPaymentsReport(
        limit
      );

      // Create CSV content
      const csvContent = this.generateCSV(
        [
          'Student ID',
          'Student Name',
          'Email',
          'Total Amount',
          'Amount Paid',
          'Amount Pending',
          'Due Date',
          'Status',
          'Days Overdue',
        ],
        pendingPayments.map((p) => [
          p.studentId,
          p.studentName,
          p.email,
          p.totalAmount,
          p.amountPaid,
          p.amountPending,
          new Date(p.dueDate).toLocaleDateString(),
          p.status,
          p.daysOverdue,
        ])
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Pending_Payments_${new Date().toISOString().split('T')[0]}.csv"`
      );

      logger.info('Pending payments exported as CSV');
      res.end(csvContent);
    } catch (error) {
      logger.error(`Export pending payments CSV error: ${error.message}`);
      return sendErrorResponse(
        res,
        `Failed to export pending payments: ${error.message}`,
        500
      );
    }
  }

  /**
   * Export refund requests as CSV
   * GET /api/reports/refunds/csv
   */
  static async exportRefundsCSV(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const refunds = await ReportService.getRefundRequestsReport(limit);

      // Create CSV content
      const csvContent = this.generateCSV(
        [
          'Request ID',
          'Student ID',
          'Student Name',
          'Amount',
          'Reason',
          'Status',
          'Request Date',
          'Approved By',
        ],
        refunds.map((r) => [
          r.id,
          r.studentId,
          r.studentName,
          r.amount,
          r.reason,
          r.status,
          new Date(r.requestDate).toLocaleString(),
          r.approver,
        ])
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Refund_Requests_${new Date().toISOString().split('T')[0]}.csv"`
      );

      logger.info('Refund requests exported as CSV');
      res.end(csvContent);
    } catch (error) {
      logger.error(`Export refunds CSV error: ${error.message}`);
      return sendErrorResponse(
        res,
        `Failed to export refunds: ${error.message}`,
        500
      );
    }
  }

  /**
   * Generate CSV from data
   * @private
   */
  static generateCSV(headers, rows) {
    const csvHeaders = headers
      .map((h) => `"${h.replace(/"/g, '""')}"`)
      .join(',');

    const csvRows = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = cell !== null && cell !== undefined ? String(cell) : '';
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');

    return `${csvHeaders}\n${csvRows}`;
  }

  /**
   * Get available report formats
   * GET /api/reports/formats
   */
  static async getAvailableFormats(req, res, next) {
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
        {
          id: 'stats-json',
          name: 'Dashboard Statistics',
          description: 'Current dashboard statistics in JSON format',
          endpoint: '/api/reports/dashboard-stats',
        },
      ];

      res.json({
        success: true,
        data: formats,
      });
    } catch (error) {
      logger.error(`Get available formats error: ${error.message}`);
      return sendErrorResponse(res, error.message, 500);
    }
  }
}

export default ReportController;
