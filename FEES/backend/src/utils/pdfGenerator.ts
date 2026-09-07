// @ts-ignore - pdfkit doesn't have type definitions
import PDFDocument from 'pdfkit';
import logger from '../config/logger';

/**
 * PDF Generator Utility
 * Creates professional PDF reports with pdfkit
 */

export const generateReport = (reportData: any) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
      });

      let buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err: Error) => {
        reject(err);
      });

      // Generate report content
      addHeader(doc);
      addDashboardStats(doc, reportData.dashboardStats);
      doc.addPage();
      addMonthlyTrends(doc, reportData.monthlyTrends);
      doc.addPage();
      addPaymentMethodDistribution(doc, reportData.paymentMethods);
      addRecentTransactions(doc, reportData.recentTransactions);
      doc.addPage();
      addPendingPayments(doc, reportData.pendingPayments);
      doc.addPage();
      addRefundRequests(doc, reportData.refundRequests);
      addFooter(doc);

      doc.end();
    } catch (error: any) {
      logger.error(`PDF generation error: ${error.message}`);
      reject(error);
    }
  });
};

const addHeader = (doc: any) => {
  // Title
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('Fees & Payments Dashboard Report', {
      align: 'center',
    });

  // Subtitle
  doc
    .fontSize(12)
    .font('Helvetica')
    .text('Fee Collection Summary & Analysis', {
      align: 'center',
    });

  // Generated date
  doc
    .fontSize(10)
    .fillColor('#666666')
    .text(`Report Generated: ${new Date().toLocaleString()}`, {
      align: 'center',
    });

  doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke('#CCCCCC');
  doc.moveDown(1);
};

const addDashboardStats = (doc: any, stats: any) => {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Key Metrics');

  doc.moveDown(0.5);

  const statBoxWidth = 120;
  const statBoxHeight = 70;
  const gap = 10;
  const startY = doc.y;

  // Total Fees Collected
  doc.rect(40, startY, statBoxWidth, statBoxHeight).fill('#E3F2FD');
  doc.fontSize(10).fillColor('#1976D2').text('Total Fees Collected', 50, startY + 10);
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(`₹${(stats.totalFeesCollected / 100000).toFixed(2)}L`, 50, startY + 28);

  // Pending Payments
  doc
    .rect(40 + statBoxWidth + gap, startY, statBoxWidth, statBoxHeight)
    .fill('#FFF3E0');
  doc
    .fontSize(10)
    .fillColor('#F57C00')
    .text('Pending Payments', 50 + statBoxWidth + gap, startY + 10);
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(`₹${(stats.pendingPayments / 100000).toFixed(2)}L`, 50 + statBoxWidth + gap, startY + 28);

  // Overdue Payments
  doc
    .rect(40 + (statBoxWidth + gap) * 2, startY, statBoxWidth, statBoxHeight)
    .fill('#FFEBEE');
  doc
    .fontSize(10)
    .fillColor('#D32F2F')
    .text('Overdue Payments', 50 + (statBoxWidth + gap) * 2, startY + 10);
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(`₹${(stats.overduePayments / 100000).toFixed(2)}L`, 50 + (statBoxWidth + gap) * 2, startY + 28);

  // Refund Requests
  doc
    .rect(40 + (statBoxWidth + gap) * 3, startY, statBoxWidth, statBoxHeight)
    .fill('#E8F5E9');
  doc
    .fontSize(10)
    .fillColor('#388E3C')
    .text('Refund Requests', 50 + (statBoxWidth + gap) * 3, startY + 10);
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(`₹${(stats.refundRequests / 100000).toFixed(2)}L`, 50 + (statBoxWidth + gap) * 3, startY + 28);

  doc.moveDown(5);
};

