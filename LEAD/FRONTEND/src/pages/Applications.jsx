import React, { useState, useEffect } from "react";
import './Applications.css'
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;
const statusColors = { 'Under Review': { text: '#3b82f6', bg: '#eff6ff' }, Approved: { text: '#10b981', bg: '#d1fae5' }, Waitlisted: { text: '#f59e0b', bg: '#fef3c7' }, Draft: { text: '#94a3b8', bg: '#f1f5f9' }, Rejected: { text: '#ef4444', bg: '#fee2e2' } }
const feeColors = { 'Paid': { text: '#10b981', bg: '#d1fae5' }, 'Partially Paid': { text: '#f59e0b', bg: '#fef3c7' }, 'Not Paid': { text: '#ef4444', bg: '#fee2e2' } }
const docColors = { Verified: { text: '#10b981', bg: '#d1fae5' }, Uploaded: { text: '#3b82f6', bg: '#eff6ff' }, Draft: { text: '#94a3b8', bg: '#f1f5f9' } }

export default function Applications() {

  
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  useEffect(() => {
  fetchApplications();
}, []);

const fetchApplications = async () => {
  try {
    const token = localStorage.getItem("authToken");

    const [appsRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/applications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      fetch(`${API_URL}/applications/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    ]);

    const appsData = await appsRes.json();
    const statsData = await statsRes.json();

      console.log("APPLICATIONS:", appsData);
      console.log("STATS:", statsData);

      setApplications(appsData.data || []);
      setStats(statsData.data || {});

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    Total: stats.total || 0,
    Draft: stats.draft || 0,
    "Under Review": stats.underReview || 0,
    Approved: stats.approved || 0,
    Waitlisted: stats.waitlisted || 0,
    Rejected: stats.rejected || 0
  };
  const filtered = filter === 'All' ? applications : applications.filter(a => a.status === filter)

  const statCards = [
    { label: 'Total', value: counts.Total, color: '#0f172a', bg: 'white' },
    { label: 'Draft', value: counts.Draft, color: '#94a3b8', bg: 'white' },
    { label: 'Under Review', value: counts['Under Review'], color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Approved', value: counts.Approved, color: '#10b981', bg: 'white' },
    { label: 'Waitlisted', value: counts.Waitlisted, color: '#f59e0b', bg: '#fef9ee' },
    { label: 'Rejected', value: counts.Rejected, color: '#ef4444', bg: '#fff5f5' },
  ]

  return (
    <div className="apps-page">
      <div className="apps-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-sub">Manage admission applications and documentation</p>
        </div>
        <button className="btn-primary"><DownloadIcon /> Export All</button>
      </div>

      {/* Stat Cards */}
      <div className="apps-stats">
        {statCards.map((c, i) => (
          <div key={i} className="apps-stat-card" style={{ background: c.bg }}>
            <div className="asc-label">{c.label}</div>
            <div className="asc-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="apps-filter-row">
        {['All', 'Draft', 'Under Review', 'Approved', 'Waitlisted', 'Rejected'].map(f => (
          <button key={f} className={`task-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Application Cards */}
      <div className="app-list">
        {filtered.map(app => {

          const docs = app.docs || [];

          const verifiedDocs =
            docs.filter(
              d => d.status === "Verified"
            ).length;

          const feePercent =
            app.feeTotal > 0
              ? Math.round((app.feePaid / app.feeTotal) * 100)
              : 0;

          const sc = statusColors[app.status] || {};
          const fc = feeColors[app.feeStatus] || {};

          return (
            <div key={app.id} className="app-card">
              <div className="app-card-top">
                <div className="app-name-row">
                  <span className="app-student-name">{app.name}</span>
                  <span className="app-status-badge" style={{ color: sc.text, background: sc.bg }}>{app.status}</span>
                  <span className="app-fee-badge" style={{ color: fc.text, background: fc.bg }}>{app.feeStatus}</span>
                </div>
                <button
                    className="view-details-btn"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  ><EyeIcon /> View Details</button>
              </div>
              <div className="app-meta-row">
                <span><GradeIcon /> {app.grade}</span>
                <span><UserSmIcon /> Parent: {app.parent}</span>
                <span><CalIcon /> Submitted: {app.submitted}</span>
                {app.interview && <span className="interview-tag"><CalIcon /> Interview: {app.interview}</span>}
                <span className="app-id-tag">{app.appId}</span>
              </div>
              {/* Documents */}
              <div className="app-docs-section">
                <div className="app-docs-header">
                  <DocIcon /> Documents
                  <span className="docs-count">{verifiedDocs} of {docs.length} verified</span>
                </div>
                <div className="docs-progress-bar">
                  <div className="docs-progress-fill" style={{ width: docs.length ? `${(verifiedDocs / docs.length) * 100}%` : "0%" }} />
                </div>
                <div className="docs-list">
                  {docs.map((doc, i) => {
                    const dc = docColors[doc.status] || {}
                    return (
                      <div key={i} className="doc-item">
                        <span className="doc-name">{doc.name}</span>
                        <span className="doc-status" style={{ color: dc.text, background: dc.bg }}>{doc.status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Footer */}
              <div className="app-card-footer">
                <div className="app-fee-info">
                  <span className="fee-label">Fee Status</span>
                  <span className="fee-value">₹{app.feePaid.toLocaleString()} / ₹{app.feeTotal.toLocaleString()}</span>
                  <div className="fee-bar">
                    <div className="fee-bar-fill" style={{ width: `${feePercent}%` }} />
                  </div>
                </div>
                <div className="app-assigned">
                  <span className="fee-label">Assigned To</span>
                  <span className="assigned-name">{app.counselor}</span>
                </div>
                <div className="app-actions">
                  <button className="app-action-btn"><UploadIcon /></button>
                  <button className="app-action-btn"><DownloadIcon /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function EyeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function GradeIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> }
function UserSmIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function CalIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function DocIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function UploadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
