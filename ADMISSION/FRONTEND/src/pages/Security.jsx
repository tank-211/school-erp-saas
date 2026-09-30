import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Shield, Users, FileText, LogIn } from "lucide-react";
import { getAuthHeader } from "../utils/authToken";
import "../style.css";

const PAGE_SIZE = 25;

const formatTime = (value) => (value ? new Date(value).toLocaleString() : "");

export function Security() {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    axios
      .get("/api/security/overview", { headers: getAuthHeader() })
      .then((res) => setOverview(res.data?.data || null))
      .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load security overview"));
  }, []);

  const loadLogs = useCallback(async (p) => {
    try {
      setLoadingLogs(true);
      const res = await axios.get("/api/security/audit-logs", {
        headers: getAuthHeader(),
        params: { page: p, limit: PAGE_SIZE },
      });
      setLogs(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load the audit log");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(page);
  }, [page, loadLogs]);

  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const cards = [
    { label: "Staff Accounts", value: overview?.total_users, icon: Users, color: "var(--blue-bg)", ic: "var(--blue)" },
    { label: "Active Accounts", value: overview?.active_users, icon: Shield, color: "var(--green-bg)", ic: "var(--green)" },
    { label: "Audit Entries", value: overview?.audit_total, icon: FileText, color: "var(--purple-bg)", ic: "var(--purple)" },
    { label: "Sign-ins (7 days)", value: overview?.logins_last_7_days, icon: LogIn, color: "var(--orange-bg)", ic: "var(--orange)" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Security & Compliance</h1><p className="page-sub">Staff accounts and who did what</p></div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b" }}>{error}</div>
      )}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {cards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={i}>
              <div className="stat-wide">
                <div className="stat-icon" style={{ background: s.color }}><Icon size={20} style={{ color: s.ic }} /></div>
                <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value ?? "—"}</div></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Staff by Role</div>
            <div className="card-sub">Accounts are added in Admin Dashboard → Users</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Role</th><th>Accounts</th><th>Active</th></tr></thead>
            <tbody>
              {(overview?.roles || []).map((r) => (
                <tr key={r.role}>
                  <td className="td-bold">{r.label}</td>
                  <td><span className="badge badge-gray">{r.users}</span></td>
                  <td><span className="badge badge-green">{r.active}</span></td>
                </tr>
              ))}
              {overview && !overview.roles.length && (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--gray-500)" }}>No staff accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Audit Log</div>
            <div className="card-sub">Sign-ins, user changes, application decisions, admissions and school setup changes</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Action</th><th>Details</th><th>Time</th><th>IP Address</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="td-bold">{l.user}</td>
                  <td><span className="badge badge-blue">{l.action}</span></td>
                  <td style={{ fontSize: 13, color: "var(--gray-600)" }}>{l.summary || `${l.entity} ${l.entity_id}`}</td>
                  <td style={{ fontSize: 13, color: "var(--gray-500)" }}>{formatTime(l.created_at)}</td>
                  <td className="td-mono">{l.ip_address || "—"}</td>
                </tr>
              ))}
              {!loadingLogs && logs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray-500)" }}>Nothing recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--gray-500)" }}>Page {page} of {pages} · {total} entries</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
