import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  Clock,
  CheckSquare,
  AlertCircle,
  Loader,
  CheckCircle,
  Edit,
  Trash2,
} from "lucide-react";
import CounselingService from "../services/CounselingService.js";
import "../style.css";

export function Counseling() {
  const navigate = useNavigate();

  // ── State Management ──────────────────────────────────────
  const [dashboardStats, setDashboardStats] = useState({
    assignedLeads: 0,
    upcomingVisits: 0,
    pendingTasks: 0,
  });

  const [futureVisits, setFutureVisits] = useState([]);
  const [missedVisits, setMissedVisits] = useState([]);
  const [editingVisit, setEditingVisit] = useState(null);
  const [assignedLeads, setAssignedLeads] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For debouncing search (300ms)
  const searchTimeoutRef = useRef(null);

  // ── Utility Functions ──────────────────────────────────────
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // ── Data Fetching ──────────────────────────────────────────
  const refreshVisits = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch stats and visits in parallel using updated fetch aliases
      const [statsResponse, futureResponse, missedResponse, leadsResponse] = await Promise.all([
        CounselingService.getDashboardStats(),
        CounselingService.fetchFutureVisits(),
        CounselingService.fetchMissedVisits(),
        CounselingService.getAssignedLeads(),
      ]);

      if (statsResponse.success) {
        setDashboardStats({
          assignedLeads: statsResponse.data.assignedLeads || 0,
          upcomingVisits: statsResponse.data.upcomingVisits || 0,
          pendingTasks: statsResponse.data.pendingTasks || 0,
        });
      } else {
        throw new Error(statsResponse.message || "Failed to fetch dashboard stats");
      }

      if (futureResponse.success) {
        const formattedVisits = (futureResponse.data || []).map((visit) => ({
          id: visit.id,
          student:
            visit.student_name ||
            visit.visitor_name ||
            `${visit.first_name || ""} ${visit.last_name || ""}`.trim(),
          visitor: visit.visitor_name || "Unknown",
          grade: visit.grade || "N/A",
          date: formatDate(visit.visit_date),
          rawDate: visit.visit_date,
          time: formatTime(visit.start_time || visit.visit_time || ""),
          leadId: visit.lead_id,
          status: visit.status,
        }));
        
        formattedVisits.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        setFutureVisits(formattedVisits);
      } else {
        throw new Error(futureResponse.message || "Failed to fetch future visits");
      }

      if (missedResponse.success) {
        const formattedVisits = (missedResponse.data || []).map((visit) => ({
          id: visit.id,
          student:
            visit.student_name ||
            visit.visitor_name ||
            `${visit.first_name || ""} ${visit.last_name || ""}`.trim(),
          visitor: visit.visitor_name || "Unknown",
          grade: visit.grade || "N/A",
          date: formatDate(visit.visit_date),
          rawDate: visit.visit_date,
          time: formatTime(visit.start_time || visit.visit_time || ""),
          leadId: visit.lead_id,
          status: visit.status,
        }));
        
        formattedVisits.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        setMissedVisits(formattedVisits);
      } else {
        throw new Error(missedResponse.message || "Failed to fetch missed visits");
      }

      if (leadsResponse.success) {
        const formattedLeads = (leadsResponse.data || []).map((lead) => ({
          id: lead.lead_id || lead.id,
          name: lead.student_name || "Unknown",
          grade: lead.desired_class || "N/A",
          priority: lead.follow_up_status === "hot" ? "high" : "medium",
          nextAction: "Follow-up",
          dueDate: lead.created_at
            ? new Date(lead.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "Today",
          phone: lead.phone,
          email: lead.email,
          parentName: lead.parent_name,
          parentPhone: lead.parent_phone,
        }));
        console.log("Assigned Leads:", formattedLeads);
        setAssignedLeads(formattedLeads);
      } else {
        throw new Error(leadsResponse.message || "Failed to fetch assigned leads");
      }

      if (showLoading) setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);

      if (err.code === "UNAUTHORIZED" || err.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_data");
        navigate("/login", { replace: true, state: { from: "/counseling" } });
        return;
      }

      if (err.code === "NO_TOKEN") {
        navigate("/login", { replace: true, state: { from: "/counseling" } });
        return;
      }

      if (err.code === "NETWORK_ERROR") {
        setError("Cannot reach the server. Please check your connection and try again.");
        if (showLoading) setLoading(false);
        return;
      }

      setError(err.message || "Failed to load dashboard data. Please try again.");
      if (showLoading) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    refreshVisits(true);
  }, [refreshVisits]);

  // ── Action Handlers ────────────────────────────────────────
  const handleMarkVisited = async (visitId) => {
    try {
      await CounselingService.updateVisitStatus(visitId, "visited");
      refreshVisits(false);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit?")) {
      try {
        await CounselingService.deleteCampusVisit(visitId);
        refreshVisits(false);
      } catch (err) {
        alert("Failed to delete visit");
      }
    }
  };

  const renderVisitCard = (visit) => (
    <div className="visit-card" key={visit.id}>
      <div className="visit-name">{visit.student}</div>
      <div className="visit-grade" style={{ fontSize: "13px", color: "var(--gray-500)", marginBottom: "4px" }}>
        Visitor: {visit.visitor}
      </div>
      <div className="visit-meta">
        <span>
          <Calendar size={13} /> {visit.date}
        </span>
        <span>
          <Clock size={13} /> {visit.time}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <button
          className="btn btn-sm"
          style={{ background: "#10b981", color: "white", padding: "6px 8px" }}
          onClick={() => handleMarkVisited(visit.id)}
          title="Mark as Visited"
        >
          <CheckCircle size={14} />
        </button>
        <button
          className="btn btn-sm"
          style={{ background: "#3b82f6", color: "white", padding: "6px 8px" }}
          onClick={() => setEditingVisit(visit)}
          title="Reschedule"
        >
          <Edit size={14} />
        </button>
        <button
          className="btn btn-sm"
          style={{ background: "#ef4444", color: "white", padding: "6px 8px" }}
          onClick={() => handleDeleteVisit(visit.id)}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  // ── Debounced Search Function ──────────────────────────────
  const handleSearchLeads = useCallback((query) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, clear results
    if (!query || query.trim() === "") {
      setSearchResults([]);
      return;
    }

    // Set new timeout with 300ms debounce
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await CounselingService.searchLeads(query);

        if (response.success) {
          const formattedLeads = (response.data || []).map((lead) => ({
            id: lead.lead_id,
            name: lead.student_name || "Unknown",
            grade: lead.desired_class || "N/A",
            priority: lead.follow_up_status === "hot" ? "high" : "medium",
            nextAction: "Follow-up",
            dueDate: lead.created_at
              ? new Date(lead.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Today",
            phone: lead.phone,
            email: lead.email,
            parentName: lead.parent_name,
            parentPhone: lead.parent_phone,
          }));
          console.log("Search Results:", formattedLeads);
          setSearchResults(formattedLeads);
        } else {
          console.error("Search failed:", response.message);
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching leads:", error);

        // Handle 401 Unauthorized - redirect to login
        if (error.code === "UNAUTHORIZED" || error.status === 401) {
          console.error(
            "🔐 Authentication failed during search - redirecting to login",
          );
          localStorage.removeItem("token");
          localStorage.removeItem("user_data");
          navigate("/login", { replace: true, state: { from: "/counseling" } });
          return;
        }

        // Handle no token error
        if (error.code === "NO_TOKEN") {
          console.error(
            "🔐 No token found during search - redirecting to login",
          );
          navigate("/login", { replace: true, state: { from: "/counseling" } });
          return;
        }

        // For other errors, just clear results but stay on page
        setSearchResults([]);
      }
    }, 300);
  }, []);

  // Display leads from search results
  const displayLeads = searchQuery.trim() ? searchResults : assignedLeads;

  // ── Render: Loading State ──────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Counselor Workspace</h1>
            <p className="page-sub">Manage your leads and schedule</p>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--gray-400)",
          }}
        >
          <Loader
            size={48}
            style={{
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p style={{ fontSize: "16px", marginBottom: "10px" }}>
            Loading your dashboard...
          </p>
          <p style={{ fontSize: "13px" }}>
            Fetching your stats, visits, and assignments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Counselor Workspace</h1>
          <p className="page-sub">Manage your leads and schedule</p>
        </div>
      </div>

      {/* ── Error Alert ────────────────────────────────────── */}
      {error && (
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgb(239, 68, 68)",
            color: "rgb(220, 38, 38)",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Dashboard Stats Cards ──────────────────────────── */}
      <div className="grid-3 mb-5">
        <div className="stat-card">
          <div className="stat-label">Assigned Leads</div>
          <div className="stat-value">{dashboardStats.assignedLeads}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Tasks</div>
          <div className="stat-value" style={{ color: "var(--orange)" }}>
            {dashboardStats.pendingTasks}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Tours</div>
          <div className="stat-value" style={{ color: "var(--blue)" }}>
            {dashboardStats.upcomingVisits}
          </div>
        </div>
      </div>

      {/* ── Main Grid: Leads + Visits ──────────────────────── */}
      <div className="grid-2 mb-5">
        {/* ── My Assigned Leads ────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">My Assigned Leads</div>
          </div>
          <div className="card-body">
            {/* Search Bar */}
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="Search leads by name or ID..."
                value={searchQuery}
                onChange={(e) => handleSearchLeads(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--blue)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--gray-200)")}
              />
            </div>

            {/* Leads List */}
            {displayLeads.length > 0 ? (
              displayLeads.map((lead) => (
                <div className="assigned-lead-card" key={lead.id || `${lead.name}-${lead.phone}`}>
                  <div className="assigned-lead-top">
                    <div>
                      <div className="assigned-lead-name">{lead.name}</div>
                      <div className="assigned-lead-grade">{lead.grade}</div>
                    </div>
                    <span
                      className={`badge ${lead.priority === "high" ? "badge-red" : "badge-yellow"}`}
                    >
                      {lead.priority}
                    </span>
                  </div>
                  <div className="assigned-lead-action">
                    <CheckSquare size={14} />
                    {lead.nextAction}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        color: "var(--gray-400)",
                      }}
                    >
                      {lead.dueDate}
                    </span>
                  </div>
                  {lead.phone && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--gray-400)",
                        marginTop: "8px",
                      }}
                    >
                      📞 {lead.phone}
                    </div>
                  )}
                </div>
              ))
            ) : searchQuery ? (
              <p
                style={{
                  color: "var(--gray-400)",
                  textAlign: "center",
                  padding: "30px 0",
                  fontSize: "14px",
                }}
              >
                No leads found matching "{searchQuery}"
              </p>
            ) : (
              <p
                style={{
                  color: "var(--gray-400)",
                  textAlign: "center",
                  padding: "30px 0",
                  fontSize: "14px",
                }}
              >
                No assigned leads found yet
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* ── Future Campus Visits ────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Future Campus Visits</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/counseling/schedule-visit")}
                title="Schedule a new campus visit"
              >
                <Plus size={14} /> Schedule Visit
              </button>
            </div>
            <div className="card-body">
              {futureVisits?.length > 0 ? (
                futureVisits.map(renderVisitCard)
              ) : (
                <p
                  style={{
                    color: "var(--gray-400)",
                    textAlign: "center",
                    padding: "30px 0",
                    fontSize: "14px",
                  }}
                >
                  No future visits scheduled
                </p>
              )}
            </div>
          </div>

          {/* ── Pending/Missed Visits ────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pending/Missed Visits</div>
            </div>
            <div className="card-body">
              {missedVisits?.length > 0 ? (
                missedVisits.map(renderVisitCard)
              ) : (
                <p
                  style={{
                    color: "var(--gray-400)",
                    textAlign: "center",
                    padding: "30px 0",
                    fontSize: "14px",
                  }}
                >
                  No pending or missed visits
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal Placeholder ──────────────────────────── */}
      {editingVisit && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "24px",
            borderRadius: "8px",
            width: "400px",
            maxWidth: "90%"
          }}>
            <h3 style={{ marginTop: 0 }}>Reschedule Visit</h3>
            <p>Reschedule modal for {editingVisit.student}. Integration to edit page goes here.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button 
                className="btn btn-primary"
                onClick={() => setEditingVisit(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Button ──────────────────────────────────── */}
      <button
        className="btn btn-blue"
        onClick={() => navigate("/leads/add")}
        title="Add a new lead to your portfolio"
      >
        <Plus size={15} /> Add New Lead
      </button>
    </div>
  );
}
