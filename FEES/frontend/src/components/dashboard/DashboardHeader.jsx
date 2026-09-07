import React from 'react'

const DashboardHeader = () => (
  <header className="dashboard-header">
    <div>
      <h1>College ERP Fees Dashboard</h1>
      <p className="muted">Key metrics for fee management and student payments</p>
    </div>
    <div className="header-meta">
      <div>
        <span>Academic Year</span>
        <strong>2025-2026</strong>
      </div>
      <div>
        <span>Last Updated</span>
        <strong>{new Date().toLocaleDateString()}</strong>
      </div>
    </div>
  </header>
)

export default DashboardHeader
