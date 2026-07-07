import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dashboardAPI } from '../services/api';
import './Dashboard.css';
import { useSettings } from "../context/SettingsContext"

const getBadgeClass = (type = "") => {
  switch (type) {
    case "LEAD_CREATED":
      return "badge-green";

    case "LEAD_UPDATED":
      return "badge-blue";

    case "LEAD_ASSIGNED":
      return "badge-purple";

    default:
      return "badge-gray";
  }
};

const getIcon = (type = "") => {
  switch (type) {
    case "LEAD_CREATED":
      return "🆕";

    case "LEAD_UPDATED":
      return "✏️";

    case "LEAD_ASSIGNED":
      return "👤";

    default:
      return "📌";
  }
};

const getActivityLabel = (activity) => {
  const leadName = activity.lead
    ? `${activity.lead.studentFirstName} ${activity.lead.studentLastName}`
    : "Lead";

  switch (activity.activity_type) {
    case "LEAD_CREATED":
      return `${leadName} was created`;

    case "LEAD_UPDATED":
      return `${leadName} was updated`;

    case "LEAD_ASSIGNED":
      return `${leadName} was assigned`;

    default:
      return activity.activity_type?.replaceAll("_", " ");
  }
};

export default function Dashboard() {
  const COLORS = ['#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [activities, setActivities] = useState([]);
  const { settings } = useSettings() || {}
  useEffect(() => {
  const fetchAll = async () => {
    try {
      setLoading(true);

  const response = await dashboardAPI.getCompleteDashboard();

  console.log("FULL RESPONSE:", response);
  console.log(
    "STATUS DISTRIBUTION:",
    response.data.statusDistribution
  );

  const data = response.data;

  console.log("DATA:", data);

  setStats(data.stats || {});
  setPieData(data.statusDistribution || []);
  setTrendData(data.enrollmentTrend || []);
  setGradeData(data.gradeDistribution || []);
  setTodayData(data.todayOverview || {});
  setActivities(data.recentActivities || []);

  console.log("ACTIVITIES STATE INPUT:", data.recentActivities);
  
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  fetchAll();
}, []);

  const buildStatCards = () => {
    if (!stats) {
      return [
        { label: 'Total Inquiries', value: '—', sub: 'This month', delta: '—', color: '#3b82f6', bg: '#eff6ff', icon: <UsersIcon /> },
        { label: 'Conversion Rate', value: '—', sub: 'Last 30 days', delta: '—', color: '#10b981', bg: '#d1fae5', icon: <TargetIcon /> },
        { label: 'Active Leads', value: '—', sub: 'Pending action', delta: '—', color: '#8b5cf6', bg: '#ede9fe', icon: <ActivityIcon /> },
        { label: 'Enrolled Students', value: '—', sub: 'This academic year', delta: '—', color: '#10b981', bg: '#d1fae5', icon: <TrendIcon /> },
      ];
    }

    return [
      {
        label: 'Total Inquiries',
        value: stats.totalInquiries?.value || '0',
        sub: 'This month',
        delta: stats.totalInquiries?.delta || '—',
        color: '#3b82f6',
        bg: '#eff6ff',
        icon: <UsersIcon />,
      },
      {
        label: 'Conversion Rate',
        value: stats.conversionRate?.value || '0%',
        sub: 'Last 30 days',
        delta: stats.conversionRate?.delta || '—',
        color: '#10b981',
        bg: '#d1fae5',
        icon: <TargetIcon />,
      },
      {
        label: 'Active Leads',
        value: stats.activeLeads?.value || '0',
        sub: 'Pending action',
        delta: stats.activeLeads?.delta || '—',
        color: '#8b5cf6',
        bg: '#ede9fe',
        icon: <ActivityIcon />,
      },
      {
        label: 'Enrolled Students',
        value: stats.enrolledStudents?.value || '0',
        sub: 'This academic year',
        delta: stats.enrolledStudents?.delta || '—',
        color: '#10b981',
        bg: '#d1fae5',
        icon: <TrendIcon />,
      },
    ];
  };

  const statCards = React.useMemo(() => buildStatCards(), [stats]);
  const formatDate = (date) => {
    if (!date) return "No date";

    return new Date(date).toLocaleString("en-IN", {
      timeZone: settings?.timezone || "UTC"
    });
  };

  useEffect(() => {
    console.log("📈 trendData UPDATED:", trendData);
  }, [trendData]);

  useEffect(() => {
    console.log("🥧 pieData UPDATED:", pieData);
  }, [pieData]);

  useEffect(() => {
    console.log("📊 gradeData UPDATED:", gradeData);
  }, [gradeData]);


  return (
    <div className="dashboard">

      <div style={{ marginBottom: 20, fontSize: 16 }}>
      <strong>Current Time:</strong>{" "}
      {settings
        ? new Date().toLocaleString("en-IN", {
            timeZone: settings.timezone
          })
        : "Loading..."}
    </div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Welcome back, {localStorage.getItem("userName") || "User"}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <div style={{ color: '#dc2626', marginBottom: '8px' }}>⚠️ {error}</div>
          <button 
            onClick={() => {setError(null);window.location.reload();}}
            style={{
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid" style={{ opacity: loading ? 0.6 : 1 }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ pointerEvents: loading ? 'none' : 'auto' }}>
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-delta" style={{ color: card.color }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              {card.delta}
            </div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <div style={{ fontSize: '14px' }}>Loading dashboard statistics...</div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="charts-row">
        {/* Enrollment Trend */}
        <div className="chart-card chart-large">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Enrollment Trend</h3>
              <p className="chart-sub">Monthly inquiries vs enrollments</p>
            </div>
          </div>
                {!trendData || trendData.length === 0 ? (
                  <div className="empty-chart">No trend data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="enrollments" stroke="#10b981" />
                      <Line type="monotone" dataKey="inquiries" stroke="#8b5cf6" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
        </div>

        {/* Lead Status Distribution */}
        <div className="chart-card chart-small">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Lead Status Distribution</h3>
              <p className="chart-sub">Current pipeline breakdown</p>
            </div>
          </div>

          {!pieData || pieData.length === 0 ? (
            <div className="empty-chart">No status data</div>
          ) : (
            <div className="pie-wrapper">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie 
                      data={pieData.filter(item => item.value > 0)} 
                      dataKey="value"
                      nameKey="name" 
                      cx="50%" 
                      cy="50%"
                      outerRadius={80} 
                      label
                    >
                    {pieData.filter(item => item.value > 0)
                            .map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="pie-legend">
                {pieData.map((item, i) => (
                  <div key={i} className="pie-legend-item">
                    <span
                      className="pie-dot"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div> 
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        {/* Inquiries by Grade */}
        <div className="chart-card chart-large">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Inquiries by Grade</h3>
              <p className="chart-sub">Distribution across all grades</p>
            </div>
          </div>
              {!gradeData || gradeData.length === 0 ? (
                <div className="empty-chart">No grade data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gradeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grade" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="inquiries" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
        </div>

        {/* Today's Overview */}
        <div className="chart-card chart-small">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Today's Overview</h3>
              <p className="chart-sub">Current day stats</p>
            </div>
          </div>
          <div className="today-stats">
            <div className="today-stat-item today-blue">
              <div className="today-icon">
                <PhoneIcon />
              </div>
              <div>
                <div className="today-label">Calls Made</div>
                <div className="today-sublabel">Today</div>
              </div>
              <div className="today-value" style={{ color: '#3b82f6' }}>{todayData?.callsMade || 0}</div>
            </div>
            <div className="today-stat-item today-purple">
              <div className="today-icon purple">
                <MailIcon />
              </div>
              <div>
                <div className="today-label">Emails Sent</div>
                <div className="today-sublabel">Today</div>
              </div>
              <div className="today-value" style={{ color: '#8b5cf6' }}>{todayData?.emailsSent || 0}</div>
            </div>
            <div className="today-stat-item today-green">
              <div className="today-icon green">
                <CalendarIcon />
              </div>
              <div>
                <div className="today-label">Tours Scheduled</div>
                <div className="today-sublabel">This week</div>
              </div>
              <div className="today-value" style={{ color: '#10b981' }}>{todayData?.toursScheduled || 0}</div>
            </div>
          </div>
        </div>
    </div>        
      {/* Recent Activities */}
    <div className="charts-row">
      <div className="charts-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Recent Activities</h3>
            <p className="chart-sub">Latest interactions and updates</p>
          </div>
        </div>
        <div className="activity-list">
          {!activities || activities.length === 0 ? (
            <div>No recent activities</div>
          ) : (
           activities.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon">
                  {getIcon(a.activity_type)}
                </div>

                <div className="activity-body">
                <div className="activity-name">
                  {a.lead
                    ? `${a.lead.first_name} ${a.lead.last_name}`
                    : "Unknown Lead"}
                </div>

                <div className="activity-action">
                  {a.activity_type}
                </div>

                  <div className="activity-time">
                    {formatDate(a.created_at)}
                  </div>
                </div>

                <span className={`badge ${getBadgeClass(a.activity_type)}`}>{a.activity_type || 'unknown'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
  );
}

/* Icons */
function UsersIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function TargetIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function ActivityIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>;
}
function TrendIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function PhoneIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.48 2 2 0 0 1 3.61 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.94a16 16 0 0 0 6.06 6.06l.94-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>;
}
function MailIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function UserIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function CalendarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
