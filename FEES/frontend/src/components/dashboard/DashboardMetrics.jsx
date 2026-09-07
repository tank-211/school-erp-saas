import React from 'react';

const DashboardMetrics = ({ summary = {} }) => {
  const {
    totalCollected = 0,
    totalTransactions = 0,
    averageTransactionAmount = 0
  } = summary;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const metrics = [
    {
      id: 'total-collected',
      label: 'Total Collected',
      value: formatCurrency(totalCollected),
      icon: '💰',
      color: 'green'
    },
    {
      id: 'transactions',
      label: 'Total Transactions',
      value: totalTransactions.toLocaleString(),
      icon: '💳',
      color: 'blue'
    },
    {
      id: 'average',
      label: 'Average Amount',
      value: formatCurrency(averageTransactionAmount),
      icon: '📊',
      color: 'emerald'
    }
  ];

  return (
    <div className="metrics-grid">
      {metrics.map((metric) => (
        <div key={metric.id} className={`metric-card metric-${metric.color}`}>
          <div className="metric-icon">{metric.icon}</div>
          <div className="metric-content">
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardMetrics;