const addMonthlyTrends = (doc: any, trends: any) => {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Monthly Collection Trends');

  doc.moveDown(0.5);

  // Table headers
  const tableTop = doc.y;
  const colWidth = 150;
  const rowHeight = 25;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.rect(40, tableTop, colWidth, rowHeight).fill('#1976D2');
  doc.text('Month', 50, tableTop + 7);
  doc.rect(40 + colWidth, tableTop, colWidth, rowHeight).fill('#1976D2');
  doc.text('Amount', 50 + colWidth, tableTop + 7);
  doc.rect(40 + colWidth * 2, tableTop, colWidth - 40, rowHeight).fill('#1976D2');
  doc.text('Transactions', 50 + colWidth * 2, tableTop + 7);

  // Table rows
  doc.fontSize(9).font('Helvetica').fillColor('#000000');
  let currentY = tableTop + rowHeight;

  trends.forEach((trend: any, index: number) => {
    const bgColor = index % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
    doc.rect(40, currentY, colWidth, rowHeight).fill(bgColor);
    doc.text(trend.month, 50, currentY + 7);
    doc.rect(40 + colWidth, currentY, colWidth, rowHeight).fill(bgColor);
    doc.text(`₹${trend.amount.toLocaleString()}`, 50 + colWidth, currentY + 7);
    doc
      .rect(40 + colWidth * 2, currentY, colWidth - 40, rowHeight)
      .fill(bgColor);
    doc.text(`${trend.count}`, 50 + colWidth * 2, currentY + 7);
    currentY += rowHeight;
  });

  doc.moveDown(trends.length + 1);
};

const addPaymentMethodDistribution = (doc: any, methods: any) => {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Payment Method Distribution');

  doc.moveDown(0.5);

  methods.forEach((method: any) => {
    const percentage = (
      (method.amount /
        methods.reduce((sum: number, m: any) => sum + m.amount, 0)) *
      100
    ).toFixed(1);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`${method.method}: ₹${method.amount.toLocaleString()} (${percentage}%)`);
  });

  doc.moveDown(1);
};

const addRecentTransactions = (doc: any, transactions: any) => {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Recent Transactions');

  doc.moveDown(0.5);

  const tableTop = doc.y;
  const colWidth = 120;
  const rowHeight = 20;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.rect(40, tableTop, colWidth, rowHeight).fill('#1976D2');
  doc.text('Student', 45, tableTop + 5);
  doc.rect(40 + colWidth, tableTop, colWidth, rowHeight).fill('#1976D2');
  doc.text('Amount', 45 + colWidth, tableTop + 5);
  doc.rect(40 + colWidth * 2, tableTop, colWidth, rowHeight).fill('#1976D2');
  doc.text('Method', 45 + colWidth * 2, tableTop + 5);
  doc.rect(40 + colWidth * 3, tableTop, colWidth + 15, rowHeight).fill('#1976D2');
  doc.text('Date', 45 + colWidth * 3, tableTop + 5);

  doc.fontSize(8).font('Helvetica').fillColor('#000000');
  let currentY = tableTop + rowHeight;

  transactions.slice(0, 10).forEach((txn: any, index: number) => {
    const bgColor = index % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
    doc.rect(40, currentY, colWidth, rowHeight).fill(bgColor);
    doc.text(txn.studentName.substring(0, 15), 45, currentY + 3);
    doc.rect(40 + colWidth, currentY, colWidth, rowHeight).fill(bgColor);
    doc.text(`₹${txn.amount}`, 45 + colWidth, currentY + 3);
    doc.rect(40 + colWidth * 2, currentY, colWidth, rowHeight).fill(bgColor);
    doc.text(txn.paymentMethod || '-', 45 + colWidth * 2, currentY + 3);
    doc.rect(40 + colWidth * 3, currentY, colWidth + 15, rowHeight).fill(bgColor);
    doc.text(new Date(txn.date).toLocaleDateString(), 45 + colWidth * 3, currentY + 3);
    currentY += rowHeight;
  });

  doc.moveDown(11);
};

const addPendingPayments = (doc: any, pending: any) => {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Pending Payments');

  doc.moveDown(0.5);

  pending.slice(0, 10).forEach((p: any, index: number) => {
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#333333')
      .text(
        `${index + 1}. ${p.studentName} - ₹${p.amountPending.toLocaleString()} (Due: ${new Date(
          p.dueDate
        ).toLocaleDateString()})`
      );
  });

  doc.moveDown(1);
};

const addRefundRequests = (doc: any, refunds: any) => {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Refund Requests');

  doc.moveDown(0.5);

  refunds.forEach((r: any, index: number) => {
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#333333')
      .text(
        `${index + 1}. ${r.studentName} - ₹${r.amount.toLocaleString()} (${r.status})`
      );
  });

  doc.moveDown(1);
};

const addFooter = (doc: any) => {
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text(
      `Report Generated on: ${new Date().toLocaleString()} | Sacred Tree International School`,
      40,
      doc.page.height - 50,
      { align: 'center' }
    );
};

export default {
  generateReport,
};
