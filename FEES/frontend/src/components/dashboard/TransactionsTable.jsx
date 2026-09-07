import React from 'react';

const TransactionsTable = ({ transactions = [], onReceiptClick }) => {
  // Map status to display format
  const getStatusBadge = (status) => {
    const statusMap = {
      PAID: { color: 'success', label: 'Paid' },
      PENDING: { color: 'warning', label: 'Pending' },
      PARTIAL: { color: 'info', label: 'Partial' },
      OVERDUE: { color: 'danger', label: 'Overdue' }
    };

    const statusInfo = statusMap[status] || { color: 'default', label: status };

    return (
      <span className={`status-badge status-${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format payment method
  const formatPaymentMethod = (method) => {
    const methodMap = {
      BANK_TRANSFER: 'Bank Transfer',
      ONLINE: 'Online',
      CASH: 'Cash',
      CHEQUE: 'Cheque',
      DD: 'Demand Draft',
      UPI: 'UPI',
      CARD: 'Card'
    };
    return methodMap[method] || method;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="transactions-table-wrapper">
        <div className="no-data">
          <p>No transactions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions-table-wrapper">
      <div className="table-responsive">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Invoice #</th>
              <th>Class</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={transaction.id || index} className="transaction-row">
                <td className="student-column">
                  <div className="student-info">
                    <p className="student-name">{transaction.studentName}</p>
                    <p className="student-id">{transaction.studentId}</p>
                  </div>
                </td>
                <td className="invoice-column">
                  <span className="invoice-number">{transaction.invoiceNo || transaction.id}</span>
                </td>
                <td className="class-column">{transaction.class}</td>
                <td className="amount-column">
                  <span className="amount-value">
                    {formatCurrency(transaction.amount)}
                  </span>
                </td>
                <td className="method-column">
                  <span className="method-badge">
                    {formatPaymentMethod(transaction.method)}
                  </span>
                </td>
                <td className="status-column">
                  {getStatusBadge(transaction.status)}
                </td>
                <td className="date-column">
                  {formatDate(transaction.transactionDate)}
                </td>
                <td className="action-column">
                  <button
                    className="receipt-btn"
                    onClick={() => onReceiptClick(transaction)}
                    title={
                      transaction.status === 'PAID'
                        ? 'View Receipt'
                        : 'Complete Payment'
                    }
                  >
                    <span className="btn-icon">📄</span>
                    {transaction.status === 'PAID' ? 'Receipt' : 'Pay'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionsTable;
