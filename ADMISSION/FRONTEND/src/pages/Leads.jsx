import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  MoreVertical,
  Phone,
  Mail,
  Loader,
} from "lucide-react";
import "../style.css";
import { getAllLeads } from "../services/leadService.js";
import { getToken } from "../utils/authToken.js";

const statusConfig = {
  pending: { label: "Pending", cls: "badge-gray" },
  contacted: { label: "Contacted", cls: "badge-purple" },
  interested: { label: "Interested", cls: "badge-blue" },
  not_interested: { label: "Not Interested", cls: "badge-red" },
  converted: { label: "Converted", cls: "badge-green" },
  lost: { label: "Lost", cls: "badge-orange" },
};

export function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [grade, setGrade] = useState("all");
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    setError("");

    // Check authentication
    if (!getToken()) {
      setError("Not authenticated. Please login first.");
      setLoading(false);
      return;
    }

    // Build filters for API
    const filters = {
      follow_up_status: status !== "all" ? status : undefined,
      desired_class: grade !== "all" ? grade : undefined,
    };

    const result = await getAllLeads(filters);

    if (result.success) {
      setLeads(result.data || []);
    } else {
      setError(result.message || "Failed to fetch leads");
      setLeads([]);
    }
    setLoading(false);
  };

  // Refetch when filters change
  useEffect(() => {
    fetchLeads();
  }, [status, grade]);

  // Client-side search filter
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const name = `${l.first_name || ""} ${l.last_name || ""}`.toLowerCase();
    const matchSearch =
      name.includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q);
    return matchSearch;
  });

  const stats = {
    total: leads.length,
    newLeads: leads.filter((l) => l.follow_up_status === "pending").length,
    contacted: leads.filter((l) => l.follow_up_status === "contacted").length,
    interested: leads.filter((l) => l.follow_up_status === "interested").length,
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Management</h1>
          <p className="page-sub">Manage and track all admission inquiries</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/leads/add")}
        >
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-5">
        {[
          {
            label: "Total Leads",
            value: stats.total,
            color: "var(--gray-900)",
          },
          { label: "Pending", value: stats.newLeads, color: "var(--primary)" },
          { label: "Contacted", value: stats.contacted, color: "var(--blue)" },
          {
            label: "Interested",
            value: stats.interested,
            color: "var(--green)",
          },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "var(--r)",
            padding: "12px 16px",
            marginBottom: 20,
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-5">
        <div className="card-body" style={{ paddingTop: 16 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--gray-800)",
              marginBottom: 12,
            }}
          >
            Filters
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="input-wrap flex-1" style={{ minWidth: 200 }}>
              <Search className="input-icon" size={15} />
              <input
                className="form-input"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Status dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowStatusDrop(!showStatusDrop)}
              >
                ▽ &nbsp;
                {status === "all"
                  ? "All Statuses"
                  : statusConfig[status]?.label}{" "}
                &nbsp;✓
              </button>
              {showStatusDrop && (
                <div
                  style={{
                    position: "absolute",
                    top: "110%",
                    left: 0,
                    background: "#fff",
                    border: "1px solid var(--gray-200)",
                    borderRadius: "var(--r)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: 180,
                  }}
                >
                  {[
                    ["all", "All Statuses"],
                    ["pending", "Pending"],
                    ["contacted", "Contacted"],
                    ["interested", "Interested"],
                    ["converted", "Converted"],
                    ["not_interested", "Not Interested"],
                    ["lost", "Lost"],
                  ].map(([v, l]) => (
                    <div
                      key={v}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: status === v ? "var(--gray-50)" : "",
                        fontWeight: status === v ? 600 : 400,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                      onClick={() => {
                        setStatus(v);
                        setShowStatusDrop(false);
                      }}
                    >
                      {l}{" "}
                      {status === v && (
                        <span style={{ color: "var(--primary)" }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <select
              className="form-select"
              style={{ width: 140 }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="all">All Grades</option>
              {[
                "Grade 1",
                "Grade 2",
                "Grade 3",
                "Grade 4",
                "Grade 5",
                "Grade 6",
                "Grade 7",
                "Grade 8",
              ].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
            color: "var(--gray-500)",
          }}
        >
          <Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ marginLeft: 12 }}>Loading leads...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--gray-500)",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 12 }}>No leads found</p>
          <p style={{ fontSize: 13 }}>
            {search
              ? "Try a different search"
              : "Add a new lead to get started"}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" />
                  </th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <input type="checkbox" />
                    </td>
                    <td className="td-bold">
                      {`${l.first_name || ""} ${l.last_name || ""}`.trim()}
                    </td>
                    <td>{l.desired_class || "-"}</td>
                    <td style={{ fontSize: 13 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Phone size={12} style={{ color: "var(--gray-400)" }} />
                        {l.phone || "-"}
                      </div>
                      {l.email && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <Mail
                            size={12}
                            style={{ color: "var(--gray-400)" }}
                          />
                          {l.email}
                        </div>
                      )}
                    </td>
                    <td>{l.source || "-"}</td>
                    <td>
                      <span
                        className={`badge ${statusConfig[l.follow_up_status]?.cls || "badge-gray"}`}
                      >
                        {statusConfig[l.follow_up_status]?.label ||
                          l.follow_up_status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--gray-500)" }}>
                      {l.created_at
                        ? new Date(l.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-icon" title="View">
                          <Eye size={15} />
                        </button>
                        <button className="btn btn-ghost btn-icon" title="More">
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
