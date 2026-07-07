// ── FeesPayments.jsx ────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
  Plus,
} from "lucide-react";
import {
  getFeeDashboardStats,
  getFeeTransactions,
} from "../services/feeService";
import "../style.css";

export function FeesPayments() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, transactionsData] = await Promise.all([
        getFeeDashboardStats(),
        getFeeTransactions(),
      ]);
      setStats(statsData);
      setTransactions(transactionsData);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load fee data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount / 100000).toFixed(1)}L`; // Convert to lakhs
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      paid: "badge-green",
      partial: "badge-yellow",
      unpaid: "badge-orange",
      overdue: "badge-red",
      cancelled: "badge-gray",
    };
    return statusMap[status] || "badge-gray";
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/fees/invoice/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading fee data...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees & Payments</h1>
          <p className="page-sub">Track admission fees and payment status</p>
        </div>
      </div>

      <div className="grid-4 mb-5">
        {[
          {
            label: "Total Amount",
            value: formatCurrency(stats.total_amount),
            icon: DollarSign,
            color: "var(--blue-bg)",
            ic: "var(--blue)",
          },
          {
            label: "Collected",
            value: formatCurrency(stats.paid_amount),
            icon: TrendingUp,
            color: "var(--green-bg)",
            ic: "var(--green)",
          },
          {
            label: "Pending",
            value: formatCurrency(stats.pending_amount),
            icon: AlertCircle,
            color: "var(--orange-bg)",
            ic: "var(--orange)",
          },
          {
            label: "This Month",
            value: "₹0.0L",
            icon: CheckCircle,
            color: "var(--purple-bg)",
            ic: "var(--purple)",
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={i}>
              <div className="stat-wide">
                <div className="stat-icon" style={{ background: s.color }}>
                  <Icon size={20} style={{ color: s.ic }} />
                </div>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Payment Transactions</div>
          <button className="btn btn-primary btn-sm">
            <Plus size={14} /> Generate Invoice
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Total Amount</th>
                <th>Paid Amount</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    No invoices found
                  </td>
                </tr>
              ) : (
                transactions.map((invoice) => {
                  const studentName =
                    `${invoice.first_name} ${invoice.middle_name || ""} ${invoice.last_name}`.trim();
                  return (
                    <tr key={invoice.id}>
                      <td className="td-bold">{invoice.invoice_number}</td>
                      <td>{studentName}</td>
                      <td>
                        {invoice.class_name} (Grade {invoice.grade})
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        ₹{invoice.total_amount.toLocaleString()}
                      </td>
                      <td style={{ color: "var(--green)" }}>
                        ₹{invoice.paid_amount.toLocaleString()}
                      </td>
                      <td
                        style={{
                          color:
                            invoice.pending_amount > 0
                              ? "var(--orange)"
                              : "var(--green)",
                        }}
                      >
                        ₹{invoice.pending_amount.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${getStatusBadge(invoice.status)}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleViewInvoice(invoice.id)}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
