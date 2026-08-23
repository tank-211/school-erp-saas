const fs = require('fs');

let content = fs.readFileSync('Frontend_AA/src/pages/Counseling.jsx', 'utf8');

// 1. Imports
content = content.replace(
  /import {\s+Plus,\s+Calendar,\s+Clock,\s+CheckSquare,\s+AlertCircle,\s+Loader,\s+} from "lucide-react";/g,
  `import {\n  Plus,\n  Calendar,\n  Clock,\n  CheckSquare,\n  AlertCircle,\n  Loader,\n  CheckCircle,\n  Edit,\n  Trash2,\n} from "lucide-react";`
);

// 2. State
content = content.replace(
  `  const [visits, setVisits] = useState([]);`,
  `  const [upcomingVisits, setUpcomingVisits] = useState([]);\n  const [missedVisits, setMissedVisits] = useState([]);\n  const [editingVisit, setEditingVisit] = useState(null);`
);

// 3. Data Fetching
const fetchStr = `        // Fetch stats and today's visits in parallel
        const [statsResponse, visitsResponse, leadsResponse] = await Promise.all([
          CounselingService.getDashboardStats(),
          CounselingService.getVisits(true), // filterToday = true
          CounselingService.getAssignedLeads(),
        ]);`;

const fetchReplaceStr = `        // Fetch stats and visits in parallel
        const [statsResponse, upcomingResponse, missedResponse, leadsResponse] = await Promise.all([
          CounselingService.getDashboardStats(),
          CounselingService.getFutureVisits(),
          CounselingService.getMissedVisits(),
          CounselingService.getAssignedLeads(),
        ]);`;

content = content.replace(fetchStr, fetchReplaceStr);

const handleVisitsStr = `        // Handle visits response
        if (visitsResponse.success) {
          const formattedVisits = (visitsResponse.data || []).map((visit) => ({
            id: visit.id,
            student:
              visit.student_name ||
              visit.visitor_name ||
              \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
            grade: visit.grade || "N/A",
            date: formatDate(visit.visit_date),
            time: formatTime(visit.start_time || visit.visit_time || ""),
            leadId: visit.lead_id,
            status: visit.status,
          }));
          setVisits(formattedVisits);
        } else {
          throw new Error(visitsResponse.message || "Failed to fetch visits");
        }`;

const handleVisitsReplaceStr = `        // Handle upcoming visits response
        if (upcomingResponse.success) {
          const formattedVisits = (upcomingResponse.data || []).map((visit) => ({
            id: visit.id,
            student:
              visit.student_name ||
              visit.visitor_name ||
              \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
            visitor: visit.visitor_name || "Unknown",
            grade: visit.grade || "N/A",
            date: formatDate(visit.visit_date),
            time: formatTime(visit.start_time || visit.visit_time || ""),
            leadId: visit.lead_id,
            status: visit.status,
          }));
          setUpcomingVisits(formattedVisits);
        } else {
          throw new Error(upcomingResponse.message || "Failed to fetch upcoming visits");
        }

        // Handle missed visits response
        if (missedResponse.success) {
          const formattedVisits = (missedResponse.data || []).map((visit) => ({
            id: visit.id,
            student:
              visit.student_name ||
              visit.visitor_name ||
              \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
            visitor: visit.visitor_name || "Unknown",
            grade: visit.grade || "N/A",
            date: formatDate(visit.visit_date),
            time: formatTime(visit.start_time || visit.visit_time || ""),
            leadId: visit.lead_id,
            status: visit.status,
          }));
          setMissedVisits(formattedVisits);
        } else {
          throw new Error(missedResponse.message || "Failed to fetch missed visits");
        }`;

content = content.replace(handleVisitsStr, handleVisitsReplaceStr);

// 4. Handlers
const handlersStr = `  // ── Debounced Search Function ──────────────────────────────`;
const newHandlers = `  // ── Action Handlers ────────────────────────────────────────
  const handleMarkVisited = async (visitId) => {
    try {
      await CounselingService.updateVisitStatus(visitId, "visited");
      setUpcomingVisits((prev) => prev.filter((v) => v.id !== visitId));
      setMissedVisits((prev) => prev.filter((v) => v.id !== visitId));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit?")) {
      try {
        await CounselingService.deleteCampusVisit(visitId);
        setUpcomingVisits((prev) => prev.filter((v) => v.id !== visitId));
        setMissedVisits((prev) => prev.filter((v) => v.id !== visitId));
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

  // ── Debounced Search Function ──────────────────────────────`;

content = content.replace(handlersStr, newHandlers);

// 5. Layout update
const layoutRegex = /{\/\* ── Upcoming Campus Visits ────────────────────────── \*\/(.|\n)*?No visits scheduled for today(.|\n)*?<\/p>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>/;

const newLayout = `{/* ── My Assigned Leads ────────────────────────────── */}
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
                <div className="assigned-lead-card" key={lead.id}>
                  <div className="assigned-lead-top">
                    <div>
                      <div className="assigned-lead-name">{lead.name}</div>
                      <div className="assigned-lead-grade">{lead.grade}</div>
                    </div>
                    <span
                      className={\`badge \${lead.priority === "high" ? "badge-red" : "badge-yellow"}\`}
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

        <div>
          {/* ── Upcoming Campus Visits ────────────────────────── */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header">
              <div className="card-title">Upcoming Campus Visits</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/counseling/schedule-visit")}
                title="Schedule a new campus visit"
              >
                <Plus size={14} /> Schedule Visit
              </button>
            </div>
            <div className="card-body">
              {upcomingVisits.length > 0 ? (
                upcomingVisits.map(renderVisitCard)
              ) : (
                <p
                  style={{
                    color: "var(--gray-400)",
                    textAlign: "center",
                    padding: "30px 0",
                    fontSize: "14px",
                  }}
                >
                  No upcoming visits scheduled
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
              {missedVisits.length > 0 ? (
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
      </div>`;

content = content.replace(layoutRegex, newLayout);

// 6. Modal update
const modalStr = `      {/* ── Action Button ──────────────────────────────────── */}`;
const newModalStr = `      {/* ── Edit Modal Placeholder ──────────────────────────── */}
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

      {/* ── Action Button ──────────────────────────────────── */}`;

content = content.replace(modalStr, newModalStr);

fs.writeFileSync('Frontend_AA/src/pages/Counseling.jsx', content, 'utf8');
console.log("Patched successfully");
