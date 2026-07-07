import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { superAdminService } from "../../services/superAdminService";

function SPDashboard() {
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    expiring_schools: [],
    school_user_counts: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const data = await superAdminService.getStats();
        if (!cancelled) {
          setDashboardData({
            stats: data.stats || {},
            expiring_schools: data.expiring_schools || [],
            school_user_counts: data.school_user_counts || [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    stats,
    expiring_schools: expiringSchools,
    school_user_counts: schoolUserCounts,
  } = dashboardData;

  return (
    <section>
      <h1 className="sp-title">Dashboard</h1>
      <p className="sp-subtitle">
        Real-time platform overview for school operations.
      </p>

      {error && <div className="sp-error">{error}</div>}

      <div className="sp-grid sp-grid-4" style={{ marginTop: "16px" }}>
        <article className="sp-card">
          <p className="sp-kpi-label">Total Schools</p>
          <p className="sp-kpi-value">{stats.total_schools || 0}</p>
        </article>
        <article className="sp-card">
          <p className="sp-kpi-label">Active Schools</p>
          <p className="sp-kpi-value">{stats.active_schools || 0}</p>
        </article>
        <article className="sp-card">
          <p className="sp-kpi-label">Suspended</p>
          <p className="sp-kpi-value">{stats.suspended_schools || 0}</p>
        </article>
        <article className="sp-card">
          <p className="sp-kpi-label">Active Students</p>
          <p className="sp-kpi-value">{stats.total_active_students || 0}</p>
        </article>
        <article className="sp-card">
          <p className="sp-kpi-label">Expiring Soon</p>
          <p className="sp-kpi-value">{stats.expiring_soon_schools || 0}</p>
        </article>
      </div>

      <div className="sp-grid" style={{ marginTop: "20px" }}>
        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Expiring Subscriptions</h2>
          <div className="sp-dashboard-list">
            {expiringSchools.map((school) => (
              <div key={school.id} className="sp-dashboard-list-item">
                <div>
                  <strong>{school.name}</strong>
                  <div className="sp-subtle-copy">
                    {school.plan_type || "trial"} · Expiry{" "}
                    {school.expiry_date
                      ? new Date(school.expiry_date).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
                <Link
                  className="sp-btn sp-btn-ghost"
                  to={`/sp-control-portal/schools/${school.id}/renewals`}
                >
                  Renew
                </Link>
              </div>
            ))}
            {!expiringSchools.length && (
              <p className="sp-empty">No schools are expiring soon.</p>
            )}
          </div>
        </article>

        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>User Counts by School</h2>
          <div className="sp-dashboard-list">
            {schoolUserCounts.slice(0, 6).map((item) => (
              <div key={item.school_id} className="sp-dashboard-list-item">
                <span>School #{item.school_id}</span>
                <strong>{item.total_users}</strong>
              </div>
            ))}
            {!schoolUserCounts.length && (
              <p className="sp-empty">No user counts available yet.</p>
            )}
          </div>
        </article>

        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Quick Actions</h2>
          <div className="sp-row-actions">
            <Link
              className="sp-btn sp-btn-primary"
              to="/sp-control-portal/schools"
            >
              Manage Schools
            </Link>
            <Link className="sp-btn sp-btn-ghost" to="/sp-control-portal/staff">
              Manage Staff
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

export default SPDashboard;
