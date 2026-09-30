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
  getAdmissionsWithoutFees,
  assignAdmissionFees,
  getUninvoicedFees,
  generateInvoice,
} from "../services/feeService";
import { useAuth } from "../context/AuthContext.jsx";
import "../style.css";

const noticeStyle = (ok) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  marginBottom: 16,
  borderRadius: 10,
  fontSize: 14,
  background: ok ? "#dcfce7" : "#fee2e2",
  color: ok ? "#166534" : "#991b1b",
  border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`,
});

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
  const { user } = useAuth();
  const isAdminUser = user?.role === "admin";
  // Completed admissions with no fees assigned yet
  const [pending, setPending] = useState(null);
  const [pendingError, setPendingError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);

  useEffect(() => {
    loadData();
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      setPending(await getAdmissionsWithoutFees());
      setPendingError("");
    } catch (err) {
      setPendingError(err.message || "Failed to load admissions without fees");
    }
  };

  const runAssign = async (body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      setAssigning(true);
      setNotice(null);
      const result = await assignAdmissionFees(body);
      setNotice({ ok: result.success !== false, text: result.message });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setAssigning(false);
      loadData();
      loadPending();
    }
  };

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

      {error && (
        <div style={noticeStyle(false)}>{error}</div>
      )}

      {notice && (
        <div style={noticeStyle(notice.ok)}>
          {notice.text}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {pendingError && (
        <div style={noticeStyle(false)}>{pendingError}</div>
      )}

      {pending?.count > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Admissions without fees ({pending.count})</div>
              <div className="card-sub">
                Completed admissions with no fees assigned. Assigning adds the class fees and creates an invoice.
              </div>
            </div>
            {isAdminUser && pending.ready_count > 0 && (
              <button
                className="btn btn-primary btn-sm"
                disabled={assigning}
                onClick={() =>
                  runAssign(
                    { all: true },
                    `Assign fees and create invoices for ${pending.ready_count} admission(s)?`
                  )
                }
              >
                {assigning ? "Assigning..." : `Assign fees to ${pending.ready_count}`}
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Academic year</th>
                  <th>Fee structure</th>
                  {isAdminUser && <th></th>}
                </tr>
              </thead>
              <tbody>
                {pending.items.map((item) => (
                  <tr key={item.admission_id}>
                    <td className="td-bold">
                      {item.student_name || `Admission ${item.admission_id}`}
                      {item.admission_number && (
                        <div className="text-muted text-sm">{item.admission_number}</div>
                      )}
                    </td>
                    <td>{item.class_name || "—"}</td>
                    <td>{item.year_name || "—"}</td>
                    <td>
                      {item.has_fee_structure ? (
                        <span className="badge badge-green">Ready</span>
                      ) : (
                        <span className="badge badge-orange">Not set up</span>
                      )}
                    </td>
                    {isAdminUser && (
                      <td>
                        {item.has_fee_structure && (
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={assigning}
                            onClick={() => runAssign({ admission_id: item.admission_id })}
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pending.count > pending.ready_count && (
            <div className="card-body text-muted text-sm">
              "Not set up" means there is no fee structure for that class and academic year yet. Add it in the Fees app, then assign here.
            </div>
          )}
        </div>
      )}

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
            value: formatCurrency(stats.this_month_amount || 0),
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowGenerate(true)}>
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
                  const studentName = invoice.student_name || "—";
                  return (
                    <tr key={invoice.id}>
                      <td className="td-bold">{invoice.invoice_number}</td>
                      <td>{studentName}</td>
                      <td>{invoice.class_name || "—"}</td>
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
      {showGenerate && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerate(false)}
          onDone={(message) => {
            setShowGenerate(false);
            setNotice({ ok: true, text: message });
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Bills a student's assigned fees that are not on an invoice yet.
function GenerateInvoiceModal({ onClose, onDone }) {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUninvoicedFees()
      .then(setStudents)
      .catch((err) => setError(err.message));
  }, []);

  const student = students?.find((s) => s.student_id === studentId);
  const total = (student?.fees || [])
    .filter((f) => selected.includes(f.fee_structure_id))
    .reduce((sum, f) => sum + Math.round(Number(f.amount) * 100), 0) / 100;

  const pickStudent = (id) => {
    setStudentId(id);
    const next = students.find((s) => s.student_id === id);
    setSelected((next?.fees || []).map((f) => f.fee_structure_id));
  };

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await generateInvoice({
        student_id: Number(studentId),
        fee_structure_ids: selected.map(Number),
      });
      onDone(`Invoice ${result.data?.invoice_number || ""} created for ${student.student_name}.`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
      onClick={onClose}
    >
      <div className="card" style={{ width: "100%", maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="card-title">Generate Invoice</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card-body">
          {error && <div style={noticeStyle(false)}>{error}</div>}
          {!students && !error && <div className="text-muted">Loading...</div>}
          {students && !students.length && (
            <div className="text-muted">
              Every assigned fee is already invoiced. Fees are assigned when an admission is completed, or from "Admissions without fees".
            </div>
          )}
          {students?.length > 0 && (
            <>
              <label className="form-label">Student</label>
              <select className="form-select" value={studentId} onChange={(e) => pickStudent(e.target.value)}>
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_name}{s.admission_number ? ` (${s.admission_number})` : ""}
                  </option>
                ))}
              </select>
              {student && (
                <div style={{ marginTop: 16 }}>
                  {student.fees.map((f) => (
                    <label key={f.fee_structure_id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border, #e5e7eb)", fontSize: 14 }}>
                      <span>
                        <input type="checkbox" checked={selected.includes(f.fee_structure_id)} onChange={() => toggle(f.fee_structure_id)} style={{ marginRight: 8 }} />
                        {f.fee_type}
                      </span>
                      <span>₹{Number(f.amount).toLocaleString("en-IN")}</span>
                    </label>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 600 }}>
                    <span>Total</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 16, width: "100%" }} disabled={!selected.length || saving} onClick={submit}>
                    {saving ? "Creating..." : "Create invoice"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
