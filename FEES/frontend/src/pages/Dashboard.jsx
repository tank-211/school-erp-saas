import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
 

/* 👇 IMPORT YOUR OLD GRAPH COMPONENTS */
import MonthlyFeeChart from "../components/charts/MonthlyFeeChart";
import PaymentMethodChart from "../components/charts/PaymentMethodChart";
import { getDashboardMetrics, getMonthlyData, getPaymentMethodData, getRecentTransactionsData } from "../data/dashboardData";

// Lakhs from ₹1,00,000 up; smaller amounts in full so they do not read as ₹0.01L
const formatAmount = (value) => {
  const amount = Number(value) || 0;
  return Math.abs(amount) >= 100000
    ? `₹${(amount / 100000).toFixed(2)}L`
    : `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalRefund: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Fetch all dashboard data from database on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Each section loads on its own, so one failure does not blank the rest
        const [metricsRes, monthlyRes, paymentRes, recentRes] = await Promise.allSettled([
          getDashboardMetrics(),
          getMonthlyData(),
          getPaymentMethodData(),
          getRecentTransactionsData(10)
        ]);

        if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
        if (monthlyRes.status === 'fulfilled') setMonthlyData(monthlyRes.value);
        if (paymentRes.status === 'fulfilled') setPaymentMethodData(paymentRes.value);
        if (recentRes.status === 'fulfilled') setRecentTransactions(recentRes.value.slice(0, 5));

        const failed = [metricsRes, monthlyRes, paymentRes, recentRes].filter((r) => r.status === 'rejected');
        setLoadError(failed.length ? (failed[0].reason?.message || 'Some dashboard data could not be loaded.') : '');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleView = (transaction) => {
    const status =
      (transaction.paymentStatus || '').toLowerCase();

    const invoiceId =
      transaction.invoiceId || transaction.id;

    if (
      status === 'paid' ||
      status === 'completed'
    ) {
      navigate(`/receipt/${invoiceId}`);
    } else {
      navigate(`/payment/${invoiceId}`);
    }
  };

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees & Payments Dashboard</h1>
          <p className="page-sub">Fee management overview, collection trends, and pending action items</p>
        </div>

       
      </div>

      {loadError && (
        <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {loadError}
        </div>
      )}

      {/* CARDS */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-row">
            <div
              className="stat-icon"
              style={{
                background: 'var(--blue-bg)',
                color: 'var(--blue)'
              }}
            >
              💰
            </div>

            <div>
              <div className="stat-label">
                Total Fees Collected
              </div>

              <div className="stat-value">
                {formatAmount(metrics.totalCollected)}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-row">
            <div
              className="stat-icon"
              style={{
                background: 'var(--yellow-bg)',
                color: 'var(--yellow)'
              }}
            >
              ⏳
            </div>

            <div>
              <div className="stat-label">
                Pending Payments
              </div>

              <div className="stat-value">
                {formatAmount(metrics.totalPending)}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-row">
            <div
              className="stat-icon"
              style={{
                background: 'var(--red-bg)',
                color: 'var(--red)'
              }}
            >
              ⚠️
            </div>

            <div>
              <div className="stat-label">
                Overdue Payments
              </div>

              <div className="stat-value">
                {formatAmount(metrics.totalOverdue)}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-row">
            <div
              className="stat-icon"
              style={{
                background: 'var(--green-bg)',
                color: 'var(--green)'
              }}
            >
              🔄
            </div>

            <div>
              <div className="stat-label">
                Refund Requests
              </div>

              <div className="stat-value">
                {metrics.totalRefund === null ? 'Not set up' : formatAmount(metrics.totalRefund)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ GRAPHS SECTION (ADDED BACK) */}
      <div className="grid-2">
        <MonthlyFeeChart data={monthlyData} />
        <PaymentMethodChart data={paymentMethodData} />
      </div>

      {/* TRANSACTIONS */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Transactions</h3>
          <button onClick={() => navigate("/fees")} className="btn btn-ghost">
            View All
          </button>
        </div>

        <div className="card-body">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Invoice</th>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                      Loading transactions...
                    </td>
                  </tr>
                ) : recentTransactions.length > 0 ? (
                  recentTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.studentName}</td>
                      <td className="td-mono">{item.invoiceNumber}</td>
                      <td>{item.class || item.className || ''}</td>
                      <td className="td-bold">₹{item.amount?.toLocaleString() || 0}</td>
                      <td>{item.paymentMethod}</td>

                      <td>
                        <span className={`badge ${['paid', 'completed'].includes((item.paymentStatus || '').toLowerCase()) ? 'badge-green' : 'badge-yellow'}`}>
                          {item.paymentStatus}
                        </span>
                      </td>

                      <td>{item.date}</td>

                      <td>
                        <button
                          onClick={() => handleView(item)}
                          className="btn btn-primary btn-sm"
                        >
                          {['paid', 'completed'].includes((item.paymentStatus || '').toLowerCase()) ? "View Receipt" : "Make Payment"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
