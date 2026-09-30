import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Award, Users, CheckCircle, Clock } from "lucide-react";
import { getAuthHeader } from "../utils/authToken";
import "../style.css";

export function OffersSeats() {
  const navigate = useNavigate();
  const [seats, setSeats] = useState(null);
  const [approved, setApproved] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = getAuthHeader();
    Promise.all([
      axios.get("/api/setup/seat-capacity", { headers }),
      axios.get("/api/applications", { headers, params: { status: "approved", limit: 100 } }),
    ])
      .then(([seatRes, appRes]) => {
        setSeats(seatRes.data?.data || null);
        setApproved(appRes.data?.data || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load offers and seats"))
      .finally(() => setLoading(false));
  }, []);

  const totals = seats?.totals;
  const cards = [
    { label: "Approved, awaiting admission", value: approved.length, icon: Award, color: "var(--blue-bg)", ic: "var(--blue)" },
    { label: "Total Seats", value: totals?.capacity, icon: Users, color: "var(--purple-bg)", ic: "var(--purple)" },
    { label: "Filled", value: totals?.filled, icon: CheckCircle, color: "var(--green-bg)", ic: "var(--green)" },
    { label: "Available", value: totals?.available, icon: Clock, color: "var(--orange-bg)", ic: "var(--orange)" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Offers & Seat Allocation</h1>
          <p className="page-sub">
            Approved applications and class capacity
            {seats?.academic_year ? ` for ${seats.academic_year.year_name}` : ""}
          </p>
        </div>
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
            <div className="card-title">Approved Applications</div>
            <div className="card-sub">Ready to start admission</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Application</th><th>Student</th><th>Class</th><th>Approved</th><th></th></tr></thead>
            <tbody>
              {approved.map((a) => (
                <tr key={a.id}>
                  <td className="td-mono">{a.application_number}</td>
                  <td className="td-bold">{a.student_name || "—"}</td>
                  <td>{a.grade || "—"}</td>
                  <td>{a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "—"}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/applications/${a.id}/details`)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && approved.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--gray-500)" }}>No approved applications waiting.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Seat Capacity</div>
            <div className="card-sub">Section capacities from School Setup; filled = completed admissions</div>
          </div>
        </div>
        <div className="card-body">
          {!loading && !seats?.academic_year && (
            <div style={{ color: "var(--gray-500)", fontSize: 13 }}>
              No active academic year. An admin can set one in School Setup.
            </div>
          )}
          {!loading && seats?.classes?.length === 0 && (
            <div style={{ color: "var(--gray-500)", fontSize: 13 }}>No classes yet. An admin can add them in School Setup.</div>
          )}
          {(seats?.classes || []).map((c) => {
            const pct = c.capacity ? Math.min((c.filled / c.capacity) * 100, 100) : 0;
            return (
              <div className="seat-row" key={c.id}>
                <div className="seat-row-top">
                  <span className="seat-grade">{c.class_name}</span>
                  <span className="seat-count">
                    {c.capacity ? `${c.filled}/${c.capacity} filled` : `${c.filled} filled · no section capacity set`}
                  </span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                <div className="seat-available">
                  {c.capacity ? `${c.available} seats available` : ""}
                  {c.in_progress ? ` · ${c.in_progress} admission(s) in progress` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
