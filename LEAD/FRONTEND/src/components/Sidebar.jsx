import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './Sidebar.css'
import { useSettings } from "../context/SettingsContext";

export default function Sidebar({ collapsed, onToggle }) {
  const { settings } = useSettings();
  console.log("SIDEBAR SETTINGS:", settings);
  const location = useLocation()
  const reportsActive = location.pathname.startsWith('/reports')
  const [reportsExpanded, setReportsExpanded] = useState(reportsActive)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#10b981" />
            <path d="M14 6L14 22 M8 11C8 11 11 8 14 10C17 8 20 11 20 11"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        {!collapsed && (
          <div className="brand-text">
            <span className="brand-name">{settings?.schoolName||"School Name"}</span>
            <span className="brand-sub">CRM SYSTEM</span>
          </div>
        )}
        <button className="toggle-btn" onClick={onToggle} title="Toggle Sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      </div>

      {/* Campus Selector */}
      {!collapsed && (
        <div className="campus-selector">
          <select>
            <option>{settings?.campusName||"Main Campus"}</option>
          </select>
          <span className="campus-location">{settings?.timezone || 'Asia/Kolkata'}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Dashboard' : undefined}>
          <span className="nav-icon"><DashboardIcon /></span>
          {!collapsed && <span className="nav-label">Dashboard</span>}
        </NavLink>

        <NavLink to="/leads"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Leads' : undefined}>
          <span className="nav-icon"><LeadsIcon /></span>
          {!collapsed && <span className="nav-label">Leads</span>}
        </NavLink>

        <NavLink to="/pipeline"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Pipeline' : undefined}>
          <span className="nav-icon"><PipelineIcon /></span>
          {!collapsed && <span className="nav-label">Pipeline</span>}
        </NavLink>

        <NavLink to="/tasks"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Tasks' : undefined}>
          <span className="nav-icon"><TasksIcon /></span>
          {!collapsed && <span className="nav-label">Tasks</span>}
        </NavLink>

        <NavLink to="/communication"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Communication' : undefined}>
          <span className="nav-icon"><CommIcon /></span>
          {!collapsed && <span className="nav-label">Communication</span>}
        </NavLink>

        <NavLink to="/applications"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Applications' : undefined}>
          <span className="nav-icon"><AppIcon /></span>
          {!collapsed && <span className="nav-label">Applications</span>}
        </NavLink>

        {/* Reports & Analytics — collapsible group */}
        <div className="nav-group">
          <button
            className={`nav-item nav-item-btn ${reportsActive ? 'active' : ''}`}
            onClick={() => { if (!collapsed) setReportsExpanded(v => !v) }}
            title={collapsed ? 'Reports & Analytics' : undefined}
          >
            <span className="nav-icon"><ReportsIcon /></span>
            {!collapsed && (
              <>
                <span className="nav-label">Reports &amp; Analytics</span>
                <span className={`nav-chevron ${reportsExpanded ? 'open' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </>
            )}
          </button>
          {!collapsed && reportsExpanded && (
            <div className="sub-nav">
              <NavLink to="/reports/sales"
                className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                Sales Reports
              </NavLink>
              <NavLink to="/reports/performance"
                className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                Performance
              </NavLink>
              <NavLink to="/reports/custom"
                className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                Custom Reports
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={collapsed ? 'Settings' : undefined}>
          <span className="nav-icon"><SettingsIcon /></span>
          {!collapsed && <span className="nav-label">Settings</span>}
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-role">
          <div className="role-dot" />
          {!collapsed && (
            <div>
              <div className="role-label">Role:{localStorage.getItem("role")||"Admin"}</div>
              <div className="role-sub">Active User</div>
            </div>
          )}
        </div>
        {!collapsed && <button className="switch-role-btn">Switch Role</button>}
      </div>
    </aside>
  )
}

/* ── Icons ── */
function DashboardIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function LeadsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function PipelineIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function TasksIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}
function CommIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function AppIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
}
function ReportsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function SettingsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
