import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { User, Clock, AlertCircle, FileText } from "lucide-react";
import { getAuthHeader } from "../utils/authToken";
import "../style.css";

// A lead is flagged when nothing has happened on it for this many days
const INACTIVE_AFTER_DAYS = 7;

export function Pipeline() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drag, setDrag] = useState(null); // { leadId, from }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/pipeline", { headers: getAuthHeader() });
      setData(res.data?.data || null);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load the pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDrop = async (target) => {
    const move = drag;
    setDrag(null);
    if (!move || move.from === target.id) return;
    if (!target.movable) {
      setNotice(`Leads can't be dropped on "${target.title}": that stage follows the lead's application.`);
      return;
    }
    try {
      setNotice("");
      await axios.patch(
        `/api/pipeline/leads/${move.leadId}/stage`,
        { stage: target.id },
        { headers: getAuthHeader() },
      );
      await load();
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || "Could not move the lead");
    }
  };

  const columns = data?.columns || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admission Pipeline</h1>
          <p className="page-sub">
            Every lead, placed by how far it has got: status, campus visit, application and admission
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b" }}>
          {error} <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={load}>Retry</button>
        </div>
      )}
      {notice && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, color: "#92400e" }}>
          {notice}
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Total Leads</div><div className="stat-value">{data?.total_leads ?? "—"}</div></div>
        <div className="stat-card">
          <div className="stat-label">Enrolled (of all leads)</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{data ? `${data.conversion_rate}%` : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Days Open</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>{data?.avg_days_open ?? "—"}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading && !data ? (
            <div className="loading">Loading pipeline...</div>
          ) : (
            <div className="kanban-wrap">
              <div className="kanban-board">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="kanban-col"
                    style={{ background: col.color }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(col)}
                  >
                    <div className="kanban-col-header">
                      <span className="kanban-col-title">{col.title}</span>
                      <span className="kanban-col-count">{col.count}</span>
                    </div>
                    {col.reached_pct !== null && col.count > 0 && (
                      <div className="kanban-col-conv" title="Share of all leads that reached this stage or later">
                        Reached: {col.reached_pct}%
                      </div>
                    )}
                    <div className="kanban-drop-area">
                      {col.leads.map((lead) => (
                        <div
                          key={lead.id}
                          className="lead-card"
                          draggable={col.movable}
                          onDragStart={() => setDrag({ leadId: lead.id, from: col.id })}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          style={{ opacity: drag?.leadId === lead.id ? 0.5 : 1, cursor: "pointer" }}
                        >
                          <div className="lead-card-top">
                            <div>
                              <div className="lead-card-name">{lead.name}</div>
                              {lead.grade && <div className="lead-card-grade">{lead.grade}</div>}
                            </div>
                          </div>
                          {lead.inactive_days >= INACTIVE_AFTER_DAYS && !["enrolled", "rejected"].includes(col.id) && (
                            <div className="mb-2">
                              <span className="badge badge-red" style={{ fontSize: 11 }}>
                                <AlertCircle size={11} /> Inactive {lead.inactive_days}d
                              </span>
                            </div>
                          )}
                          <div className="lead-card-meta"><User size={11} />{lead.counselor}</div>
                          {lead.last_activity && <div className="lead-card-meta"><Clock size={11} />{lead.last_activity}</div>}
                          {lead.application_number && (
                            <div className="lead-card-meta"><FileText size={11} />{lead.application_number}</div>
                          )}
                        </div>
                      ))}
                      {col.count > col.leads.length && (
                        <div className="kanban-empty">+{col.count - col.leads.length} more (most recent shown)</div>
                      )}
                      {col.count === 0 && (
                        <div className="kanban-empty">{col.movable ? "Drop leads here" : "No leads"}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
