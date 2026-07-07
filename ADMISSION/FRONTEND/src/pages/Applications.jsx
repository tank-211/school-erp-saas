// ── Applications.jsx ────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Download } from "lucide-react";
import {
  getApplications,
  searchApplications,
  getApplicationCounts,
  getDraftApplications,
  resumeDraftApplication,
  deleteApplication,
} from "../services/applicationService";
import { ApplicationsTable } from "../components/ApplicationsTable";
import { CommunicationModal } from "../components/CommunicationModal";
import "../style.css";

const statusMap = {
  submitted: { label: "Submitted", cls: "badge-blue" },
  under_review: { label: "Under Review", cls: "badge-yellow" },
  approved: { label: "Approved", cls: "badge-green" },
  rejected: { label: "Rejected", cls: "badge-red" },
  waitlisted: { label: "Waitlisted", cls: "badge-purple" },
  in_progress: { label: "Draft", cls: "badge-gray" },
  draft: { label: "Draft", cls: "badge-gray" },
};

export function Applications() {
  const navigate = useNavigate();

  // State management
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    waitlisted: 0,
    draft: 0,
  });
  const [applications, setApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [draftApplications, setDraftApplications] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState([]);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showDrop, setShowDrop] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const selectedApplications = filteredApps.filter((app) =>
    selectedApplicationIds.map(String).includes(String(app.id)),
  );

  // Fetch stats and admissions on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, draftsData, admissionsData] = await Promise.all([
          getApplicationCounts(),
          getDraftApplications(),
          getApplications({ limit: 100, offset: 0 }),
        ]);

        setStats(statsData);
        setDraftApplications(draftsData);

        const appsList = Array.isArray(admissionsData) ? admissionsData : [];

        setApplications(appsList);
        setFilteredApps(appsList);
      } catch (err) {
        setError(err.message || "Failed to load data");
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle search
  const handleSearch = async (value) => {
    setSearch(value);
    setSearchError(null);

    if (!value.trim()) {
      // Reset to unfiltered list
      applyFilter(applications, filter);
      return;
    }

    try {
      const searchResults = await searchApplications(value);
      applyFilter(searchResults, filter);
    } catch (err) {
      setSearchError(err.message);
      console.error("Search error:", err);
    }
  };

  // Apply status filter
  const handleStatusFilter = (status) => {
    setFilter(status);
    applyFilter(applications, status);
    setShowDrop(false);
  };

  // Helper to apply both search and status filter
  const applyFilter = (appList, statusFilter) => {
    let filtered = appList;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    setFilteredApps(filtered);
  };

  // Handle view application
  const handleViewApplication = (appId) => {
    navigate(`/application/${appId}`);
  };

  const handleResumeDraft = async (appId) => {
    try {
      await resumeDraftApplication(appId);
      navigate(`/application/${appId}`);
    } catch (err) {
      setError(err.message || "Unable to resume draft application");
    }
  };

  const handleDeleteDraft = async (appId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this draft application? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete application");
      }

      // Refresh draft applications list
      const updatedDrafts = await getDraftApplications();
      setDraftApplications(updatedDrafts);

      // Refresh counts
      const updatedCounts = await getApplicationCounts();
      setStats(updatedCounts);

      console.log("✅ Draft application deleted successfully");
    } catch (err) {
      setError(err.message || "Unable to delete draft application");
      console.error("Error deleting draft:", err);
    }
  };

  const handleBulkEmail = () => {
    if (!selectedApplications.length) {
      return;
    }

    setBulkEmailOpen(true);
  };

  // Format submitted date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-sub">Track and manage admission applications</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/applications/create")}
        >
          <Plus size={15} /> New Application
        </button>
      </div>

      {/* Stats Cards */}
      <div
        className="mb-5"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {[
          ["Total", stats.total, "var(--gray-900)"],
          ["Submitted", stats.submitted, "var(--blue)"],
          ["Under Review", stats.under_review, "var(--yellow)"],
          ["Approved", stats.approved, "var(--green)"],
          ["Waitlisted", stats.waitlisted, "var(--purple)"],
          ["Draft Applications", stats.draft, "var(--orange)"],
        ].map(([l, v, c], i) => (
          <button
            className="stat-card"
            key={i}
            onClick={() => {
              if (l === "Draft Applications") {
                setShowDrafts((prev) => !prev);
              }
            }}
            style={{
              textAlign: "left",
              cursor: l === "Draft Applications" ? "pointer" : "default",
            }}
          >
            <div className="stat-label">{l}</div>
            <div className="stat-value" style={{ color: c }}>
              {v}
            </div>
          </button>
        ))}
      </div>

      {showDrafts && (
        <div className="card mb-5">
          <div className="card-header">
            <div className="card-title">Draft Applications</div>
          </div>
          {draftApplications.length === 0 ? (
            <div style={{ padding: 24, color: "var(--gray-500)" }}>
              No draft applications found.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Student Name</th>
                    <th>Current Step</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {draftApplications.map((draft) => (
                    <tr key={draft.id}>
                      <td className="td-bold">{draft.id}</td>
                      <td>{draft.student_name || "—"}</td>
                      <td>{draft.current_step || 1}</td>
                      <td>{formatDate(draft.updated_at)}</td>
                      <td>
                        <span className="badge badge-gray">Draft</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleResumeDraft(draft.id)}
                          style={{ marginRight: 8 }}
                        >
                          Resume
                        </button>
                        {["draft", "in_progress"].includes(draft.status) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteDraft(draft.id)}
                            style={{
                              backgroundColor: "#dc2626",
                              borderColor: "#dc2626",
                              color: "white",
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "var(--r)",
            color: "#dc2626",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-5">
        <div className="card-body" style={{ paddingTop: 14 }}>
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
                placeholder="Search by student name or ID..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* Status Filter Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowDrop(!showDrop)}
              >
                ▽ &nbsp;
                {filter === "all"
                  ? "All Statuses"
                  : statusMap[filter]?.label}{" "}
                &nbsp;✓
              </button>
              {showDrop && (
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
                    ["submitted", "Submitted"],
                    ["under_review", "Under Review"],
                    ["approved", "Approved"],
                    ["rejected", "Rejected"],
                    ["waitlisted", "Waitlisted"],
                  ].map(([v, l]) => (
                    <div
                      key={v}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: filter === v ? "var(--gray-50)" : "",
                        fontWeight: filter === v ? 600 : 400,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                      onClick={() => handleStatusFilter(v)}
                    >
                      {l}
                      {filter === v && (
                        <span style={{ color: "var(--purple)" }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-outline">
              <Download size={14} /> Export
            </button>
          </div>

          {searchError && (
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--red)" }}>
              Search error: {searchError}
            </div>
          )}
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--gray-500)",
          }}
        >
          <p>Loading applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--gray-500)",
          }}
        >
          <p>No applications found</p>
        </div>
      ) : (
        <ApplicationsTable
          applications={filteredApps}
          statusMap={statusMap}
          onView={handleViewApplication}
          selectedApplicationIds={selectedApplicationIds}
          onSelectionChange={setSelectedApplicationIds}
          onBulkEmail={handleBulkEmail}
        />
      )}

      <CommunicationModal
        open={bulkEmailOpen}
        onClose={() => setBulkEmailOpen(false)}
        selectedApplications={selectedApplications}
        title="Bulk Email Selected Applications"
        subtitle="Choose the audience, confirm the email preview, and send each message with live progress."
      />
    </div>
  );
}
