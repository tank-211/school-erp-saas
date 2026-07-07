/**
 * ApplicationsTable Component
 * Displays list of applications in a table format
 * Props: applications, loading, onView, statusMap
 */
import { useEffect, useMemo, useRef } from "react";
import { Eye, Mail } from "lucide-react";

export function ApplicationsTable({
  applications = [],
  loading = false,
  onView,
  statusMap = {},
  selectedApplicationIds = [],
  onSelectionChange,
  onBulkEmail,
}) {
  const selectAllRef = useRef(null);
  const selectedIdSet = useMemo(
    () => new Set(selectedApplicationIds.map((id) => String(id))),
    [selectedApplicationIds],
  );

  const visibleIds = useMemo(
    () => applications.map((app) => app.id || app.application_id).filter(Boolean),
    [applications],
  );

  const visibleSelectedCount = visibleIds.filter((id) =>
    selectedIdSet.has(String(id)),
  ).length;

  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const updateSelection = (nextIds) => {
    onSelectionChange && onSelectionChange(nextIds);
  };

  const toggleRow = (appId) => {
    const nextIds = selectedIdSet.has(String(appId))
      ? selectedApplicationIds.filter((id) => String(id) !== String(appId))
      : [...selectedApplicationIds, appId];
    updateSelection(nextIds);
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      updateSelection(
        selectedApplicationIds.filter(
          (id) => !visibleIds.some((visibleId) => String(visibleId) === String(id)),
        ),
      );
      return;
    }

    const merged = new Set(selectedApplicationIds.map((id) => String(id)));
    visibleIds.forEach((id) => merged.add(String(id)));
    updateSelection(Array.from(merged));
  };

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

  if (loading) {
    return (
      <div className="card">
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--gray-500)" }}
        >
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="card">
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--gray-500)" }}
        >
          <p>No applications found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all applications"
                />
              </th>
              <th>Application ID</th>
              <th>Student Name</th>
              <th>Grade</th>
              <th>Parent Contact</th>
              <th>Submitted Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const appId = app.id || app.application_id;
              const studentName = app.student_name || app.name || "—";
              const status = app.status || "unknown";
              const statusInfo = statusMap[status] || {
                label: status,
                cls: "badge-gray",
              };

              return (
                <tr key={appId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIdSet.has(String(appId))}
                      onChange={() => toggleRow(appId)}
                      aria-label={`Select application ${appId}`}
                    />
                  </td>
                  <td className="td-bold">{appId}</td>
                  <td>{studentName}</td>
                  <td>{app.grade || "—"}</td>
                  <td>{app.parent_contact || app.contact || "—"}</td>
                  <td style={{ fontSize: 13 }}>
                    {formatDate(app.submitted_date || app.submitted)}
                  </td>
                  <td>
                    <span className={`badge ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => onView && onView(appId)}
                      title="View application"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedApplicationIds.length > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 16,
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(20,184,166,0.1), rgba(59,130,246,0.12))",
            border: "1px solid rgba(20,184,166,0.18)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {selectedApplicationIds.length} Lead{selectedApplicationIds.length === 1 ? "" : "s"} Selected
            </div>
            <div style={{ fontSize: 12, color: "var(--gray-600)" }}>
              Use the bulk action to send a personalized email to the selected applications.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onBulkEmail && onBulkEmail()}>
            <Mail size={15} style={{ marginRight: 8 }} />
            Send Bulk Email
          </button>
        </div>
      )}
    </div>
  );
}
