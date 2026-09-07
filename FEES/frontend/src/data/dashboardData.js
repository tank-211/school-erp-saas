import {
  fetchDashboardStats,
  fetchMonthlyCollectionData,
  fetchPaymentMethodData,
  fetchPendingFeesData,
  fetchRecentTransactions
} from '../services/apiService.js';

// ==================== DASHBOARD METRICS ====================

// ==================== DASHBOARD METRICS ====================

export const getDashboardMetrics = async () => {
  try {
    const result = await fetchDashboardStats();

    console.log('📊 DASHBOARD STATS RESULT:', result);

    if (!result.success) {
      throw new Error(
        result.error || 'Failed to fetch dashboard metrics'
      );
    }

    const stats = result.data?.overallStats;

    console.log('📊 DASHBOARD OVERALL STATS:', stats);

    if (!stats) {
      throw new Error('Dashboard overallStats missing from API response');
    }

    const metrics = {
      totalCollected: Number(stats.totalCollected ?? 0),
      totalPending: Number(stats.totalPending ?? 0),
      totalOverdue: Number(stats.totalOverdue ?? 0),
      totalRefund: Number(stats.totalRefund ?? 0),
    };

    console.log('📊 FINAL DASHBOARD METRICS:', metrics);

    return metrics;
  } catch (error) {
    console.error(
      'Failed to fetch dashboard metrics from database',
      error
    );

    return {
      totalCollected: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalRefund: 0,
    };
  }
};


// ==================== MONTHLY COLLECTION ====================

export const getMonthlyData = async () => {
  const result = await fetchMonthlyCollectionData();

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(
      result.error || 'Failed to fetch monthly collection data'
    );
  }

  return result.data.map((item) => {
    const [year, month] = String(item.month).split('-');
    const monthNumber = Number(month);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];

    return {
      month: monthNames[monthNumber - 1],
      collected: Number(item.totalCollected),
      count: Number(item.transactionCount),
      totalCollected: Number(item.totalCollected),
      transactionCount: Number(item.transactionCount),
      year: Number(year)
    };
  });
};


// ==================== PAYMENT METHOD DISTRIBUTION ====================

export const getPaymentMethodData = async () => {
  const result = await fetchPaymentMethodData();

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(
      result.error || 'Failed to fetch payment method data'
    );
  }

  return result.data.map((item) => ({
    name: item.method || item.paymentMethod,
    value: Number(item.totalAmount ?? item.amount),
    count: Number(item.count ?? item.transactionCount)
  }));
};


// ==================== PENDING FEES ====================

export const getPendingFeesData = async (limit = 5) => {
  const result = await fetchPendingFeesData(1, limit);

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(
      result.error || 'Failed to fetch pending fees'
    );
  }

  return result.data.map((fee) => ({
    id: fee.id,

    studentName:
      fee.studentName ||
      `${fee.student?.firstName || ''} ${
        fee.student?.lastName || ''
      }`.trim(),

    class:
      fee.class ||
      fee.className,

    amount: Number(
      fee.amountPending ??
      fee.pending_amount ??
      fee.pendingAmount
    ),

    dueDate: fee.dueDate
      ? new Date(fee.dueDate).toISOString().split('T')[0]
      : null,

    status:
      fee.status ||
      fee.paymentStatus,

    totalAmount: Number(
      fee.totalAmount ??
      fee.total_amount
    ),

    amountPaid: Number(
      fee.amountPaid ??
      fee.paid_amount
    )
  }));
};


// ==================== RECENT TRANSACTIONS ====================

export const getRecentTransactionsData = async (limit = 5) => {
  const result = await fetchRecentTransactions(limit);

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(
      result.error || 'Failed to fetch recent transactions'
    );
  }

  return result.data.map((transaction) => {
    const rawDate =
      transaction.date ??
      transaction.paymentDate ??
      transaction.createdAt ??
      transaction.created_at;

    let formattedDate = null;

    if (rawDate) {
      const parsedDate = new Date(rawDate);

      if (!Number.isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate
          .toISOString()
          .split('T')[0];
      }
    }

    return {
      id: transaction.id,

      invoiceId: transaction.invoiceId,

      invoiceNumber: transaction.invoiceNumber,

      studentId: transaction.studentId,

      studentName: transaction.studentName,

      amount: Number(
        transaction.amount ??
        transaction.lastPaymentAmount
      ),

      paymentMethod:
        transaction.paymentMethod,

      transactionId:
        transaction.transactionId,

      totalAmount:
        transaction.totalAmount != null
          ? Number(transaction.totalAmount)
          : null,

      amountPaid:
        transaction.amountPaid != null
          ? Number(transaction.amountPaid)
          : null,

      amountPending:
        transaction.amountPending != null
          ? Number(transaction.amountPending)
          : null,

      paymentStatus:
        transaction.paymentStatus ??
        transaction.status,

      date: formattedDate,

      createdAt:
        transaction.createdAt ??
        transaction.created_at ??
        null,

      dueDate:
        transaction.dueDate ?? null
    };
  });
};