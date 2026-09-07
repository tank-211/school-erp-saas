import { transactionsData } from "../../data/transactionsData";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiService.js';
import MonthlyFeeChart from '../charts/MonthlyFeeChart';
import PaymentMethodChart from '../charts/PaymentMethodChart';
import TransactionsTable from './TransactionsTable';
import DashboardMetrics from './DashboardMetrics';

const FinancialDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the pre-configured api instance from apiService
        const response = await api.get('/fee-payments/dashboard', {
          params: { year: selectedYear }
        });

        if (response.data.success) {
          setDashboardData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
        // Use mock data on error for development
        setDashboardData(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear]);
  useEffect(() => {
  setRecentTransactions(transactionsData.slice(0, 5));
}, []);

  // Handle receipt view
  const handleReceiptClick = (transaction) => {
    if (transaction.status === 'PAID') {
      navigate(`/receipt/${transaction.id}`, { state: { transaction } });
    } else {
      navigate(`/payment/${transaction.id}`, { state: { transaction } });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="dashboard-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Transform backend data for charts
  const monthlyChartData = dashboardData?.monthlyCollection?.data || [];
  const paymentMethodChartData = dashboardData?.paymentMethodDistribution?.data || [];
  const summary = dashboardData?.summary || {};

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>Financial Dashboard</h1>
          <p>Fee collection analytics, trends, and transaction history</p>
        </div>

        <div className="dashboard-actions">
          <div className="year-selector">
            <label htmlFor="year-select">Year:</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="year-dropdown"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <button onClick={() => navigate('/bulk-upload')} className="btn-outline">
            Bulk Upload
          </button>

          <button onClick={() => navigate('/refund-management')} className="btn-outline">
            Refund Management
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <DashboardMetrics summary={summary} />

      {/* CHARTS SECTION */}
      <div className="charts-grid">
        <div>
          <MonthlyFeeChart data={monthlyChartData} />
        </div>
        <div>
          <PaymentMethodChart data={paymentMethodChartData} />
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="transactions-section">
        <div className="transactions-header">
          <h3>Recent Transactions</h3>
          <button onClick={() => navigate('/fees')} className="view-all-btn">
            View All
          </button>
        </div>

        <TransactionsTable
          rows={recentTransactions}
          onReceiptClick={handleReceiptClick}
        />
      </div>

      {/* Empty State */}
     
    </div>
  );
};

// Mock data for development
const getMockData = () => ({
  year: new Date().getFullYear(),
  monthlyCollection: {
    title: 'Monthly Fee Collection',
    data: [
      { month: 1, monthName: 'Jan', amount: 50000 },
      { month: 2, monthName: 'Feb', amount: 65000 },
      { month: 3, monthName: 'Mar', amount: 55000 },
      { month: 4, monthName: 'Apr', amount: 70000 },
      { month: 5, monthName: 'May', amount: 60000 },
      { month: 6, monthName: 'Jun', amount: 75000 },
      { month: 7, monthName: 'Jul', amount: 80000 },
      { month: 8, monthName: 'Aug', average: 85000 },
      { month: 9, monthName: 'Sep', amount: 72000 },
      { month: 10, monthName: 'Oct', amount: 90000 },
      { month: 11, monthName: 'Nov', amount: 88000 },
      { month: 12, monthName: 'Dec', amount: 95000 }
    ],
    totalCollected: 875000
  },
  paymentMethodDistribution: {
    title: 'Payment Method Distribution',
    data: [
      { method: 'BANK_TRANSFER', count: 45, totalAmount: 450000 },
      { method: 'ONLINE', count: 30, totalAmount: 300000 },
      { method: 'CASH', count: 20, totalAmount: 125000 }
    ],
    total: 95
  },
  recentTransactions: {
    title: 'Recent Transactions',
    data: [
      {
        id: '1',
        studentName: 'John Doe',
        studentId: 'STU001',
        invoiceNo: 'INV-2024-001',
        class: 'Class 12-A',
        amount: 50000,
        method: 'BANK_TRANSFER',
        status: 'PAID',
        transactionDate: new Date().toISOString(),
        phone: '9876543210'
      },
      {
        id: '2',
        studentName: 'Jane Smith',
        studentId: 'STU002',
        invoiceNo: 'INV-2024-002',
        class: 'Class 12-B',
        amount: 45000,
        method: 'ONLINE',
        status: 'PAID',
        transactionDate: new Date().toISOString(),
        phone: '9876543211'
      }
    ],
    count: 2
  },
  summary: {
    totalCollected: 875000,
    totalTransactions: 95,
    averageTransactionAmount: 9210.53
  }
});

export default FinancialDashboard;
