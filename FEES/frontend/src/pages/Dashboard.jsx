import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
 

/* 👇 IMPORT YOUR OLD GRAPH COMPONENTS */
import MonthlyFeeChart from "../components/charts/MonthlyFeeChart";
import PaymentMethodChart from "../components/charts/PaymentMethodChart";
import { getDashboardMetrics, getMonthlyData, getPaymentMethodData, getRecentTransactionsData } from "../data/dashboardData";

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

  // Fetch all dashboard data from database on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [metricsData, monthlyChartData, paymentData, recentTransactionsData] = await Promise.all([
          getDashboardMetrics(),
          getMonthlyData(),
          getPaymentMethodData(),
          getRecentTransactionsData(10)
        ]);

        setMetrics(metricsData);
        setMonthlyData(monthlyChartData);
        setPaymentMethodData(paymentData);
        setRecentTransactions(recentTransactionsData.slice(0,5));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Keep showing UI with empty data rather than breaking
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
                ₹{(Number(metrics.totalCollected) / 100000).toFixed(2)}L
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
                ₹{(Number(metrics.totalPending) / 100000).toFixed(2)}L
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
                ₹{(Number(metrics.totalOverdue) / 100000).toFixed(2)}L
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
                ₹{(Number(metrics.totalRefund) / 100000).toFixed(2)}L
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
