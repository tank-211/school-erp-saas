import React, { useState, useEffect, useMemo } from 'react';
import './Pipeline.css';
const API_URL = import.meta.env.VITE_API_URL;

// Columns, leads and conversion all come from GET /api/pipeline, which derives
// each lead's stage from its status and application (see pipelineService.js).

export default function Pipeline() {
  const [columns, setColumns] = useState([]);
  const [filter, setFilter] = useState('All Counselors');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/pipeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not load the pipeline');
      }
      setColumns(result.columns || []);
    } catch (err) {
      console.error("Pipeline Error:", err);
      setError(err.message || 'Could not load the pipeline');
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const counselors = useMemo(() => {
    const names = new Set();
    columns.forEach(c => c.leads.forEach(l => names.add(l.counselor)));
    return ['All Counselors', ...[...names].sort()];
  }, [columns]);

  const visibleColumns = useMemo(() => (
    filter === 'All Counselors'
      ? columns
      : columns.map(c => ({ ...c, leads: c.leads.filter(l => l.counselor === filter) }))
  ), [columns, filter]);

  const countIn = (id) => visibleColumns.find(c => c.id === id)?.leads.length || 0;
  const totalLeads = visibleColumns.reduce((s, c) => s + c.leads.length, 0);
  const lostLeads = countIn('lost');
  const activeLeads = totalLeads - lostLeads;
  const admitted = countIn('admitted');
  const inApplication = countIn('application');
  const conversionRate = activeLeads > 0 ? `${Math.round((admitted / activeLeads) * 100)}%` : '—';

  return (
    <div className="pipeline-page">
      {/* Page Header */}
      <div className="pipeline-header">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-sub">Track leads through admission stages</p>
        </div>
        <select className="counselor-filter" value={filter} onChange={e => setFilter(e.target.value)}>
          {counselors.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && <div className="pipeline-error" role="alert">{error}</div>}

      {/* Summary Cards */}
      <div className="pipeline-summary">
        {[
          { label: 'Total Leads', value: loading ? '…' : totalLeads, sub: `${activeLeads} active, ${lostLeads} lost` },
          { label: 'In Application', value: loading ? '…' : inApplication, sub: 'Application started' },
          { label: 'Admitted', value: loading ? '…' : admitted, sub: 'Admission completed or converted' },
          { label: 'Conversion Rate', value: loading ? '…' : conversionRate, sub: 'Admitted ÷ active leads' },
        ].map((s, i) => (
          <div key={i} className="pipeline-summary-card">
            <div className="ps-label">{s.label}</div>
            <div className="ps-value">{s.value}</div>
            <div className="ps-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {visibleColumns.map((col) => (
          <div key={col.id} className="kanban-column">
            {/* Column Header */}
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <span className="kanban-dot" style={{ background: col.color }} />
                <span>{col.label}</span>
              </div>
              <div className="kanban-col-meta">
                <span>{col.leads.length} leads</span>
              </div>
              {col.conversion !== null && col.conversion !== undefined && (
                <div className="kanban-conv-bar">
                  <div className="kanban-conv-track">
                    <div className="kanban-conv-fill" style={{ width: `${col.conversion}%`, background: col.color }} />
                  </div>
                  <span className="kanban-conv-label">Reached {col.conversion}%</span>
                </div>
              )}
            </div>

            {/* Lead Cards */}
            <div className="kanban-cards">
              {col.leads.map((lead) => (
                <div key={lead.id} className="lead-card">
                  <div className="lead-card-top">
                    <span className="lead-name">{lead.name}</span>
                  </div>
                  <div className="lead-grade">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    {lead.grade}
                  </div>
                  <div className="lead-contact">
                    {lead.phone && (
                      <div className="lead-contact-row">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.48 2 2 0 0 1 3.61 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.94a16 16 0 0 0 6.06 6.06l.94-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
                        {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="lead-contact-row">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        {lead.email}
                      </div>
                    )}
                    <div className="lead-contact-row">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {lead.counselor}
                    </div>
                  </div>
                  <div className="lead-card-footer">
                    <span className="lead-time">{lead.time}</span>
                  </div>
                </div>
              ))}
              {!loading && col.leads.length === 0 && (
                <div className="lead-time" style={{ padding: '8px 4px' }}>No leads</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
